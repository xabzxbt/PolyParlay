import { BarChart3, Activity, Layers } from "lucide-react";
import { formatVolume } from "@/lib/utils";

interface Props {
  stats: {
    totalVolume24h: number;
    totalLiquidity: number;
    activeEvents: number;
    activeMarkets: number;
  } | null;
}

export default function PlatformStats({ stats }: Props) {
  if (!stats) return null;

  return (
    <div
      className="flex items-center gap-4"
      style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}
    >
      <div className="flex items-center gap-1.5" title="24h Volume">
        <BarChart3 size={13} style={{ color: 'var(--accent-mocha)' }} />
        <span style={{ fontFamily: 'var(--font-mono)' }}>${formatVolume(stats.totalVolume24h)}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Liquidity">
        <Activity size={13} style={{ color: 'var(--accent-green)' }} />
        <span style={{ fontFamily: 'var(--font-mono)' }}>${formatVolume(stats.totalLiquidity)}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <Layers size={13} style={{ color: 'var(--text-muted)' }} />
        <span>{stats.activeMarkets} markets</span>
      </div>
    </div>
  );
}
