/**
 * onchain.ts — reads PaymentRegistry records from Arc Testnet via viem.
 * RPC: uses RPC_PROXY_BASE_URL / RPC_PROXY_TOKEN if set, else falls back to
 *      the public Arc Testnet RPC from the onchain-facts registry.
 * Contract address: VITE_REGISTRY_ADDRESS env var (set in .env).
 */

import { createPublicClient, http, parseAbi, defineChain } from "viem";

// ── RPC URL ───────────────────────────────────────────────────────────────────
// Arc Testnet chain ID is 5042002. The proxy covers it when configured.
const ARC_TESTNET_CHAIN_ID = 5042002;
const PROXY_BASE  = process.env.RPC_PROXY_BASE_URL;
const PROXY_TOKEN = process.env.RPC_PROXY_TOKEN;
const PROXY_CHAINS = (process.env.RPC_PROXY_CHAINS ?? "").split(",").map((s) => s.trim());

const rpcUrl =
  PROXY_BASE && PROXY_TOKEN && PROXY_CHAINS.includes(String(ARC_TESTNET_CHAIN_ID))
    ? `${PROXY_BASE}/api/rpc/${ARC_TESTNET_CHAIN_ID}?_rpc_token=${PROXY_TOKEN}`
    : "https://rpc.testnet.arc.io"; // arc-studio-allow-onchain-literal

// ── Contract address ──────────────────────────────────────────────────────────
const REGISTRY = (process.env.VITE_REGISTRY_ADDRESS ?? "") as `0x${string}`;
if (!REGISTRY) throw new Error("VITE_REGISTRY_ADDRESS env var is required");

// ── Chain definition ──────────────────────────────────────────────────────────
const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" } }, // arc-studio-allow-onchain-literal
});

const ABI = parseAbi([
  "function getCallCount() external view returns (uint256)",
  "function getCall(uint256 index) external view returns (address payer, uint40 timestamp, uint96 amount, bytes32 promptHash, bytes32 callId, address recorder)",
]);

const pub = createPublicClient({ chain: arcTestnet, transport: http() });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OnchainRecord {
  payer: string;
  timestamp: number;   // unix ms
  amount: string;      // raw USDC units (uint96)
  promptHash: string;
  callId: string;
  recorder: string;
  index: number;
}

export interface OnchainLeaderboardEntry {
  payer: string;
  totalAmount: number; // raw USDC units
  callCount: number;
  lastSeen: number;    // unix ms
}

// ── Cache (15 s TTL) ──────────────────────────────────────────────────────────
let cachedRecords: OnchainRecord[] = [];
let cacheTime = 0;
const CACHE_TTL_MS = 15_000;

export async function getOnchainRecords(forceRefresh = false): Promise<OnchainRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedRecords.length > 0 && now - cacheTime < CACHE_TTL_MS) {
    return cachedRecords;
  }

  const count = await pub.readContract({ address: REGISTRY, abi: ABI, functionName: "getCallCount" });
  const total = Number(count);
  if (total === 0) return [];

  // Fetch the most recent 100 records (descending by index)
  const limit = Math.min(total, 100);
  const records: OnchainRecord[] = [];

  for (let i = total - 1; i >= total - limit; i--) {
    try {
      const r = await pub.readContract({
        address: REGISTRY,
        abi: ABI,
        functionName: "getCall",
        args: [BigInt(i)],
      }) as readonly [string, number, bigint, string, string, string];

      records.push({
        payer:      r[0],
        timestamp:  Number(r[1]) * 1000, // contract stores unix seconds → ms
        amount:     r[2].toString(),
        promptHash: r[3],
        callId:     r[4],
        recorder:   r[5],
        index:      i,
      });
    } catch {
      // skip any individual failed read
    }
  }

  cachedRecords = records;
  cacheTime = now;
  return records;
}

export async function getOnchainLeaderboard(limit = 10): Promise<OnchainLeaderboardEntry[]> {
  const records = await getOnchainRecords();
  const map = new Map<string, OnchainLeaderboardEntry>();

  for (const r of records) {
    const key = r.payer.toLowerCase();
    const amt = parseInt(r.amount, 10);
    const existing = map.get(key);
    if (existing) {
      existing.totalAmount += amt;
      existing.callCount   += 1;
      if (r.timestamp > existing.lastSeen) existing.lastSeen = r.timestamp;
    } else {
      map.set(key, { payer: r.payer, totalAmount: amt, callCount: 1, lastSeen: r.timestamp });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount || b.callCount - a.callCount)
    .slice(0, limit);
}

export async function getOnchainCallCount(): Promise<number> {
  const count = await pub.readContract({ address: REGISTRY, abi: ABI, functionName: "getCallCount" });
  return Number(count);
}
