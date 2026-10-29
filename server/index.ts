/**
 * AI Agent Payment Rail — Express server.
 *
 * Routes:
 *   GET  /health          — free health check
 *   POST /v1/inference    — paid AI inference ($0.001 USDC per call via Circle Gateway Nanopayments)
 *   GET  /v1/events       — SSE stream of paid-call events for the dashboard
 *   GET  /v1/recent       — last N events as JSON (for initial dashboard load)
 */

import express from "express";
import cors from "cors";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { SELLER_ADDRESS, PRICE_PER_CALL, PORT, FACILITATOR_URL } from "./env.js";
import { runInference } from "./inference.js";
import { recordCall, getRecentEvents, addSseClient, getHistory, getLeaderboard, getSpendChart } from "./events.js";
import { getWallets, getNetworks, importWallets, parseCliTable } from "./wallets.js";

const app = express();
app.use(cors());
app.use(express.json());

// ── Payment middleware ────────────────────────────────────────────────────────

const gateway = createGatewayMiddleware({
  sellerAddress: SELLER_ADDRESS,
  facilitatorUrl: FACILITATOR_URL,
});

// Extended request type carrying payment info injected by the middleware
type PaidRequest = express.Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", seller: SELLER_ADDRESS, pricePerCall: PRICE_PER_CALL });
});

app.post(
  "/v1/inference",
  gateway.require(`$${PRICE_PER_CALL}`),
  (req: PaidRequest, res) => {
    const { prompt = "", max_tokens } = req.body as { prompt?: string; max_tokens?: number };
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const result = runInference({ prompt, max_tokens });

    const payer = req.payment?.payer ?? "unknown";
    const amount = req.payment?.amount ?? "0";
    const network = req.payment?.network ?? "unknown";

    recordCall({
      timestamp: Date.now(),
      payer,
      amount,
      network,
      promptPreview: prompt.slice(0, 80),
      tokens: result.tokens,
      latency_ms: result.latency_ms,
    });

    res.json({
      ...result,
      paid_by: payer,
      usdc_charged: `$${PRICE_PER_CALL}`,
    });
  }
);

// SSE stream — dashboard subscribes here
app.get("/v1/events", (req, res) => {
  addSseClient(res);
});

// REST snapshot — initial dashboard load
app.get("/v1/recent", (_req, res) => {
  res.json({ events: getRecentEvents() });
});

// Paginated + filtered history
app.get("/v1/history", (req, res) => {
  const { payer, from, to, minAmount, maxAmount, page, pageSize } = req.query as Record<string, string>;
  res.json(getHistory({
    payer: payer || undefined,
    from: from ? Number(from) : undefined,
    to: to ? Number(to) : undefined,
    minAmount: minAmount ? Number(minAmount) : undefined,
    maxAmount: maxAmount ? Number(maxAmount) : undefined,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  }));
});

// Leaderboard
app.get("/v1/leaderboard", (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  res.json({ entries: getLeaderboard(limit) });
});

// Spend chart
app.get("/v1/chart", (req, res) => {
  const mode = req.query.mode === "daily" ? "daily" : "hourly";
  const buckets = req.query.buckets ? Number(req.query.buckets) : 24;
  res.json({ buckets: getSpendChart(mode, buckets) });
});

// ── Wallet endpoints ──────────────────────────────────────────────────────────

// List all imported wallets, optionally filtered by blockchain
app.get("/v1/wallets", (req, res) => {
  const { blockchain, network } = req.query as Record<string, string>;
  let list = getWallets();
  if (blockchain) list = list.filter((w) => w.blockchain === blockchain.toUpperCase());
  if (network) list = list.filter((w) => w.network === network);
  res.json({ wallets: list, networks: getNetworks() });
});

// Import wallet rows from `circle wallet list` CLI table output
app.post("/v1/wallets/import", (req, res) => {
  const body = req.body as { raw?: string; network?: string };
  if (!body?.raw || typeof body.raw !== "string") {
    res.status(400).json({ error: "Missing 'raw' field with CLI table text" });
    return;
  }
  const network = body.network === "mainnet" ? "mainnet" : "testnet";
  const parsed = parseCliTable(body.raw, network);
  if (parsed.length === 0) {
    res.status(400).json({ error: "No wallet rows found in the pasted text. Make sure you copied the full table output from `circle wallet list`." });
    return;
  }
  const added = importWallets(parsed);
  res.json({ imported: parsed.length, added, wallets: parsed });
});

// Free demo endpoint — no payment required, for browser preview
app.post("/v1/demo", (req, res) => {
  const body = req.body as { prompt?: string };
  const prompt = typeof body?.prompt === "string" ? body.prompt : "Hello";
  const result = runInference({ prompt });
  res.json({ ...result, paid: false, note: "Free demo — production endpoint requires $0.001 USDC" });
});

// Agent identity — stub that returns nothing (real resolution needs on-chain call)
// A full ERC-8004 resolution would call the Arc identity registry; here we return
// an empty card so the frontend degrades gracefully without a Node viem dependency.
app.get("/v1/agent-identity", (_req, res) => {
  res.json({ card: null });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[payment-rail] Server listening on port ${PORT}`);
  console.log(`[payment-rail] Seller: ${SELLER_ADDRESS}`);
  console.log(`[payment-rail] Price:  $${PRICE_PER_CALL} USDC per call`);
  console.log(`[payment-rail] Facilitator: ${FACILITATOR_URL}`);
});
