/**
 * Wallet store — holds agent wallets imported via `circle wallet list`.
 * The server exposes POST /v1/wallets/import so the CLI output can be
 * pasted into the dashboard without restarting anything.
 *
 * Wallets are kept in memory; they survive server restarts only if the
 * optional WALLET_STORE_PATH env var points to a JSON file.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface AgentWallet {
  type: string;       // "agent"
  name: string;       // "-" or a custom name
  address: string;    // 0x…
  blockchain: string; // "ARC-TESTNET", "BASE", etc.
  createdAt: string;  // ISO timestamp
  network: "testnet" | "mainnet";
}

const STORE_PATH = process.env.WALLET_STORE_PATH
  ? resolve(process.env.WALLET_STORE_PATH)
  : null;

let wallets: AgentWallet[] = [];

// Load from disk on startup
if (STORE_PATH && existsSync(STORE_PATH)) {
  try {
    wallets = JSON.parse(readFileSync(STORE_PATH, "utf8")) as AgentWallet[];
  } catch { wallets = []; }
}

function persist(): void {
  if (!STORE_PATH) return;
  try { writeFileSync(STORE_PATH, JSON.stringify(wallets, null, 2)); } catch { /* non-fatal */ }
}

/** Upsert wallets from a CLI table row array. */
export function importWallets(incoming: AgentWallet[]): number {
  let added = 0;
  for (const w of incoming) {
    const exists = wallets.some(
      (x) => x.address.toLowerCase() === w.address.toLowerCase() && x.blockchain === w.blockchain
    );
    if (!exists) { wallets.push(w); added++; }
  }
  persist();
  return added;
}

export function getWallets(): AgentWallet[] {
  return [...wallets];
}

export function getNetworks(): string[] {
  return [...new Set(wallets.map((w) => w.blockchain))].sort();
}

/** Parse the table output of `circle wallet list` into wallet objects. */
export function parseCliTable(raw: string, network: "testnet" | "mainnet"): AgentWallet[] {
  const result: AgentWallet[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    // Match table rows: │ agent │ - │ 0x... │ ARC-TESTNET │ 2026-... │
    const m = line.match(/│\s*(agent)\s*│\s*([^│]*?)\s*│\s*(0x[a-fA-F0-9]{40})\s*│\s*([^│]+?)\s*│\s*([^│]+?)\s*│/);
    if (m) {
      result.push({
        type: m[1].trim(),
        name: m[2].trim() || "-",
        address: m[3].trim(),
        blockchain: m[4].trim(),
        createdAt: m[5].trim(),
        network,
      });
    }
  }
  return result;
}
