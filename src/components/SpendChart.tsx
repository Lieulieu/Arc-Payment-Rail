/**
 * SpendChart — hourly/daily USDC revenue sparkline.
 * Polls /api/v1/chart and renders a bar sparkline with hover tooltip.
 */

import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";

interface ChartBucket {
  label: string;
  ts: number;
  amount: number;
  calls: number;
}

type ChartMode = "hourly" | "daily";

export function SpendChart() {
  const [mode, setMode] = useState<ChartMode>("hourly");
  const [buckets, setBuckets] = useState<ChartBucket[]>([]);
  const [hovered, setHovered] = useState<ChartBucket | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch_() {
      try {
        const r = await fetch(`/api/v1/chart?mode=${mode}&buckets=${mode === "hourly" ? 24 : 14}`);
        if (!r.ok) return;
        const data = (await r.json()) as { buckets: ChartBucket[] };
        if (!cancelled && Array.isArray(data.buckets)) setBuckets(data.buckets);
      } catch {/* ignore */}
    }
    void fetch_();
    const id = setInterval(() => { void fetch_(); }, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mode]);

  const max = Math.max(...buckets.map((b) => b.amount), 1);
  const totalRevenue = buckets.reduce((s, b) => s + b.amount, 0);
  const totalCalls = buckets.reduce((s, b) => s + b.calls, 0);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-blue-400" />
          <span className="text-sm font-semibold text-white/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Revenue
          </span>
        </div>
        <div className="flex gap-1">
          {(["hourly", "daily"] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                "px-2.5 py-1 rounded text-[11px] font-semibold transition-colors",
                mode === m
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                  : "text-white/30 hover:text-white/50",
              ].join(" ")}
            >
              {m === "hourly" ? "24h" : "14d"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-2">
        {/* Summary row */}
        <div className="flex gap-6 mb-4">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Revenue</p>
            <p className="text-lg font-bold tabular-nums text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              ${(totalRevenue / 1_000_000).toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Calls</p>
            <p className="text-lg font-bold tabular-nums text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              {totalCalls}
            </p>
          </div>
          {hovered && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">{hovered.label}</p>
              <p className="text-sm font-semibold tabular-nums text-blue-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${(hovered.amount / 1_000_000).toFixed(4)} · {hovered.calls} calls
              </p>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-[2px] h-20 w-full">
          {buckets.map((b, i) => {
            const heightPct = max > 0 ? (b.amount / max) * 100 : 0;
            const isHovered = hovered?.ts === b.ts;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end cursor-pointer group"
                onMouseEnter={() => setHovered(b)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={[
                    "rounded-sm transition-colors",
                    b.amount > 0
                      ? isHovered ? "bg-blue-400" : "bg-blue-600/70 group-hover:bg-blue-500/80"
                      : "bg-white/5",
                  ].join(" ")}
                  style={{ height: `${Math.max(heightPct, b.amount > 0 ? 4 : 2)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X axis labels — show first, middle, last */}
        {buckets.length > 0 && (
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-white/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {buckets[0]?.label}
            </span>
            <span className="text-[9px] text-white/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {buckets[Math.floor(buckets.length / 2)]?.label}
            </span>
            <span className="text-[9px] text-white/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {buckets[buckets.length - 1]?.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
