import { BarChart3, Activity, Layers, Globe } from "lucide-react";
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
    <div className="flex items-center gap-4 text-[11px] font-bold text-text-secondary">
      <div className="flex items-center gap-1.5" title="24h Volume">
        <BarChart3 size={14} className="text-primary" />
        <span>{formatVolume(stats.totalVolume24h)}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Liquidity">
        <Activity size={14} className="text-success" />
        <span>{formatVolume(stats.totalLiquidity)}</span>
      </div>
      <div className="flex items-center gap-1.5 hidden sm:flex">
        <Layers size={14} className="text-text-secondary" />
        <span>{stats.activeMarkets} markets</span>
      </div>
    </div>
  );
}
