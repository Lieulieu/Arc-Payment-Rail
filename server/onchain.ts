/**
 * onchain.ts — reads PaymentRegistry records from Arc Testnet or Arc Mainnet via viem.
 * Supports network param: "testnet" | "mainnet"
 */

import { createPublicClient, http, parseAbi, defineChain } from "viem";

// ── Chain definitions ─────────────────────────────────────────────────────────

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } }, // arc-studio-allow-onchain-literal
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" } }, // arc-studio-allow-onchain-literal
});

const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } }, // arc-studio-allow-onchain-literal
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } }, // arc-studio-allow-onchain-literal
});

// ── Registry addresses ────────────────────────────────────────────────────────

const REGISTRY_TESTNET = (process.env.VITE_REGISTRY_ADDRESS ?? "") as `0x${string}`;
const REGISTRY_MAINNET = (process.env.VITE_REGISTRY_ADDRESS_MAINNET ?? "") as `0x${string}`;

if (!REGISTRY_TESTNET) throw new Error("VITE_REGISTRY_ADDRESS env var is required");

// ── ABI ───────────────────────────────────────────────────────────────────────

const ABI = parseAbi([
  "function getCallCount() external view returns (uint256)",
  "function getCall(uint256 index) external view returns (address payer, uint40 timestamp, uint96 amount, bytes32 promptHash, bytes32 callId, address recorder)",
]);

// ── Clients ───────────────────────────────────────────────────────────────────

const pubTestnet = createPublicClient({ chain: arcTestnet, transport: http() });
const pubMainnet = createPublicClient({ chain: arcMainnet, transport: http() });

function getClient(network: "testnet" | "mainnet") {
  return network === "mainnet" ? pubMainnet : pubTestnet;
}

function getRegistry(network: "testnet" | "mainnet"): `0x${string}` {
  const addr = network === "mainnet" ? REGISTRY_MAINNET : REGISTRY_TESTNET;
  if (!addr) throw new Error(`No registry address configured for ${network}`);
  return addr;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OnchainRecord {
  payer: string;
  timestamp: number;
  amount: string;
  promptHash: string;
  callId: string;
  recorder: string;
  index: number;
}

export interface OnchainLeaderboardEntry {
  payer: string;
  totalAmount: number;
  callCount: number;
  lastSeen: number;
}

// ── Cache (15s TTL per network) ───────────────────────────────────────────────

const cache: Record<string, { records: OnchainRecord[]; time: number }> = {};
const CACHE_TTL_MS = 15_000;

export async function getOnchainRecords(
  network: "testnet" | "mainnet" = "testnet",
  forceRefresh = false,
): Promise<OnchainRecord[]> {
  const now = Date.now();
  const cached = cache[network];
  if (!forceRefresh && cached && cached.records.length > 0 && now - cached.time < CACHE_TTL_MS) {
    return cached.records;
  }

  const pub = getClient(network);
  const registry = getRegistry(network);

  const count = await pub.readContract({ address: registry, abi: ABI, functionName: "getCallCount" });
  const total = Number(count);
  if (total === 0) { cache[network] = { records: [], time: now }; return []; }

  const limit = Math.min(total, 100);
  const records: OnchainRecord[] = [];

  for (let i = total - 1; i >= total - limit; i--) {
    try {
      const r = await pub.readContract({
        address: registry,
        abi: ABI,
        functionName: "getCall",
        args: [BigInt(i)],
      }) as readonly [string, number, bigint, string, string, string];

      records.push({
        payer:      r[0],
        timestamp:  Number(r[1]) * 1000,
        amount:     r[2].toString(),
        promptHash: r[3],
        callId:     r[4],
        recorder:   r[5],
        index:      i,
      });
    } catch { /* skip */ }
  }

  cache[network] = { records, time: now };
  return records;
}

export async function getOnchainLeaderboard(
  limit = 10,
  network: "testnet" | "mainnet" = "testnet",
): Promise<OnchainLeaderboardEntry[]> {
  const records = await getOnchainRecords(network);
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

export async function getOnchainCallCount(network: "testnet" | "mainnet" = "testnet"): Promise<number> {
  const pub = getClient(network);
  const registry = getRegistry(network);
  const count = await pub.readContract({ address: registry, abi: ABI, functionName: "getCallCount" });
  return Number(count);
}
