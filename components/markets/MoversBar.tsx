"use client";
import { useRouter } from "next/navigation";
import { cn, formatVolume } from "@/lib/utils";
import { Flame, ArrowRight } from "lucide-react";

interface MoverMarket {
  id: string; question: string; yesPrice: number; volume24hr: number;
  yesTokenId: string; noTokenId: string; endDate: string; liquidity: number;
  category: string;
}

export default function MoversBar({ markets }: { markets: MoverMarket[] }) {
  const router = useRouter();

  if (markets.length === 0) return null;

  const movers = [...markets]
    .filter(m => m.volume24hr !== undefined && m.volume24hr !== null)
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 8);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Flame size={16} className="text-warning" strokeWidth={2.5} />
        <h2 className="text-sm font-bold text-text-primary">Hot Markets</h2>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium bg-surface-2 px-1.5 py-0.5 rounded-sm border border-border-default">Top 24h volume</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {movers.map((m) => {
          const yp = Math.round(m.yesPrice * 100);
          return (
            <button key={m.id}
              onClick={() => router.push(`/market/${m.id}`)}
              className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-card border bg-white border-border-default hover:border-primary/40 hover:shadow-elevated-hover transition-all group active:scale-[0.98]">
              <span className={cn(
                "text-sm font-bold font-tabular min-w-[32px] text-center px-1 py-0.5 rounded-sm bg-surface-1",
                yp >= 70 ? "text-success bg-success-dim/10" : yp <= 30 ? "text-error bg-error-dim/10" : "text-text-primary"
              )}>
                {yp}%
              </span>
              <span className="text-xs font-medium text-text-secondary max-w-[140px] truncate group-hover:text-primary transition-colors text-left">{m.question}</span>
              <span className="text-[10px] text-text-muted font-mono font-medium bg-surface-1 px-1.5 py-0.5 rounded-pill border border-border-default flex items-center gap-1">
                <ArrowRight size={8} />
                {formatVolume(m.volume24hr)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
