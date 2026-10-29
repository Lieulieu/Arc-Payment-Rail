/**
 * AgentLeaderboard — top paying agents ranked by USDC spent.
 */

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

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
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const RANK_COLORS = ["text-amber-400", "text-slate-300", "text-amber-600"];

interface AgentLeaderboardProps {
  onSelectPayer?: (payer: string) => void;
}

export function AgentLeaderboard({ onSelectPayer }: AgentLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/v1/leaderboard?limit=10");
        if (!r.ok) return;
        const data = (await r.json()) as { entries: LeaderboardEntry[] };
        if (!cancelled && Array.isArray(data.entries)) setEntries(data.entries);
      } catch {/* ignore */}
    }
    void load();
    const id = setInterval(() => { void load(); }, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
        <Trophy size={14} className="text-amber-400" />
        <span className="text-sm font-semibold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Agent Leaderboard
        </span>
        <span className="ml-auto text-[10px] text-white/30 uppercase tracking-widest">top payers</span>
      </div>

      {entries.length === 0 ? (
        <div className="py-10 text-center text-white/30 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          No paid calls yet
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {entries.map((entry, i) => (
            <button
              key={entry.payer}
              onClick={() => onSelectPayer?.(entry.payer)}
              className="w-full grid grid-cols-[28px_1fr_auto] gap-3 px-5 py-3 items-center hover:bg-white/5 transition-colors text-left"
            >
              {/* Rank */}
              <span
                className={[
                  "text-sm font-bold tabular-nums",
                  RANK_COLORS[i] ?? "text-white/40",
                ].join(" ")}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {i + 1}
              </span>

              {/* Payer + stats */}
              <div className="min-w-0">
                <p
                  className="text-xs tabular-nums text-blue-300 truncate"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  title={entry.payer}
                >
                  {shortenAddress(entry.payer)}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {entry.callCount} calls · last {timeAgo(entry.lastSeen)}
                </p>
              </div>

              {/* Total USDC */}
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
