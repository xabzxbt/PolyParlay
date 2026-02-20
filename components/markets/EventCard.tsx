"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn, formatVolume, timeUntil, getCategoryIcon, getCategoryColor, getLiquidityLevel } from "@/lib/utils";
import { useParlay } from "@/providers/ParlayProvider";
import { calculateEventQualityScore } from "@/lib/quality-score";
import QualityBadge from "@/components/markets/QualityBadge";
import SmartMoneyBadge from "@/components/markets/SmartMoneyBadge";
import { isActiveMarket } from "@/lib/filters";
import { ChevronDown, ChevronUp, Timer, Users, TrendingUp, Target } from "lucide-react";

interface Market {
  id: string; conditionId: string; question: string; category: string;
  yesPrice: number; noPrice: number; volume: number; liquidity: number;
  endDate: string; yesTokenId: string; noTokenId: string;
  groupItemTitle?: string;
}

interface EventData {
  id: string; slug: string; title: string; imageUrl?: string; category: string;
  volume: number; volume24hr: number; liquidity: number; endDate: string;
  marketCount: number; markets: Market[];
  smartMoneyCount?: number;
  smartMoneySentiment?: "bullish" | "bearish" | "mixed" | "none";
}

const INITIAL_SHOW = 4;

export default function EventCard({ event }: { event: EventData }) {
  const router = useRouter();
  const { addLeg, removeLeg, isMarketInParlay, getMarketSide } = useParlay();
  const [expanded, setExpanded] = useState(false);
  const isSingle = event.markets.length === 1;
  const activeMarkets = useMemo(() => {
    const now = new Date();
    return event.markets.filter(m => isActiveMarket(m, now));
  }, [event.markets]);

  const visibleMarkets = expanded ? activeMarkets : activeMarkets.slice(0, INITIAL_SHOW);
  const hiddenCount = activeMarkets.length - INITIAL_SHOW;
  const totalHiddenCount = event.markets.length - activeMarkets.length;
  const catColor = getCategoryColor(event.category);
  const liq = getLiquidityLevel(event.liquidity);

  const quality = useMemo(() => calculateEventQualityScore({
    liquidity: event.liquidity,
    volume: event.volume,
    volume24hr: event.volume24hr,
    endDate: event.endDate,
    marketCount: event.marketCount,
    smartMoneyCount: event.smartMoneyCount,
    smartMoneySentiment: event.smartMoneySentiment,
  }), [event]);

  const handleAdd = (m: Market, s: "YES" | "NO", e: React.MouseEvent) => {
    e.stopPropagation();
    const id = `${m.id}-${s}`;
    if (getMarketSide(m.id) === s) { removeLeg(id); return; }
    addLeg({
      id, marketId: m.id,
      tokenId: s === "YES" ? m.yesTokenId : m.noTokenId,
      question: m.question, outcome: s,
      price: s === "YES" ? m.yesPrice : m.noPrice,
      side: s, category: event.category,
      endDate: m.endDate, liquidity: m.liquidity,
    });
  };

  return (
    <div className="card overflow-hidden animate-fade-in border-none hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Featured badge for high-volume events */}
      {event.volume24hr > 100000 && (
        <div className="bg-gradient-to-r from-warn/10 to-transparent border-b border-warn/10 px-4 py-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-pill bg-warning animate-pulse" />
          <span className="text-[10px] font-bold text-warning-dark uppercase tracking-wider">Trending — ${formatVolume(event.volume24hr)} vol</span>
        </div>
      )}

      {/* Event header — clickable link to event detail */}
      <div role="button" tabIndex={0} className="flex items-start gap-4 p-4 pb-3 cursor-pointer group/header"
        onClick={() => router.push(`/event/${event.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/event/${event.id}`); } }}>
        {event.imageUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-1 ring-1 ring-stroke shadow-sm">
            <Image unoptimized src={event.imageUrl} alt={event.title} width={48} height={48} className="w-full h-full object-cover transition-transform group-hover/header:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-surface-1 shrink-0 flex items-center justify-center text-xl ring-1 ring-stroke text-text-secondary group-hover/header:text-primary transition-colors">
            {getCategoryIcon(event.category)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-text-primary leading-tight line-clamp-2 mb-2 group-hover/header:text-primary transition-colors">{event.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-surface-1 border border-border-default text-text-secondary uppercase tracking-wider">
              {event.category}
            </span>
            {!isSingle && (
              <span className="text-[10px] font-medium text-text-muted bg-surface-1 px-2 py-0.5 rounded-pill border border-transparent">
                {event.marketCount} markets
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-text-muted font-medium ml-1">
              <span className={cn("w-1.5 h-1.5 rounded-pill", liq === "high" ? "bg-success" : liq === "mid" ? "bg-warning" : "bg-error")} />
              {formatVolume(event.volume)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted font-medium">
              <Timer size={10} /> {timeUntil(new Date(event.endDate))}
            </span>
            <QualityBadge quality={quality} />
            {event.smartMoneyCount && event.smartMoneyCount > 0 && (
              <SmartMoneyBadge count={event.smartMoneyCount} sentiment={event.smartMoneySentiment} compact />
            )}
          </div>
        </div>
      </div>

      {/* Markets list */}
      <div className="px-3 pb-3 space-y-1.5">
        {visibleMarkets.map((m) => {
          const yp = Math.round(m.yesPrice * 100);
          const side = getMarketSide(m.id);
          const inParlay = isMarketInParlay(m.id);

          return (
            <div key={m.id} role="button" tabIndex={0}
              onClick={() => router.push(`/market/${m.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${m.id}`); } }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-card border transition-all cursor-pointer group hover:shadow-sm",
                inParlay
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10"
                  : "bg-white border-border-default hover:border-primary/20"
              )}>
              {/* Market question */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-secondary line-clamp-2 group-hover:text-text-primary transition-colors leading-snug">
                  {m.groupItemTitle || m.question}
                </p>
              </div>

              {/* Probability */}
              <span className={cn(
                "text-sm font-bold font-tabular shrink-0 w-10 text-right",
                yp >= 70 ? "text-success" : yp <= 30 ? "text-error" : "text-text-primary"
              )}>
                {yp}%
              </span>

              {/* Quick Yes/No buttons */}
              <div className="flex gap-1.5 shrink-0">
                <button onClick={(e) => handleAdd(m, "YES", e)}
                  className={cn("px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border",
                    side === "YES"
                      ? "bg-success text-white border-success shadow-sm"
                      : "bg-white border-border-default text-success hover:bg-success/5 hover:border-success/30"
                  )}>Yes</button>
                <button onClick={(e) => handleAdd(m, "NO", e)}
                  className={cn("px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border",
                    side === "NO"
                      ? "bg-error text-white border-error shadow-sm"
                      : "bg-white border-border-default text-error hover:bg-error/5 hover:border-error/30"
                  )}>No</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* "+X more" expander */}
      {activeMarkets.length > INITIAL_SHOW && (
        <div className="px-3 pb-3 pt-0">
          <button onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 rounded-b-card text-xs font-bold text-text-muted hover:text-primary hover:bg-surface-1 border-t border-border-default hover:border-primary/20 transition-all flex items-center justify-center gap-1 group">
            {expanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> +{hiddenCount} more markets</>}
          </button>
        </div>
      )}

      {totalHiddenCount > 0 && !expanded && (
        <div className="px-4 pb-3 text-[9px] text-text-muted opacity-60">
          + {totalHiddenCount} markets outside 7-93% range hidden
        </div>
      )}

      {/* Combo bet CTA for multi-market events */}
      {event.markets.length >= 2 && (
        <div className="mx-3 mb-3 p-2.5 bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-card">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-5 h-5 rounded-pill bg-primary/10 flex items-center justify-center text-[10px] shrink-0 text-primary">
              <Target size={12} strokeWidth={2.5} />
            </span>
            <p className="text-primary font-medium flex-1 leading-snug">
              Combo {event.markets.length} markets → <span className="font-bold">{
                event.markets.reduce((mult: number, m: Market) => mult * (1 / Math.min(m.yesPrice, m.noPrice)), 1).toFixed(0)
              }x</span> payout
            </p>
            <button onClick={() => router.push(`/event/${event.id}`)}
              className="text-[10px] font-bold text-white bg-primary hover:bg-primary-hover px-2 py-1 rounded-pill shadow-sm transition-all">
              Build Parlay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
