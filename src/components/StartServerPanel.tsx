import { useState } from "react";
import { ServerOff, Terminal, Copy, Check, Play, RefreshCw } from "lucide-react";

interface StartServerPanelProps {
  onRetry: () => void;
}

export function StartServerPanel({ onRetry }: StartServerPanelProps) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const cmd = "bun run dev:server";

  function copy() {
    void navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function retry() {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      onRetry();
    }, 1200);
  }

  return (
    <div className="rounded-2xl bg-[#0d1526] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <ServerOff size={14} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Payment server is not running
          </p>
          <p className="text-[11px] text-white/40">
            Start the Express server to enable paid API calls and live stats.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-blue-400">1</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/70 mb-2">
              Open a terminal and run:
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-black/40 border border-white/10 px-4 py-2.5">
              <Terminal size={12} className="text-blue-400 shrink-0" />
              <code className="flex-1 text-[12px] text-blue-300 select-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {cmd}
              </code>
              <button
                onClick={copy}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/50 hover:text-white/70 transition-colors shrink-0"
              >
                {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-blue-400">2</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/70 mb-2">
              Wait for the server to start, then click:
            </p>
            <button
              onClick={retry}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/30 transition-colors disabled:opacity-60"
            >
              {checking ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              {checking ? "Checking connection…" : "I started the server — connect now"}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02] flex items-center gap-2">
        <RefreshCw size={11} className="text-white/20" />
        <p className="text-[11px] text-white/30">
          The dashboard also reconnects automatically every 5 seconds.
        </p>
      </div>
    </div>
  );
}
