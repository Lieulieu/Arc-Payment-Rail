/**
 * AgentLeaderboard — top paying agents ranked by USDC spent.
 * Toggle between in-memory (live) and onchain (permanent) data sources.
 */

import { useEffect, useState } from "react";
import { Trophy, Link, RefreshCw } from "lucide-react";

interface LeaderboardEntry {
  payer: string;
  totalAmount: number;
  callCount: number;
  lastSeen: number;
}

function shortenAddress(addr: string): string {
  if (!addr || addr === "unknown") return "unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsdc(raw: number): string {
  return `$${(raw / 1_000_000).toFixed(4)}`;
}

function timeAgo(ts: number): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const RANK_COLORS = ["text-amber-400", "text-slate-300", "text-amber-600"];

type Source = "live" | "onchain";

interface AgentLeaderboardProps {
  onSelectPayer?: (payer: string) => void;
}

export function AgentLeaderboard({ onSelectPayer }: AgentLeaderboardProps) {
  const [source, setSource] = useState<Source>("onchain");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const url = source === "onchain"
          ? "/api/v1/leaderboard/onchain"
          : "/api/v1/leaderboard?limit=10";
        const r = await fetch(url);
        if (!r.ok) return;
        const data = (await r.json()) as { entries: LeaderboardEntry[] };
        if (!cancelled && Array.isArray(data.entries)) {
          setEntries(data.entries);
          setLastRefresh(Date.now());
        }
      } catch {/* ignore */} finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    // poll live every 5s; onchain every 20s (has its own 15s cache)
    const interval = source === "live" ? 5000 : 20000;
    const id = setInterval(() => { void load(); }, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [source]);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
        <Trophy size={14} className="text-amber-400 shrink-0" />
        <span className="text-sm font-semibold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Agent Leaderboard
        </span>

        {/* Source toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 p-0.5">
          {(["onchain", "live"] as Source[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={[
                "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors",
                source === s
                  ? s === "onchain"
                    ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                    : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/20"
                  : "text-white/30 hover:text-white/50",
              ].join(" ")}
            >
              {s === "onchain" ? "⛓ Onchain" : "⚡ Live"}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          onClick={() => setSource((s) => s)} // re-triggers effect
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Source label */}
      <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/5 bg-white/[0.02]">
        <Link size={10} className={source === "onchain" ? "text-blue-400" : "text-emerald-400"} />
        <span className="text-[10px] text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {source === "onchain"
            ? `Reading from PaymentRegistry contract · ${String(import.meta.env.VITE_REGISTRY_ADDRESS ?? "").slice(0, 10)}…`
            : "Reading from server memory — resets on restart"}
        </span>
        {lastRefresh > 0 && (
          <span className="ml-auto text-[10px] text-white/20">updated {timeAgo(lastRefresh)}</span>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          {loading ? (
            <p className="text-white/30 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Loading onchain records…
            </p>
          ) : (
            <>
              <p className="text-white/30 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No records found
              </p>
              {source === "onchain" && (
                <p className="text-white/20 text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Run <code className="text-blue-300">bun run seed:registry</code> to add records
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {entries.map((entry, i) => (
            <button
              key={entry.payer}
              onClick={() => onSelectPayer?.(entry.payer)}
              className="w-full grid grid-cols-[28px_1fr_auto] gap-3 px-5 py-3 items-center hover:bg-white/5 transition-colors text-left"
            >
              <span
                className={["text-sm font-bold tabular-nums", RANK_COLORS[i] ?? "text-white/40"].join(" ")}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {i + 1}
              </span>

              <div className="min-w-0">
                <p
                  className="text-xs tabular-nums text-blue-300 truncate"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  title={entry.payer}
                >
                  {shortenAddress(entry.payer)}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {entry.callCount} call{entry.callCount !== 1 ? "s" : ""} · last {timeAgo(entry.lastSeen)}
                </p>
              </div>

              <span
                className="text-sm font-semibold tabular-nums text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatUsdc(entry.totalAmount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
