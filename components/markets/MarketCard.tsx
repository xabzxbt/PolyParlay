"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn, formatVolume, timeUntil, getLiquidityLevel, getCategoryIcon } from "@/lib/utils";
import { useParlay } from "@/providers/ParlayProvider";
import { Check, Timer, BarChart3 } from "lucide-react";

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

  return (
    <div
      role="button"
      tabIndex={0}
      className="card-animate relative flex flex-col p-5 rounded-xl cursor-pointer transition-all duration-200 group"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: inParlay ? '1px solid rgba(156,123,94,0.4)' : '1px solid var(--border-subtle)',
        boxShadow: inParlay ? '0 0 0 2px rgba(156,123,94,0.15), var(--shadow-card)' : 'var(--shadow-card)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = inParlay ? '0 0 0 2px rgba(156,123,94,0.15), var(--shadow-card)' : 'var(--shadow-card)';
      }}
      onClick={() => router.push(`/market/${market.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${market.id}`); } }}
    >
      {/* Selected checkmark */}
      {inParlay && (
        <div
          className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center animate-scale-in"
          style={{ backgroundColor: 'var(--accent-mocha)', boxShadow: 'var(--shadow-mocha)' }}
        >
          <Check size={13} strokeWidth={2.5} style={{ color: 'var(--text-inverse)' }} />
        </div>
      )}

      {/* Header: Image + Title */}
      <div className="flex items-start gap-3 mb-4">
        {market.imageUrl ? (
          <div
            className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
            style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <Image
              unoptimized
              src={market.imageUrl}
              alt={market.question}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {getCategoryIcon(market.category)}
          </div>
        )}

        <h3
          className="text-sm leading-snug line-clamp-3 flex-1"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            fontSize: '16px',
            lineHeight: '1.4',
          }}
        >
          {market.question}
        </h3>
      </div>

      {/* Probability + YES/NO */}
      <div className="flex items-center justify-between mt-auto mb-4">
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Probability
          </span>
          <span
            className="font-bold font-tabular leading-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '32px',
              color: yesPercent >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {yesPercent}%
          </span>
          {/* Prob bar */}
          <div className="prob-bar mt-1" style={{ width: '80px' }}>
            <div className="prob-fill" style={{ width: `${yesPercent}%` }} />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => handleAdd("YES", e)}
            className="h-9 px-3.5 rounded-lg text-xs font-bold transition-all active:scale-97"
            style={{
              backgroundColor: side === "YES" ? '#166534' : 'var(--accent-green)',
              color: '#FFFFFF',
              boxShadow: side === "YES" ? '0 0 0 2px #166534, 0 2px 6px rgba(21,128,61,0.35)' : '0 1px 4px rgba(21,128,61,0.3)',
            }}
          >
            YES
          </button>
          <button
            onClick={(e) => handleAdd("NO", e)}
            className="h-9 px-3.5 rounded-lg text-xs font-bold transition-all active:scale-97"
            style={{
              backgroundColor: side === "NO" ? '#991b1b' : 'var(--accent-red)',
              color: '#FFFFFF',
              boxShadow: side === "NO" ? '0 0 0 2px #991b1b, 0 2px 6px rgba(185,28,28,0.35)' : '0 1px 4px rgba(185,28,28,0.3)',
            }}
          >
            NO
          </button>
        </div>
      </div>

      {/* Footer metadata */}
      <div
        className="pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5" title="Volume">
            <BarChart3 size={13} style={{ color: 'var(--text-muted)' }} />
            {formatVolume(market.volume)}
          </span>
          <span className="flex items-center gap-1.5" title="Ends in">
            <Timer size={13} style={{ color: 'var(--text-muted)' }} />
            {timeUntil(new Date(market.endDate))}
          </span>
        </div>

        {/* Category badge */}
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          {market.category}
        </span>
      </div>
    </div>
  );
}
