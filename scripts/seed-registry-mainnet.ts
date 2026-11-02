/**
 * seed-registry-mainnet.ts
 *
 * Records 10 calls in PaymentRegistry on Arc Mainnet via `circle wallet execute`,
 * then seeds the local dashboard server's in-memory store.
 *
 * Usage:  bun run seed:registry:mainnet
 * Requires: circle wallet login <email>  (mainnet session, no --testnet flag)
 */

import { execSync } from "child_process";
import { createHash } from "crypto";

const REGISTRY   = "0x5e09794C98E89fc9fC8FDaA9bE51CE024f5BA697";
const WALLET     = "0xc01414b93c27ab00cc3a6819923d7d94a2e54947";
const CHAIN      = "ARC";
const SERVER_URL = "http://localhost:3001";

// Five agent addresses for leaderboard variety
const AGENTS = [
  "0xc01414b93c27ab00cc3a6819923d7d94a2e54947",
  "0xE56C933BEbD453e9623528Dd31357aA16dC55717",
  "0x8830a9594c26993ef2ece3c755c5b113dbb30dd7",
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
] as const;

const SEED_CALLS = [
  { payer: AGENTS[0], amount: 1000, prompt: "What is Circle Gateway Nanopayments on mainnet?" },
  { payer: AGENTS[1], amount: 1000, prompt: "How do I deploy a smart contract on Arc mainnet?" },
  { payer: AGENTS[0], amount: 1000, prompt: "Explain the x402 payment protocol on Arc." },
  { payer: AGENTS[2], amount: 1000, prompt: "What is USDC as gas on Arc mainnet?" },
  { payer: AGENTS[3], amount: 1000, prompt: "How does Arc achieve sub-second finality?" },
  { payer: AGENTS[1], amount: 1000, prompt: "What are the benefits of USDC as native gas?" },
  { payer: AGENTS[4], amount: 1000, prompt: "How do AI agents pay for API calls with x402?" },
  { payer: AGENTS[0], amount: 1000, prompt: "What is the PaymentRegistry contract on Arc?" },
  { payer: AGENTS[3], amount: 1000, prompt: "How do I bridge USDC to Arc mainnet?" },
  { payer: AGENTS[2], amount: 1000, prompt: "What is the Circle developer platform in 2026?" },
];

function sha256hex(s: string): string {
  return "0x" + createHash("sha256").update(s).digest("hex");
}

function circleExecute(payer: string, amount: number, promptHash: string, callId: string): string {
  const cmd = [
    "circle wallet execute",
    `"recordCall(address,uint96,bytes32,bytes32)"`,
    payer,
    amount.toString(),
    promptHash,
    callId,
    `--address ${WALLET}`,
    `--chain ${CHAIN}`,
    `--contract ${REGISTRY}`,
    "--output json",
  ].join(" ");

  const raw = execSync(cmd, { encoding: "utf8", timeout: 60_000 });
  // Find the first { in the output (CLI may print status lines before JSON)
  const start = raw.indexOf("{");
  if (start === -1) throw new Error(`No JSON in output: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(raw.slice(start)) as { data?: { state?: string; txHash?: string } };
  const state = parsed?.data?.state;
  if (!state) throw new Error(`Unexpected state: ${state}`);
  return parsed?.data?.txHash ?? state;
}

async function seedDashboard(call: typeof SEED_CALLS[number], txHash: string) {
  try {
    await fetch(`${SERVER_URL}/v1/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payer:     call.payer,
        amount:    call.amount,
        prompt:    call.prompt,
        txHash,
        network:   "mainnet",
      }),
    });
    console.log("  Dashboard seeded.");
  } catch { /* server may not be running */ }
}

async function main() {
  console.log(`PaymentRegistry (mainnet) at ${REGISTRY}`);

  // Check call count before
  let before = 0;
  try {
    const r = await fetch(`${SERVER_URL}/v1/registry/count?network=mainnet`);
    const d = (await r.json()) as { count?: number };
    before = d.count ?? 0;
  } catch { /* server not running */ }
  console.log(`Call count before seed: ${before}\n`);

  let written = 0;

  for (let i = 0; i < SEED_CALLS.length; i++) {
    const call = SEED_CALLS[i];
    const promptHash = sha256hex(call.prompt);
    const callId     = sha256hex(`mainnet-${i}-${Date.now()}-${call.payer}`);

    console.log(`[${i + 1}/${SEED_CALLS.length}] payer=${call.payer.slice(0, 10)}… prompt="${call.prompt.slice(0, 45)}…"`);

    try {
      const txHash = circleExecute(call.payer, call.amount, promptHash, callId);
      console.log(`  Confirmed: ${txHash}`);
      await seedDashboard(call, txHash);
      written++;
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.error(`  Error: ${msg}`);
      console.log("  Skipping this call and continuing...");
      await seedDashboard(call, "0x" + "0".repeat(64));
    }

    // Small delay between calls
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Check call count after
  let after = 0;
  try {
    const r = await fetch(`${SERVER_URL}/v1/registry/count?network=mainnet`);
    const d = (await r.json()) as { count?: number };
    after = d.count ?? 0;
  } catch { /* ignore */ }

  console.log(`\nCall count after seed: ${after}`);
  console.log(`New records written:  ${written}`);
  console.log(`Explorer: https://explorer.arc.io/address/${REGISTRY}`);
  console.log("\nRefresh the dashboard Leaderboard tab (Arc Mainnet) to see the updated rankings.");
}

void main();
