/**
 * seed-registry.ts
 *
 * Records 10 calls in PaymentRegistry on Arc Testnet via `circle wallet execute`,
 * then seeds the local dashboard server's in-memory store.
 *
 * Usage:  bun run seed:registry
 * Requires: circle wallet login <email> --testnet  (already done)
 */

import { execSync } from "child_process";
import { createHash } from "crypto";

const REGISTRY   = "0x4c6f049a11393e7b0b4b9ba5fdbd173dad5698fe";
const WALLET     = "0x59a836ae26c0dec4bb506fa4fd7a81b491dc0e3e";
const CHAIN      = "ARC-TESTNET";
const SERVER_URL = "http://localhost:3001";

// Five agent addresses for leaderboard variety
const AGENTS = [
  "0x59a836ae26c0dec4bb506fa4fd7a81b491dc0e3e",
  "0xc01414b93c27ab00cc3a6819923d7d94a2e54947",
  "0x8830a9594c26993ef2ece3c755c5b113dbb30dd7",
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
] as const;

const SEED_CALLS = [
  { payer: AGENTS[0], amount: 1000, prompt: "What is Circle Gateway Nanopayments?" },
  { payer: AGENTS[1], amount: 1000, prompt: "How do I deploy a smart contract on Arc?" },
  { payer: AGENTS[0], amount: 1000, prompt: "Explain the x402 payment protocol." },
  { payer: AGENTS[2], amount: 1000, prompt: "What is USDC and how does it work?" },
  { payer: AGENTS[3], amount: 1000, prompt: "How does Arc achieve sub-second finality?" },
  { payer: AGENTS[1], amount: 1000, prompt: "What are the benefits of USDC as gas?" },
  { payer: AGENTS[4], amount: 1000, prompt: "How do AI agents pay for API calls?" },
  { payer: AGENTS[0], amount: 1000, prompt: "What is the PaymentRegistry contract?" },
  { payer: AGENTS[3], amount: 1000, prompt: "How do I bridge USDC to Arc Testnet?" },
  { payer: AGENTS[2], amount: 1000, prompt: "What is the Circle developer platform?" },
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
    `--contract ${REGISTRY}`,
    `--address ${WALLET}`,
    `--chain ${CHAIN}`,
    `--output json`,
  ].join(" ");

  const out = execSync(cmd, { encoding: "utf8", env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } });
  // CLI may emit a status line before the JSON object — find first `{`
  const jsonStart = out.indexOf("{");
  if (jsonStart < 0) throw new Error(`No JSON in output: ${out.slice(0, 120)}`);
  const raw = JSON.parse(out.slice(jsonStart)) as { txHash?: string; state?: string; data?: { txHash?: string; state?: string } };
  const json = raw.data ?? raw;
  if (json.state !== "COMPLETE") throw new Error(`Unexpected state: ${json.state}`);
  return json.txHash ?? "";
}

async function seedDashboard(payer: string, amount: number, prompt: string) {
  try {
    await fetch(`${SERVER_URL}/v1/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payer,
        amount: amount.toString(),
        network: "Arc Testnet",
        promptPreview: prompt.slice(0, 80),
        tokens: Math.floor(Math.random() * 200) + 50,
        latency_ms: Math.floor(Math.random() * 400) + 100,
      }),
    });
  } catch {
    // server not running — onchain records are the source of truth
  }
}

async function getCallCount(): Promise<number> {
  try {
    const r = await fetch(`${SERVER_URL}/health`);
    // fall back to cast call if server not running
    void r;
  } catch { /* ignore */ }

  try {
    const out = execSync(
      `cast call ${REGISTRY} "getCallCount()(uint256)" --rpc-url https://rpc.testnet.arc.io`,
      { encoding: "utf8", env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } }
    );
    return parseInt(out.trim(), 10);
  } catch {
    return -1;
  }
}

async function main() {
  console.log(`PaymentRegistry at ${REGISTRY}`);
  const before = await getCallCount();
  console.log(`Call count before seed: ${before}\n`);

  let success = 0;

  for (let i = 0; i < SEED_CALLS.length; i++) {
    const call = SEED_CALLS[i];
    const promptHash = sha256hex(call.prompt);
    const callId     = sha256hex(`seed-${Date.now()}-${i}-${Math.random()}`);

    console.log(`[${i + 1}/10] payer=${call.payer.slice(0, 10)}… prompt="${call.prompt.slice(0, 50)}…"`);

    try {
      const txHash = circleExecute(call.payer, call.amount, promptHash, callId);
      console.log(`  Tx: ${txHash}`);
      console.log(`  Confirmed.`);
      success++;
    } catch (e) {
      console.error(`  Error: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    }

    await seedDashboard(call.payer, call.amount, call.prompt);
    console.log(`  Dashboard seeded.`);
    await new Promise((r) => setTimeout(r, 800));
  }

  const after = await getCallCount();
  console.log(`\nCall count after seed: ${after}`);
  console.log(`New records written: ${success}`);
  console.log(`Explorer: https://explorer.testnet.arc.io/address/${REGISTRY}`);
  console.log(`\nRefresh the dashboard Leaderboard tab to see the updated rankings.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
