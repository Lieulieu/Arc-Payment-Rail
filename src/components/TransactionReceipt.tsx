/**
 * TransactionReceipt — modal showing full details for a paid call.
 * Also includes AgentIdentity: resolves payer to ERC-8004 agent card.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Bot, Clock, Cpu, Zap, DollarSign } from "lucide-react";
import type { PaidCallEvent } from "../hooks/useCallStream";

// ── Agent Identity (ERC-8004) ─────────────────────────────────────────────────

interface AgentCard {
  name?: string;
  description?: string;
  url?: string;
}

function useAgentIdentity(address: string): { card: AgentCard | null; loading: boolean } {
  const [card, setCard] = useState<AgentCard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || address === "unknown") return;
    const controller = new AbortController();
    let alive = true;
    fetch(`/api/v1/agent-identity?address=${encodeURIComponent(address)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { card?: AgentCard } | null) => {
        if (alive) setCard(data?.card ?? null);
      })
      .catch(() => { if (alive) setCard(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [address]);

  return { card, loading };
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────

interface TransactionReceiptProps {
  event: PaidCallEvent | null;
  onClose: () => void;
}

function Field({ label, value, mono = false, highlight = false }: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-white/30">{label}</span>
      <span
        className={[
          "text-sm break-all",
          mono ? "font-mono" : "",
          highlight ? "text-emerald-400 font-semibold" : "text-white/80",
        ].join(" ")}
        style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : "'DM Sans', sans-serif" }}
      >
        {value}
      </span>
    </div>
  );
}

function formatUsdc(raw: string): string {
  return `$${(parseInt(raw || "0", 10) / 1_000_000).toFixed(6)} USDC`;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString([], {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function TransactionReceipt({ event, onClose }: TransactionReceiptProps) {
  const { card, loading } = useAgentIdentity(event?.payer ?? "");

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto rounded-2xl bg-[#0d1425] border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <DollarSign size={15} className="text-emerald-400" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Transaction Receipt
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={13} className="text-white/50" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Agent identity card */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={13} className="text-blue-400" />
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-white/40">
                    Agent Identity
                  </span>
                  {loading && (
                    <span className="ml-auto text-[10px] text-white/20">resolving…</span>
                  )}
                </div>
                {card ? (
                  <div className="space-y-1">
                    {card.name && <p className="text-sm font-semibold text-white">{card.name}</p>}
                    {card.description && <p className="text-xs text-white/50">{card.description}</p>}
                    {card.url && (
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {card.url} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {loading ? "Looking up ERC-8004 identity…" : "Not registered on Arc identity registry"}
                  </p>
                )}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount Paid" value={formatUsdc(event.amount)} highlight />
                <Field label="Network" value={event.network || "unknown"} />
                <Field label="Tokens" value={String(event.tokens)} />
                <Field label="Latency" value={`${event.latency_ms} ms`} />
              </div>

              <Field label="Payer Address" value={event.payer} mono />
              <Field label="Prompt" value={event.promptPreview} />

              <div className="flex items-center gap-2 text-[11px] text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <Clock size={11} />
                <span>{formatTs(event.timestamp)}</span>
                <span className="ml-auto text-white/20">{event.id}</span>
              </div>

              {/* Explorer link (tx hash absent in mock — show placeholder) */}
              <div className="flex items-center gap-2 pt-1">
                <Cpu size={12} className="text-white/20" />
                <a
                  href={`https://explorer.testnet.arc.io`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400/60 hover:text-blue-400 transition-colors"
                >
                  View on Arc Explorer <ExternalLink size={10} />
                </a>
                <Zap size={11} className="text-emerald-400 ml-auto" />
                <span className="text-[10px] text-emerald-400/70">Gateway settled</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
