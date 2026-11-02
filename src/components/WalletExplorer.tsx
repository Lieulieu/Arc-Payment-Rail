/**
 * WalletExplorer — displays agent wallets imported from `circle wallet list`.
 * Users paste CLI output to import wallets; a network dropdown filters by chain.
 */

import { useEffect, useRef, useState } from "react";
import { Wallet, ChevronDown, Copy, Check, ExternalLink, Plus, X, Key } from "lucide-react";
import { buildAddressExplorerUrl, ONCHAIN_CHAINS } from "@/onchain-facts";

interface AgentWallet {
  type: string;
  name: string;
  address: string;
  blockchain: string;
  createdAt: string;
  network: "testnet" | "mainnet";
}

interface WalletData {
  wallets: AgentWallet[];
  networks: string[];
}

// Map Circle CLI blockchain names to onchain-facts chain IDs for explorer links
const CLI_CHAIN_TO_ID: Record<string, number> = Object.fromEntries(
  ONCHAIN_CHAINS
    .filter((c) => c.scpBlockchain)
    .map((c) => [c.scpBlockchain!, c.chainId])
);

function explorerUrl(wallet: AgentWallet): string | null {
  const chainId = CLI_CHAIN_TO_ID[wallet.blockchain];
  if (!chainId) return null;
  return buildAddressExplorerUrl(chainId, wallet.address);
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
      title="Copy address"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

interface EoaEntry {
  address: string;
  label: string;
  network: "testnet" | "mainnet";
}

const EOA_STORAGE_KEY = "arc-payment-rail-eoa-wallets";

function loadEoas(): EoaEntry[] {
  try { return JSON.parse(localStorage.getItem(EOA_STORAGE_KEY) ?? "[]") as EoaEntry[]; }
  catch { return []; }
}

function saveEoas(eoas: EoaEntry[]) {
  localStorage.setItem(EOA_STORAGE_KEY, JSON.stringify(eoas));
}

export function WalletExplorer() {
  const [data, setData] = useState<WalletData>({ wallets: [], networks: [] });
  const [network, setNetwork] = useState<"all" | "testnet" | "mainnet">("all");
  const [blockchain, setBlockchain] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importNet, setImportNet] = useState<"testnet" | "mainnet">("testnet");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // EOA wallet state
  const [eoas, setEoas] = useState<EoaEntry[]>(() => loadEoas());
  const [showAddEoa, setShowAddEoa] = useState(false);
  const [newEoaAddr, setNewEoaAddr] = useState("");
  const [newEoaLabel, setNewEoaLabel] = useState("");
  const [newEoaNet, setNewEoaNet] = useState<"testnet" | "mainnet">("testnet");

  function addEoa() {
    if (!newEoaAddr.trim() || !/^0x[a-fA-F0-9]{40}$/.test(newEoaAddr.trim())) return;
    const updated = [...eoas, { address: newEoaAddr.trim(), label: newEoaLabel.trim() || "EOA", network: newEoaNet }];
    setEoas(updated);
    saveEoas(updated);
    setNewEoaAddr(""); setNewEoaLabel(""); setShowAddEoa(false);
  }

  function removeEoa(idx: number) {
    const updated = eoas.filter((_, i) => i !== idx);
    setEoas(updated);
    saveEoas(updated);
  }

  function buildQuery() {
    const p = new URLSearchParams();
    if (network !== "all") p.set("network", network);
    if (blockchain !== "all") p.set("blockchain", blockchain);
    return p.toString() ? `?${p.toString()}` : "";
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/wallets${buildQuery()}`);
        if (!r.ok) return;
        const d = (await r.json()) as WalletData;
        if (!cancelled) setData(d);
      } catch { /* server not ready */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, blockchain]);

  // Poll every 5s to pick up new imports
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetch(`/api/v1/wallets${buildQuery()}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d: WalletData | null) => { if (d) setData(d); })
        .catch(() => { /* ignore */ });
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, blockchain]);

  async function doImport() {
    if (!importText.trim()) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const r = await fetch("/api/v1/wallets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: importText, network: importNet }),
      });
      const d = (await r.json()) as { imported?: number; added?: number; error?: string };
      if (!r.ok || d.error) {
        setImportStatus(`Error: ${d.error ?? "Unknown error"}`);
      } else {
        setImportStatus(`Imported ${d.imported} wallets (${d.added} new)`);
        setImportText("");
        // Reload wallet list
        const fresh = await fetch(`/api/v1/wallets${buildQuery()}`);
        if (fresh.ok) setData((await fresh.json()) as WalletData);
      }
    } catch {
      setImportStatus("Error: Could not reach the server.");
    } finally {
      setImporting(false);
    }
  }

  const filtered = data.wallets;
  const uniqueNets = ["all", ...new Set(data.wallets.map((w) => w.network))];
  const chainOptions = ["all", ...data.networks];

  return (
    <div className="space-y-4">

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Network filter */}
        <div className="relative">
          <select
            value={network}
            onChange={(e) => { setNetwork(e.target.value as typeof network); setBlockchain("all"); }}
            className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40 cursor-pointer min-h-[36px]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {uniqueNets.map((n) => (
              <option key={n} value={n} className="bg-[#0d1424]">
                {n === "all" ? "All networks" : n === "testnet" ? "Testnet" : "Mainnet"}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>

        {/* Blockchain filter */}
        <div className="relative">
          <select
            value={blockchain}
            onChange={(e) => setBlockchain(e.target.value)}
            className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40 cursor-pointer min-h-[36px]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {chainOptions.map((c) => (
              <option key={c} value={c} className="bg-[#0d1424]">
                {c === "all" ? "All blockchains" : c}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>

        <div className="ml-auto">
          <button
            onClick={() => setShowImport((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/30 transition-colors min-h-[36px]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {showImport ? <X size={12} /> : <Plus size={12} />}
            {showImport ? "Cancel" : "Import wallets"}
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="rounded-xl bg-white/5 border border-blue-500/20 p-5 space-y-3">
          <p className="text-xs font-semibold text-white/60" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Paste CLI output
          </p>
          <p className="text-[11px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Run <code className="text-blue-300 font-mono">circle wallet list</code> or{" "}
            <code className="text-blue-300 font-mono">circle wallet list --testnet</code> in your
            terminal, then paste the full table output below.
          </p>

          {/* Network selector for import */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>Network:</span>
            {(["testnet", "mainnet"] as const).map((n) => (
              <button
                key={n}
                onClick={() => setImportNet(n)}
                className={[
                  "px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors min-h-[28px]",
                  importNet === n
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                    : "text-white/30 hover:text-white/50 hover:bg-white/5",
                ].join(" ")}
              >
                {n === "testnet" ? "Testnet" : "Mainnet"}
              </button>
            ))}
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"┌───────┬──────┬──────────────────────┬──────────────┐\n│ Type  │ Name │ Address              │ Blockchain   │\n│ agent │ -    │ 0x…                  │ ARC-TESTNET  │\n└───────┴──────┴──────────────────────┴──────────────┘"}
            rows={8}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-4 py-3 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 resize-y"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => { void doImport(); }}
              disabled={importing || !importText.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors min-h-[36px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {importing ? "Importing…" : "Import"}
            </button>
            {importStatus && (
              <span className={[
                "text-[11px]",
                importStatus.startsWith("Error") ? "text-red-400" : "text-emerald-400",
              ].join(" ")} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {importStatus}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Wallet table */}
      {loading && filtered.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/10 flex items-center justify-center py-12">
          <p className="text-white/30 text-sm animate-pulse" style={{ fontFamily: "'DM Sans', sans-serif" }}>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center py-16 gap-4">
          <Wallet size={28} className="text-white/10" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white/30" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No wallets imported yet</p>
            <p className="text-xs text-white/20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Run <code className="text-blue-300/60 font-mono">circle wallet create</code> then click "Import wallets" above
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_160px_120px_110px] gap-3 px-5 py-3 border-b border-white/10">
            {["Address", "Blockchain", "Network", "Created"].map((h) => (
              <span key={h} className="text-[10px] font-semibold tracking-widest uppercase text-white/30">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
            {filtered.map((w, i) => {
              const url = explorerUrl(w);
              return (
                <div
                  key={`${w.address}-${w.blockchain}-${i}`}
                  className="grid grid-cols-[1fr_160px_120px_110px] gap-3 px-5 py-3 items-center hover:bg-white/5 transition-colors"
                >
                  {/* Address */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/20 shrink-0 flex items-center justify-center">
                      <Wallet size={10} className="text-blue-400" />
                    </div>
                    <span
                      className="text-xs tabular-nums text-blue-300 truncate"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      title={w.address}
                    >
                      {shortenAddress(w.address)}
                    </span>
                    <CopyButton text={w.address} />
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
                        title="View on explorer"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {/* Blockchain */}
                  <span
                    className="text-xs text-white/60 font-medium"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {w.blockchain}
                  </span>

                  {/* Network badge */}
                  <span className={[
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit",
                    w.network === "testnet"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-300 border border-blue-500/20",
                  ].join(" ")}>
                    {w.network === "testnet" ? "Testnet" : "Mainnet"}
                  </span>

                  {/* Created date */}
                  <span
                    className="text-[11px] text-white/30 tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    title={w.createdAt}
                  >
                    {new Date(w.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {filtered.length} wallet{filtered.length !== 1 ? "s" : ""}
              {blockchain !== "all" ? ` on ${blockchain}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* EOA Wallets section */}
      <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <Key size={13} className="text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            EOA Wallets
          </span>
          <span className="text-[10px] text-white/30 ml-1">backing keys for Gateway deposits</span>
          <button
            onClick={() => setShowAddEoa((s) => !s)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-600/20 transition-colors"
          >
            {showAddEoa ? <X size={11} /> : <Plus size={11} />}
            {showAddEoa ? "Cancel" : "Add EOA"}
          </button>
        </div>

        {/* Add EOA form */}
        {showAddEoa && (
          <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] space-y-3">
            <div className="flex flex-wrap gap-3">
              <input
                value={newEoaAddr}
                onChange={(e) => setNewEoaAddr(e.target.value)}
                placeholder="0x… (40-char hex address)"
                className="flex-1 min-w-[200px] rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <input
                value={newEoaLabel}
                onChange={(e) => setNewEoaLabel(e.target.value)}
                placeholder="Label (e.g. Gateway backing EOA)"
                className="flex-1 min-w-[180px] rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <select
                value={newEoaNet}
                onChange={(e) => setNewEoaNet(e.target.value as "testnet" | "mainnet")}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/60 focus:outline-none cursor-pointer"
              >
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet</option>
              </select>
              <button
                onClick={addEoa}
                disabled={!/^0x[a-fA-F0-9]{40}$/.test(newEoaAddr.trim())}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Found when running <code className="text-amber-300/70">circle gateway deposit … --method direct</code> — shown as "Resolving backing EOA…"
            </p>
          </div>
        )}

        {/* EOA list */}
        {eoas.length === 0 ? (
          <div className="py-8 text-center text-white/25 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            No EOA wallets added yet — click "Add EOA" and paste the address shown by <code className="text-amber-300/50">circle gateway deposit</code>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {eoas.map((e, idx) => {
              const chainId = e.network === "testnet" ? 5042002 : 5042;
              const url = buildAddressExplorerUrl(chainId, e.address);
              return (
                <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-amber-600/15 border border-amber-500/20 shrink-0 flex items-center justify-center">
                    <Key size={10} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs tabular-nums text-amber-300/80 truncate"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        title={e.address}
                      >
                        {shortenAddress(e.address)}
                      </span>
                      <CopyButton text={e.address} />
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {e.label}
                    </p>
                  </div>
                  <span className={[
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    e.network === "testnet"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-blue-500/10 text-blue-300 border-blue-500/20",
                  ].join(" ")}>
                    {e.network === "testnet" ? "Testnet" : "Mainnet"}
                  </span>
                  <button
                    onClick={() => removeEoa(idx)}
                    className="p-1 rounded hover:bg-white/10 text-white/20 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
