/**
 * TestPanel — lets developers try the paid API from the browser.
 * Shows the full 402 → payment header → 200 flow in a structured view.
 * Note: browser calls go via /api proxy; the x402 client-side payment
 * is intentionally NOT implemented here because that requires a funded
 * private key on the buyer side. This panel shows the raw 402 response
 * (proof the gate works) and documents the curl/CLI path for agents.
 */

import { useState } from "react";
import { Terminal, ChevronRight, Loader2, CheckCircle, XCircle } from "lucide-react";

type Step = "idle" | "sending" | "got402" | "error";

interface FlowState {
  step: Step;
  status?: number;
  paymentRequired?: string;
  errorMsg?: string;
}

export function TestPanel() {
  const [prompt, setPrompt] = useState("What is Circle Gateway Nanopayments?");
  const [flow, setFlow] = useState<FlowState>({ step: "idle" });

  async function sendUnpaid() {
    setFlow({ step: "sending" });
    try {
      const res = await fetch("/api/v1/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const paymentHeader =
        res.headers.get("payment-required") ??
        res.headers.get("PAYMENT-REQUIRED") ??
        "(header not exposed to browser — check server logs)";

      setFlow({
        step: "got402",
        status: res.status,
        paymentRequired: paymentHeader,
      });
    } catch (err) {
      setFlow({ step: "error", errorMsg: String(err) });
    }
  }

  function reset() {
    setFlow({ step: "idle" });
  }

  const cliExample = `circle services pay \\
  --url http://localhost:3001/v1/inference \\
  -X POST \\
  --data '{"prompt":"${prompt.slice(0, 40)}"}' \\
  --max-amount 0.01`;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
        <Terminal size={15} className="text-blue-400" />
        <span
          className="text-sm font-semibold text-white/80"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Test the payment gate
        </span>
        <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase text-white/30">
          developer tool
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Prompt input */}
        <div>
          <label
            className="block text-[11px] font-semibold tracking-widest uppercase text-white/40 mb-2"
            htmlFor="test-prompt"
          >
            Prompt
          </label>
          <textarea
            id="test-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            placeholder="Enter a prompt…"
          />
        </div>

        {/* Flow steps */}
        <div className="flex items-center gap-2 text-xs text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <StepBadge label="POST /v1/inference" active={flow.step !== "idle"} done={flow.step === "got402"} />
          <ChevronRight size={12} />
          <StepBadge label="402 Payment Required" active={flow.step === "got402"} done={false} />
          <ChevronRight size={12} />
          <span className="text-white/25">agent pays → 200 OK</span>
        </div>

        {/* Result */}
        {flow.step === "got402" && (
          <div className="rounded-lg bg-black/30 border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-400">
                HTTP {flow.status} — Payment gate is active
              </span>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                PAYMENT-REQUIRED header
              </p>
              <pre
                className="text-[11px] text-blue-300 break-all whitespace-pre-wrap leading-relaxed"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {flow.paymentRequired}
              </pre>
            </div>
          </div>
        )}

        {flow.step === "error" && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-2">
            <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {flow.errorMsg}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center gap-3">
          {flow.step === "idle" || flow.step === "error" ? (
            <button
              onClick={() => { void sendUnpaid(); }}
              disabled={!prompt.trim()}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors min-h-[44px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Send unpaid request
            </button>
          ) : flow.step === "sending" ? (
            <button
              disabled
              className="px-5 py-2.5 rounded-lg bg-blue-600/50 text-sm font-semibold text-white/60 flex items-center gap-2 min-h-[44px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Loader2 size={14} className="animate-spin" />
              Sending…
            </button>
          ) : (
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold text-white/70 transition-colors min-h-[44px]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Reset
            </button>
          )}
        </div>

        {/* CLI hint */}
        <details className="group">
          <summary className="cursor-pointer text-[11px] text-white/30 hover:text-white/50 transition-colors list-none flex items-center gap-1">
            <ChevronRight size={11} className="transition-transform group-open:rotate-90" />
            Pay with Circle CLI (agent path)
          </summary>
          <pre
            className="mt-3 rounded-lg bg-black/30 border border-white/10 p-4 text-[11px] text-blue-300 overflow-x-auto"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {cliExample}
          </pre>
        </details>
      </div>
    </div>
  );
}

function StepBadge({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={[
        "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
        done
          ? "bg-emerald-500/20 text-emerald-400"
          : active
            ? "bg-blue-500/20 text-blue-400"
            : "bg-white/5 text-white/30",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
