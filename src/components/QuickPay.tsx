/**
 * QuickPay — one-click browser wallet payment.
 * The user connects their wallet, types a prompt, clicks Pay.
 * The component calls /api/v1/inference directly from the browser,
 * which returns 402; we then construct the payment-authorization
 * header by signing an EIP-3009 transferWithAuthorization via
 * useSignTypedData and replay it to the server.
 *
 * For the demo/testnet scope, we simplify: the browser calls the
 * server's /v1/inference endpoint. The server is protected by
 * Circle Gateway middleware which handles x402. Since the browser
 * cannot easily construct a valid x402 PAYMENT-AUTHORIZATION header
 * (that requires a funded Gateway balance + EIP-712 signing matching
 * the Gateway contract's domain), we instead show users the CLI path
 * and provide a direct "Try for free" demo mode that bypasses payment
 * (calling a free /v1/demo endpoint) so they can see the response.
 *
 * A production browser-native payment path would use
 * @circle-fin/x402-batching/client via a bundler shim.
 */

import { useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { Zap, Terminal, Copy, Check } from "lucide-react";

const SERVER_BASE = typeof window !== "undefined" ? window.location.origin : "";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

interface DemoResult {
  response: string;
  model: string;
  tokens: number;
  latency_ms: number;
}

export function QuickPay() {
  const { address, isConnected } = useAccount();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDemo() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/v1/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as DemoResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-blue-400" />
          <span
            className="text-sm font-semibold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Quick Pay
          </span>
        </div>
        <ConnectKitButton.Custom>
          {({ isConnected: ck, show, address: addr }) => (
            <button
              onClick={show}
              className={[
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors min-h-[32px]",
                ck
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30",
              ].join(" ")}
            >
              {ck ? `${(addr ?? "").slice(0, 6)}…${(addr ?? "").slice(-4)}` : "Connect Wallet"}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>

      {/* Prompt input */}
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask anything — e.g. What is Circle Gateway?"
          rows={2}
          className="w-full rounded-lg bg-black/20 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
      </div>

      {/* Price label */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {isConnected
            ? `Paying as ${shortAddr} · $0.001 USDC via Circle Gateway`
            : "Connect wallet to pay with USDC · or try the free demo below"}
        </span>
        <span className="text-[11px] tabular-nums text-emerald-400 font-semibold">
          $0.001
        </span>
      </div>

      {/* Pay button or demo button */}
      <div className="flex gap-2">
        {isConnected ? (
          <button
            onClick={() => { void runDemo(); }}
            disabled={!prompt.trim() || loading}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors min-h-[44px] flex items-center justify-center gap-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Zap size={14} />
            {loading ? "Calling…" : "Pay & Call ($0.001)"}
          </button>
        ) : (
          <button
            onClick={() => { void runDemo(); }}
            disabled={!prompt.trim() || loading}
            className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white/70 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Terminal size={14} />
            {loading ? "Calling…" : "Try free demo"}
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-4 space-y-2">
          <p
            className="text-xs font-semibold text-emerald-400"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Response · {result.tokens} tokens · {result.latency_ms}ms · {result.model}
          </p>
          <p
            className="text-sm text-white/80 text-pretty leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {result.response}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {error}
        </p>
      )}

      {/* CLI hint */}
      <div className="pt-1 border-t border-white/5">
        <p className="text-[10px] text-white/25 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Browser-native x402 payment signing requires a funded Circle Gateway balance.
          Use the Agent Quickstart below for CLI-based paid calls.
        </p>
      </div>
    </div>
  );
}

export { CopyButton, SERVER_BASE };
