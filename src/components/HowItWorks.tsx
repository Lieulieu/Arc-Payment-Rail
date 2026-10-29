/**
 * HowItWorks — 3-step onboarding strip shown when stream is offline or on first visit.
 */

import { Wallet, ArrowRight, Zap } from "lucide-react";

const STEPS = [
  {
    icon: Wallet,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "1. Get a wallet",
    body: "Create a Circle agent wallet with one CLI command. No signup form, no credit card.",
    code: "circle wallet create --testnet",
  },
  {
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "2. Fund it",
    body: "Deposit testnet USDC into Circle Gateway. $0.50 covers 500 calls.",
    code: "circle gateway deposit --amount 0.50 --chain ARC-TESTNET --method direct",
  },
  {
    icon: ArrowRight,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    title: "3. Pay per call",
    body: "Each request costs $0.001. No subscription, no API key, no account — just USDC.",
    code: "circle services pay --url <endpoint> -X POST --data '{\"prompt\":\"…\"}'",
  },
];

export function HowItWorks() {
  return (
    <div className="rounded-xl bg-white/3 border border-white/8 p-5 space-y-4">
      <p
        className="text-[11px] font-semibold tracking-widest uppercase text-white/30"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        How it works
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className={`rounded-xl border p-4 space-y-3 ${step.bg}`}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={step.color} />
                <span
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {step.title}
                </span>
              </div>
              <p
                className="text-xs text-white/50 leading-relaxed text-pretty"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {step.body}
              </p>
              <pre
                className="text-[10px] text-blue-300 bg-black/20 rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {step.code}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
