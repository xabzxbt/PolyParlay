"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn, formatVolume, timeUntil, getLiquidityLevel, getCategoryIcon } from "@/lib/utils";
import { useParlay } from "@/providers/ParlayProvider";
import { Check, Timer, BarChart3, Globe } from "lucide-react";

interface MarketData {
  id: string; conditionId: string; question: string; category: string;
  yesPrice: number; noPrice: number; volume: number; liquidity: number;
  endDate: string; yesTokenId: string; noTokenId: string;
  imageUrl?: string; eventTitle?: string; groupItemTitle?: string;
  active?: boolean; volume24hr?: number;
}

export default function MarketCard({ market }: { market: MarketData }) {
  const router = useRouter();
  const { addLeg, removeLeg, isMarketInParlay, getMarketSide } = useParlay();
  const inParlay = isMarketInParlay(market.id);
  const side = getMarketSide(market.id);

  const handleAdd = (s: "YES" | "NO", e: React.MouseEvent) => {
    e.stopPropagation();
    const id = `${market.id}-${s}`;
    if (side === s) { removeLeg(id); return; }
    addLeg({
      id, marketId: market.id,
      tokenId: s === "YES" ? market.yesTokenId : market.noTokenId,
      question: market.question, outcome: s,
      price: s === "YES" ? market.yesPrice : market.noPrice,
      side: s, category: market.category,
      endDate: market.endDate, liquidity: market.liquidity,
    });
  };

  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = Math.round(market.noPrice * 100);
  const isPolitics = market.category.toLowerCase() === "politics";

  return (
    <div role="button" tabIndex={0} className={cn(
      "group relative flex flex-col p-5 bg-white rounded-card shadow-sm transition-all duration-300 cursor-pointer border border-border-default hover:border-primary/30 hover:shadow-elevated-hover",
      inParlay && "ring-[3px] ring-primary shadow-glow border-primary/50"
    )} onClick={() => router.push(`/market/${market.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${market.id}`); } }}>

      {/* Selected indicator */}
      {inParlay && (
        <div className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-pill bg-primary flex items-center justify-center shadow-lg animate-scale-in">
          <Check size={14} strokeWidth={3} className="text-white" />
        </div>
      )}

      {/* Header: Title & Icon */}
      <div className="flex items-start gap-4 mb-3">
        {market.imageUrl ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white ring-1 ring-black/5">
            <Image unoptimized src={market.imageUrl} alt={market.question} width={40} height={40} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white shrink-0 flex items-center justify-center text-xl shadow-sm">
            {getCategoryIcon(market.category)}
          </div>
        )}

        <h3 className="text-[18px] font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {market.question}
        </h3>
      </div>

      {/* Main Action Area: Percentage + Buttons */}
      <div className="flex items-center justify-between mt-auto mb-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Probability</span>
          <span className={cn(
            "text-[36px] font-bold font-tabular leading-none tracking-tight",
            yesPercent >= 50 ? "text-success" : "text-error"
          )}>
            {yesPercent}%
          </span>
        </div>

        <div className="flex gap-2">
          <button onClick={(e) => handleAdd("YES", e)} className={cn(
            "h-[34px] px-3.5 rounded-lg text-xs font-bold transition-all border",
            side === "YES"
              ? "bg-success text-white border-success shadow-md"
              : "bg-transparent text-text-secondary border-border-default hover:border-success hover:text-success hover:bg-success/5"
          )}>
            YES
          </button>
          <button onClick={(e) => handleAdd("NO", e)} className={cn(
            "h-[34px] px-3.5 rounded-lg text-xs font-bold transition-all border",
            side === "NO"
              ? "bg-error text-white border-error shadow-md"
              : "bg-transparent text-text-secondary border-border-default hover:border-error hover:text-error hover:bg-error/5"
          )}>
            NO
          </button>
        </div>
      </div>

      {/* Footer Metadata */}
      <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5" title="Volume">
            <BarChart3 size={14} className="text-text-muted" /> {formatVolume(market.volume)}
          </span>
          <span className="flex items-center gap-1.5" title="Ends in">
            <Timer size={14} className="text-text-muted" /> {timeUntil(new Date(market.endDate))}
          </span>
        </div>

        {/* Category Badge */}
        <span className="px-2 py-0.5 bg-white/50 rounded-pill text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 border border-black/5">
          {isPolitics && <Globe size={10} />}
          {market.category}
        </span>
      </div>
    </div>
  );
}
