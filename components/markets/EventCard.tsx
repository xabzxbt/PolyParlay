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
import { ChevronDown, ChevronUp, Timer } from "lucide-react";

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
    return event.markets.filter(m => isActiveMarket(m, now) && m.yesPrice > 0 && m.noPrice > 0);
  }, [event.markets]);

  const visibleMarkets = expanded ? activeMarkets : activeMarkets.slice(0, INITIAL_SHOW);
  const hiddenCount = activeMarkets.length - INITIAL_SHOW;
  const totalHiddenCount = event.markets.length - activeMarkets.length;
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
    <div
      className="card card-animate card-hover overflow-hidden animate-card-appear"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Trending badge */}
      {event.volume24hr > 100000 && (
        <div
          className="px-4 py-1.5 flex items-center gap-1.5"
          style={{
            borderBottom: '1px solid rgba(184,150,90,0.15)',
            backgroundColor: 'rgba(184,150,90,0.06)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-gold)' }} />
          <span
            className="font-mono text-[10px] font-medium tracking-widest uppercase"
            style={{ color: 'var(--accent-gold)' }}
          >
            Trending — ${formatVolume(event.volume24hr)} vol
          </span>
        </div>
      )}

      {/* Event header */}
      <div
        role="button"
        tabIndex={0}
        className="flex items-start gap-4 p-4 pb-3 cursor-pointer group/header"
        onClick={() => router.push(`/event/${event.id}`)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/event/${event.id}`); } }}
      >
        {event.imageUrl ? (
          <div
            className="w-11 h-11 rounded-lg overflow-hidden shrink-0"
            style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <Image
              unoptimized
              src={event.imageUrl}
              alt={event.title}
              width={44}
              height={44}
              className="w-full h-full object-cover transition-transform group-hover/header:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div
            className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center text-lg"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {getCategoryIcon(event.category)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 mb-2 transition-colors group-hover/header:underline decoration-1 underline-offset-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '15px' }}
          >
            {event.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category pill */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {event.category}
            </span>
            {!isSingle && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}
              >
                {event.marketCount} markets
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: liq === 'high' ? 'var(--accent-green)' : liq === 'mid' ? 'var(--accent-gold)' : 'var(--accent-red)'
                }}
              />
              {formatVolume(event.volume)}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
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
          const rawYp = m.yesPrice > 0 ? m.yesPrice * 100 : 0;
          const yp = Math.round(rawYp);
          const ypLabel = rawYp > 0 && rawYp < 0.5 ? '<1%' : `${yp}%`;
          const side = getMarketSide(m.id);
          const inParlay = isMarketInParlay(m.id);

          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/market/${m.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${m.id}`); } }}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group"
              style={{
                backgroundColor: inParlay ? 'rgba(156,123,94,0.08)' : 'var(--bg-base)',
                borderColor: inParlay ? 'rgba(156,123,94,0.3)' : 'var(--border-subtle)',
                ...(inParlay ? { boxShadow: '0 0 0 1px rgba(156,123,94,0.15)' } : {}),
              }}
            >
              {/* Market question */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium line-clamp-2 leading-snug transition-colors group-hover:underline decoration-1 underline-offset-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {m.groupItemTitle || m.question}
                </p>
              </div>

              {/* Probability bar + value */}
              <div className="shrink-0 flex flex-col items-end gap-1 w-12">
                <span
                  className="text-sm font-bold font-tabular"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: yp >= 70 ? 'var(--accent-green)' : yp <= 30 ? 'var(--accent-red)' : 'var(--text-primary)',
                  }}
                >
                  {ypLabel}
                </span>
                <div className="prob-bar w-10">
                  <div className="prob-fill" style={{ width: `${Math.max(yp, rawYp > 0 ? 2 : 0)}%` }} />
                </div>
              </div>

              {/* YES/NO buttons */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={(e) => handleAdd(m, "YES", e)}
                  className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all"
                  style={{
                    backgroundColor: side === "YES" ? '#166534' : 'var(--accent-green)',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 4px rgba(21,128,61,0.3)',
                    outline: side === "YES" ? '2px solid #166534' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={(e) => handleAdd(m, "NO", e)}
                  className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all"
                  style={{
                    backgroundColor: side === "NO" ? '#991b1b' : 'var(--accent-red)',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 4px rgba(185,28,28,0.3)',
                    outline: side === "NO" ? '2px solid #991b1b' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  No
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* "+X more" expander */}
      {activeMarkets.length > INITIAL_SHOW && (
        <div className="px-3 pb-3 pt-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 rounded-b-xl text-xs font-medium transition-all flex items-center justify-center gap-1"
            style={{
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-mocha)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            {expanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> +{hiddenCount} more markets</>}
          </button>
        </div>
      )}



      {/* Build Parlay CTA */}
      {activeMarkets.length >= 2 && (
        <div
          className="mx-3 mb-3 p-3 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(156,123,94,0.08) 0%, rgba(184,150,90,0.05) 100%)',
            border: '1px solid rgba(156,123,94,0.15)',
          }}
        >
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>
              Combine {activeMarkets.length} markets →{' '}
              <span
                className="font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', fontSize: '13px' }}
              >
                {(() => {
                  const raw = activeMarkets.reduce((mult: number, m: Market) => {
                    const minP = Math.min(Math.max(m.yesPrice || 0.01, 0.001), Math.max(m.noPrice || 0.01, 0.001));
                    return mult * (1 / minP);
                  }, 1);
                  return raw > 9999 ? '>9,999x' : `${Math.round(raw).toLocaleString()}x`;
                })()}
              </span>
              {' '}payout
            </div>
            <button
              onClick={() => router.push(`/event/${event.id}`)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-98"
              style={{
                backgroundColor: 'var(--accent-mocha)',
                color: 'var(--text-inverse)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-mocha-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-mocha)'; }}
            >
              Build Parlay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
