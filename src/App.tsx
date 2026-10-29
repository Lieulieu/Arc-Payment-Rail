import { useState } from "react";
import { useCallStream } from "./hooks/useCallStream";
import { StatsBar } from "./components/StatsBar";
import { CallLog } from "./components/CallLog";
import { QuickPay } from "./components/QuickPay";
import { AgentQuickstart } from "./components/AgentQuickstart";
import { HowItWorks } from "./components/HowItWorks";
import { SpendChart } from "./components/SpendChart";
import { AgentLeaderboard } from "./components/AgentLeaderboard";
import { TransactionHistory } from "./components/TransactionHistory";
import { WalletExplorer } from "./components/WalletExplorer";
import { Logo } from "./components/Logo";
import { ServerOff, Terminal, LayoutDashboard, History, Trophy, Wallet } from "lucide-react";

type Tab = "dashboard" | "history" | "leaderboard" | "wallets";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "dashboard",   label: "Dashboard",   Icon: LayoutDashboard },
  { id: "history",     label: "History",     Icon: History },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
  { id: "wallets",     label: "Wallets",     Icon: Wallet },
];

export default function App() {
  const { events, connected, totalRevenue, uniquePayers } = useCallStream();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [historyPayer, setHistoryPayer] = useState("");

  function openHistoryForPayer(payer: string) {
    setHistoryPayer(payer);
    setTab("history");
  }

  return (
    <div className="min-h-dvh bg-[#0a0f1e] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" />

      {/* Top nav */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <h1 className="text-base font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                AI Agent Payment Rail
              </h1>
              <p className="text-[11px] text-white/40">$0.001 USDC per call · Circle Gateway Nanopayments · Arc Testnet</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!connected && (
              <a
                href="#start-server"
                onClick={(e) => { e.preventDefault(); document.getElementById("start-server-banner")?.scrollIntoView({ behavior: "smooth" }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/20 transition-colors min-h-[32px]"
              >
                <ServerOff size={12} />
                Start server
              </a>
            )}
            <span className={["flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold", connected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/30 border border-white/10"].join(" ")}>
              <span className={["w-1.5 h-1.5 rounded-full", connected ? "bg-emerald-400 animate-pulse" : "bg-white/20"].join(" ")} />
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto mt-4 flex gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[36px]",
                tab === id
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5",
              ].join(" ")}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Dashboard tab ── */}
        {tab === "dashboard" && (
          <>
            {/* Stats */}
            <section>
              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-3">Overview</p>
              <StatsBar totalCalls={events.length} totalRevenue={totalRevenue} uniquePayers={uniquePayers} connected={connected} />
            </section>

            {/* How it works / offline banner */}
            {!connected ? (
              <div id="start-server-banner" className="space-y-4">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <ServerOff size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Payment server is not running</p>
                      <p className="text-xs text-white/40">Start the Express server in a terminal, then the dashboard will connect automatically.</p>
                      <pre className="mt-3 rounded-lg bg-black/30 border border-white/10 px-4 py-3 text-[11px] text-blue-300 overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>bun run dev:server</pre>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Terminal size={13} className="text-white/30" />
                    <span className="text-[11px] text-white/30">Reconnects automatically</span>
                  </div>
                </div>
                <HowItWorks />
              </div>
            ) : null}

            {/* Spend chart */}
            <SpendChart />

            {/* Call log + tools */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              <section>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-3">Live call log</p>
                <CallLog events={events} />
              </section>
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-3">Quick Pay</p>
                  <QuickPay />
                </div>
                <AgentQuickstart />
                <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-3">
                  <p className="text-xs font-semibold text-white/60" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Endpoint</p>
                  <div className="space-y-2 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <EndpointRow method="POST" path="/v1/inference" paid />
                    <EndpointRow method="GET"  path="/health" />
                    <EndpointRow method="GET"  path="/v1/events" label="SSE stream" />
                    <EndpointRow method="GET"  path="/v1/history" label="paginated" />
                    <EndpointRow method="GET"  path="/v1/leaderboard" />
                    <EndpointRow method="GET"  path="/v1/chart" label="hourly/daily" />
                  </div>
                  <p className="text-[11px] text-white/30 pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Body: <code className="text-blue-300">{"{ prompt: string }"}</code><br />
                    Response: <code className="text-blue-300">{"{ response, model, tokens, paid_by, usdc_charged }"}</code>
                  </p>
                </div>
              </section>
            </div>
          </>
        )}

        {/* ── History tab ── */}
        {tab === "history" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Transaction History</p>
              {historyPayer && (
                <button onClick={() => setHistoryPayer("")} className="text-[11px] text-white/30 hover:text-white/50 transition-colors">
                  Clear filter
                </button>
              )}
            </div>
            {/* Pass historyPayer as key so the component re-mounts with the pre-filled filter */}
            <TransactionHistoryWithPayer key={historyPayer} initialPayer={historyPayer} />
          </>
        )}

        {/* ── Wallets tab ── */}
        {tab === "wallets" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Agent Wallets</p>
            </div>
            <WalletExplorer />
          </>
        )}

        {/* ── Leaderboard tab ── */}
        {tab === "leaderboard" && (
          <>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Agent Leaderboard</p>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              <AgentLeaderboard onSelectPayer={openHistoryForPayer} />
              <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-3">
                <p className="text-xs font-semibold text-white/60" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>How ranking works</p>
                <p className="text-xs text-white/40 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Agents are ranked by total USDC spent across all paid calls. Click any agent to view their full transaction history.
                  Rank 1 is gold, rank 2 silver, rank 3 bronze.
                </p>
                <div className="pt-2 space-y-2 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="text-amber-400 w-4">1</span>
                    <span>Total USDC paid (descending)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="w-4">→</span>
                    <span>Tiebreak: most recent call</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}

// Wrapper that accepts an initialPayer prop for pre-filling the history filter
function TransactionHistoryWithPayer({ initialPayer }: { initialPayer: string }) {
  // TransactionHistory manages its own filter state; we signal the initial value via key
  // The component reads it from props on mount
  return <TransactionHistory initialPayer={initialPayer} />;
}

function EndpointRow({ method, path, paid, label }: { method: string; path: string; paid?: boolean; label?: string }) {
  const color = method === "POST" ? "text-amber-400" : "text-blue-400";
  return (
    <div className="flex items-center gap-3">
      <span className={`${color} w-10 shrink-0`}>{method}</span>
      <span className="text-white/60">{path}</span>
      {paid && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">PAID</span>}
      {label && <span className="text-white/30">{label}</span>}
    </div>
  );
}
