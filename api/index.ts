/**
 * Vercel serverless entry point.
 *
 * Vercel routes all /api/* requests (and the server paths listed in vercel.json)
 * to this file. It imports the Express app and hands each request to it without
 * calling app.listen() — Vercel manages the HTTP server lifecycle.
 *
 * NOTE: In-memory state (event log, wallet list) resets between cold starts.
 * For production, replace the in-memory stores in server/events.ts and
 * server/wallets.ts with a persistent database (Postgres, Redis, etc.).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cors from "cors";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { runInference } from "../server/inference.js";
import {
  recordCall,
  getRecentEvents,
  addSseClient,
  getHistory,
  getLeaderboard,
  getSpendChart,
} from "../server/events.js";
import {
  getWallets,
  getNetworks,
  importWallets,
  parseCliTable,
} from "../server/wallets.js";

// ── Env ───────────────────────────────────────────────────────────────────────

const SELLER_ADDRESS = process.env.VITE_SELLER_ADDRESS ?? "";
const PRICE_PER_CALL = process.env.PRICE_PER_CALL ?? "0.001";
const FACILITATOR_URL =
  process.env.GATEWAY_FACILITATOR_URL ??
  "https://gateway-api-testnet.circle.com";

if (!SELLER_ADDRESS) {
  console.warn("[payment-rail] VITE_SELLER_ADDRESS is not set");
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

const gateway = createGatewayMiddleware({
  sellerAddress: SELLER_ADDRESS,
  facilitatorUrl: FACILITATOR_URL,
});

type PaidRequest = express.Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", seller: SELLER_ADDRESS, pricePerCall: PRICE_PER_CALL });
});

// Paid inference
app.post("/v1/inference", gateway.require(`$${PRICE_PER_CALL}`), (req: PaidRequest, res) => {
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
  res.json({ ...result, paid_by: payer, usdc_charged: `$${PRICE_PER_CALL}` });
});

// SSE stream
app.get("/v1/events", (req, res) => { addSseClient(res); });

// REST snapshot
app.get("/v1/recent", (_req, res) => { res.json({ events: getRecentEvents() }); });

// History
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

// Wallets
app.get("/v1/wallets", (req, res) => {
  const { blockchain, network } = req.query as Record<string, string>;
  let list = getWallets();
  if (blockchain) list = list.filter((w) => w.blockchain === blockchain.toUpperCase());
  if (network) list = list.filter((w) => w.network === network);
  res.json({ wallets: list, networks: getNetworks() });
});

app.post("/v1/wallets/import", (req, res) => {
  const body = req.body as { raw?: string; network?: string };
  if (!body?.raw || typeof body.raw !== "string") {
    res.status(400).json({ error: "Missing 'raw' field with CLI table text" });
    return;
  }
  const network = body.network === "mainnet" ? "mainnet" : "testnet";
  const parsed = parseCliTable(body.raw, network);
  if (parsed.length === 0) {
    res.status(400).json({ error: "No wallet rows found." });
    return;
  }
  const added = importWallets(parsed);
  res.json({ imported: parsed.length, added, wallets: parsed });
});

// Free demo
app.post("/v1/demo", (req, res) => {
  const body = req.body as { prompt?: string };
  const prompt = typeof body?.prompt === "string" ? body.prompt : "Hello";
  const result = runInference({ prompt });
  res.json({ ...result, paid: false, note: "Free demo — production endpoint requires $0.001 USDC" });
});

// Agent identity
app.get("/v1/agent-identity", (_req, res) => { res.json({ card: null }); });

// ── Vercel handler ────────────────────────────────────────────────────────────

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as unknown as express.Request, res as unknown as express.Response);
}
