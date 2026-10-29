import { Activity, DollarSign, Users, Wifi, WifiOff } from "lucide-react";

interface StatsBarProps {
  totalCalls: number;
  totalRevenue: number;  // raw USDC units (6 decimals)
  uniquePayers: number;
  connected: boolean;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-blue-400 shrink-0" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-white/40">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export function StatsBar({ totalCalls, totalRevenue, uniquePayers, connected }: StatsBarProps) {
  const revenueUsdc = (totalRevenue / 1_000_000).toFixed(4);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <StatCard
        icon={Activity}
        label="Total Calls"
        value={totalCalls.toLocaleString()}
        sub="paid requests"
      />
      <StatCard
        icon={DollarSign}
        label="Revenue"
        value={`$${revenueUsdc}`}
        sub="USDC settled"
      />
      <StatCard
        icon={Users}
        label="Payers"
        value={uniquePayers.toString()}
        sub="unique agents"
      />
      <div className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-5 py-4 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2">
          {connected ? (
            <Wifi size={14} className="text-emerald-400 shrink-0" />
          ) : (
            <WifiOff size={14} className="text-red-400 shrink-0" />
          )}
          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/40">
            Stream
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          {connected ? "Live" : "Offline"}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          {connected ? "SSE connected" : "server unreachable"}
        </p>
      </div>
    </div>
  );
}
