import { motion, AnimatePresence } from "framer-motion";
import type { PaidCallEvent } from "../hooks/useCallStream";

interface CallLogProps {
  events: PaidCallEvent[];
}

function shortenAddress(addr: string): string {
  if (!addr || addr === "unknown") return "unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatUsdc(raw: string): string {
  const n = parseInt(raw || "0", 10);
  return `$${(n / 1_000_000).toFixed(4)}`;
}

export function CallLog({ events }: CallLogProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center py-16">
        <p className="text-white/30 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          No paid calls yet — make a request to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[120px_140px_1fr_80px_80px] gap-3 px-5 py-3 border-b border-white/10">
        {["Time", "Payer", "Prompt", "Tokens", "USDC"].map((h) => (
          <span
            key={h}
            className="text-[10px] font-semibold tracking-widest uppercase text-white/30"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid grid-cols-[120px_140px_1fr_80px_80px] gap-3 px-5 py-3 items-center hover:bg-white/5 transition-colors"
            >
              <span
                className="text-xs tabular-nums text-white/50"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatTime(ev.timestamp)}
              </span>
              <span
                className="text-xs tabular-nums text-blue-300 truncate"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                title={ev.payer}
              >
                {shortenAddress(ev.payer)}
              </span>
              <span
                className="text-xs text-white/70 truncate"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                title={ev.promptPreview}
              >
                {ev.promptPreview}
              </span>
              <span
                className="text-xs tabular-nums text-white/50 text-right"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {ev.tokens}
              </span>
              <span
                className="text-xs tabular-nums text-emerald-400 font-semibold text-right"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatUsdc(ev.amount)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
