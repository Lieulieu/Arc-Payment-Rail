/**
 * TransactionHistory — full paginated call log with filters.
 */

import { useEffect, useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import type { PaidCallEvent } from "../hooks/useCallStream";
import { TransactionReceipt } from "./TransactionReceipt";

interface HistoryResult {
  events: PaidCallEvent[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

function shortenAddress(addr: string): string {
  if (!addr || addr === "unknown") return "unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsdc(raw: string): string {
  return `$${(parseInt(raw || "0", 10) / 1_000_000).toFixed(4)}`;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

interface TransactionHistoryProps {
  initialPayer?: string;
}

export function TransactionHistory({ initialPayer = "" }: TransactionHistoryProps) {
  const [payer, setPayer] = useState(initialPayer);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PaidCallEvent | null>(null);

  // Stable ref so goPage can trigger a page fetch without re-running the effect
  const filtersRef = useRef({ payer, minAmount, maxAmount });
  filtersRef.current = { payer, minAmount, maxAmount };

  async function doFetch(p: number): Promise<void> {
    const f = filtersRef.current;
    const params = new URLSearchParams({ page: String(p), pageSize: "20" });
    if (f.payer.trim()) params.set("payer", f.payer.trim());
    if (f.minAmount.trim()) params.set("minAmount", String(Math.round(parseFloat(f.minAmount) * 1_000_000)));
    if (f.maxAmount.trim()) params.set("maxAmount", String(Math.round(parseFloat(f.maxAmount) * 1_000_000)));
    const r = await fetch(`/api/v1/history?${params.toString()}`).catch(() => null);
    if (!r?.ok) return;
    const data = (await r.json()) as HistoryResult;
    setResult(data);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    setResult(null);
    const timer = setTimeout(() => { void doFetch(1); }, 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payer, minAmount, maxAmount]);

  function goPage(p: number) {
    setPage(p);
    setLoading(true);
    void doFetch(p);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">
            Payer address
          </label>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              placeholder="0x…"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        </div>

        <div className="w-28">
          <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">
            Min USDC
          </label>
          <input
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="0.000"
            type="number"
            step="0.001"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        <div className="w-28">
          <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">
            Max USDC
          </label>
          <input
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="1.000"
            type="number"
            step="0.001"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[160px_140px_1fr_80px_80px_40px] gap-3 px-5 py-3 border-b border-white/10">
          {["Time", "Payer", "Prompt", "Tokens", "USDC", ""].map((h, i) => (
            <span key={i} className="text-[10px] font-semibold tracking-widest uppercase text-white/30">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-white/5 min-h-[200px]">
          {loading && (
            <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
          )}
          {!loading && result?.events.length === 0 && (
            <div className="py-12 text-center text-white/30 text-sm">No transactions match the filters</div>
          )}
          {!loading && result?.events.map((ev) => (
            <div
              key={ev.id}
              className="grid grid-cols-[160px_140px_1fr_80px_80px_40px] gap-3 px-5 py-3 items-center hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => setSelected(ev)}
            >
              <span className="text-xs tabular-nums text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatTs(ev.timestamp)}
              </span>
              <span className="text-xs tabular-nums text-blue-300 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }} title={ev.payer}>
                {shortenAddress(ev.payer)}
              </span>
              <span className="text-xs text-white/70 truncate" title={ev.promptPreview}>
                {ev.promptPreview}
              </span>
              <span className="text-xs tabular-nums text-white/50 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {ev.tokens}
              </span>
              <span className="text-xs tabular-nums text-emerald-400 font-semibold text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatUsdc(ev.amount)}
              </span>
              <button className="flex justify-center text-white/20 hover:text-blue-400 transition-colors">
                <Receipt size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {result && result.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
            <span className="text-xs text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {result.total} transactions · page {result.page} of {result.pages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={12} className="text-white/60" />
              </button>
              <button
                disabled={page >= result.pages}
                onClick={() => goPage(page + 1)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={12} className="text-white/60" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt modal */}
      <TransactionReceipt event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
