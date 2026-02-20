"use client";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useMemo, useEffect, useCallback } from "react";
import { cn, formatVolume, timeUntil, getCategoryIcon, getCategoryColor, getLiquidityLevel } from "@/lib/utils";
import { useParlay } from "@/providers/ParlayProvider";
import { useEventDetail } from "@/hooks/useMarketData";
import { calculateEventQualityScore } from "@/lib/quality-score";
import QualityBadge from "@/components/markets/QualityBadge";
import { isActiveMarket } from "@/lib/filters";
import {
  ArrowLeft, Share2, Timer, TrendingUp, BarChart2, PieChart, Info,
  RefreshCw, Star, Activity, ArrowUpRight, ArrowDownRight, Copy, MousePointerClick,
  TrendingDown, DollarSign, Waves
} from "lucide-react";

interface EventAnalytics {
  totalVolume: number;
  totalLiquidity: number;
  activeMarketsCount: number;
  totalMarkets: number;
  whaleFlow: "bullish" | "bearish" | "neutral";
  flowPercent: number;
  mostActiveMarket: { question: string; volume: number } | null;
  marketAnalytics: any[];
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { event, isLoading, error } = useEventDetail(id);
  const { addLeg, removeLeg, isMarketInParlay, getMarketSide, state: parlayState, setStake } = useParlay();

  // Event analytics state
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Fetch event-level smart money analytics
  useEffect(() => {
    if (!id) return;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const res = await fetch(`/api/smart-money?type=event&id=${id}`);
        const data = await res.json();
        if (data.success && data.analytics) {
          setAnalytics(data.analytics);
        } else {
          setAnalyticsError(data.error || "Failed to load analytics");
        }
      } catch (err) {
        setAnalyticsError("Failed to load analytics");
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [id]);

  const quality = useMemo(() => {
    if (!event) return null;
    return calculateEventQualityScore({
      liquidity: event.liquidity, volume: event.volume, volume24hr: event.volume24hr,
      endDate: event.endDate, marketCount: event.marketCount,
    });
  }, [event]);

  const handleAdd = (m: any, s: "YES" | "NO") => {
    const legId = `${m.id}-${s}`;
    if (getMarketSide(m.id) === s) { removeLeg(legId); return; }
    addLeg({
      id: legId, marketId: m.id,
      tokenId: s === "YES" ? m.yesTokenId : m.noTokenId,
      question: m.question, outcome: s,
      price: s === "YES" ? m.yesPrice : m.noPrice,
      side: s, category: event?.category || "other",
      endDate: m.endDate, liquidity: m.liquidity,
    });
  };

  // Loading
  if (isLoading) {
    return (
      <div className="max-w-container mx-auto px-4 py-8">
        <div className="shimmer h-6 w-32 mb-4 rounded" />
        <div className="shimmer h-12 w-3/4 mb-3 rounded" />
        <div className="shimmer h-4 w-48 mb-8 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="shimmer h-24 rounded-card" />)}
          </div>
          <div className="shimmer h-64 rounded-card" />
        </div>
      </div>
    );
  }

  // Not found
  if (!event) {
    return (
      <div className="max-w-container mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-surface-2 border border-border-default rounded-pill mx-auto flex items-center justify-center mb-4 text-text-muted">
          <Info size={32} />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Event not found</h2>
        <p className="text-sm text-text-muted mb-6">This event doesn&apos;t exist or has been removed.</p>
        <button onClick={() => router.push("/")} className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-sm flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Back to Markets
        </button>
      </div>
    );
  }

  const liq = getLiquidityLevel(event.liquidity);
  const catColor = getCategoryColor(event.category);

  return (
    <div className="max-w-container mx-auto px-4 py-6 font-sans">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
        <button onClick={() => router.push("/")} className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Markets
        </button>
        <span className="text-text-disabled">/</span>
        <span className="text-text-secondary truncate max-w-[200px] font-medium">{event.title.slice(0, 50)}</span>
      </div>

      {/* Event header */}
      <div className="flex items-start gap-4 mb-3">
        {event.imageUrl ? (
          <div className="w-16 h-16 rounded-card overflow-hidden bg-surface-2 ring-1 ring-stroke shadow-sm shrink-0">
            <Image unoptimized src={event.imageUrl} alt={event.title} width={64} height={64} className="w-full h-full object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }} />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-card bg-surface-2 shrink-0 flex items-center justify-center text-3xl ring-1 ring-stroke text-text-secondary shadow-sm">
            {getCategoryIcon(event.category)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight mb-3 tracking-tight">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-surface-2 border border-border-default text-text-secondary uppercase tracking-wider">
              {event.category}
            </span>
            <span className="text-[10px] font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded-pill border border-border-default/50">
              {event.marketCount} market{event.marketCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-text-muted font-medium ml-1">
              <span className={cn("w-1.5 h-1.5 rounded-pill", liq === "high" ? "bg-success" : liq === "mid" ? "bg-warning" : "bg-error")} />
              {formatVolume(event.liquidity)} Liq
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted font-medium">
              <Timer size={12} /> {timeUntil(new Date(event.endDate))}
            </span>
            {quality && <QualityBadge quality={quality} showScore />}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-8 py-5 mb-6 border-b border-border-default">
        {[
          { label: "Total Volume", value: formatVolume(event.volume), icon: <Activity size={14} /> },
          { label: "24h Volume", value: formatVolume(event.volume24hr), icon: <TrendingUp size={14} /> },
          { label: "Liquidity", value: formatVolume(event.liquidity), icon: <PieChart size={14} /> },
          { label: "Markets", value: String(event.marketCount), icon: <BarChart2 size={14} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
              {icon} {label}
            </div>
            <div className="text-xl font-bold font-tabular text-text-primary tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      {/* Smart Money Analytics Cards */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer h-24 rounded-card" />
          ))}
        </div>
      ) : analyticsError ? (
        <div className="bg-surface-2 border border-border-default rounded-card p-4 mb-8 text-center">
          <p className="text-xs text-text-muted">{analyticsError}</p>
        </div>
      ) : analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Volume Card */}
          <div className="bg-white border border-border-default rounded-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
              <DollarSign size={14} className="text-primary" /> Smart Money Volume
            </div>
            <div className="text-2xl font-bold font-tabular text-text-primary tracking-tight">
              {formatVolume(analytics.totalVolume)}
            </div>
            <div className="text-[10px] text-text-muted mt-1">Total across all markets</div>
          </div>

          {/* Whale Flow Card */}
          <div className="bg-white border border-border-default rounded-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
              {analytics.whaleFlow === "bullish" ? <TrendingUp size={14} className="text-success" /> :
                analytics.whaleFlow === "bearish" ? <TrendingDown size={14} className="text-error" /> :
                  <Activity size={14} className="text-text-muted" />} Whale Flow
            </div>
            <div className="flex items-center gap-2">
              {analytics.whaleFlow === "bullish" ? (
                <TrendingUp size={24} className="text-success" />
              ) : analytics.whaleFlow === "bearish" ? (
                <TrendingDown size={24} className="text-error" />
              ) : (
                <Activity size={24} className="text-text-muted" />
              )}
              <span className={`text-2xl font-bold font-tabular tracking-tight ${analytics.whaleFlow === "bullish" ? "text-success" :
                analytics.whaleFlow === "bearish" ? "text-error" : "text-text-muted"
                }`}>
                {analytics.whaleFlow === "bullish" ? "Bullish" :
                  analytics.whaleFlow === "bearish" ? "Bearish" : "Neutral"}
              </span>
            </div>
            <div className="text-[10px] text-text-muted mt-1">{analytics.flowPercent}% flow difference</div>
          </div>

          {/* Active Markets Card */}
          <div className="bg-white border border-border-default rounded-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
              <Activity size={14} className="text-primary" /> Active Markets
            </div>
            <div className="text-2xl font-bold font-tabular text-text-primary tracking-tight">
              {analytics.activeMarketsCount}
              <span className="text-sm font-normal text-text-muted"> / {analytics.totalMarkets}</span>
            </div>
            <div className="text-[10px] text-text-muted mt-1">markets trading now</div>
          </div>

          {/* Most Active Market Card */}
          <div className="bg-white border border-border-default rounded-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
              <Star size={14} className="text-primary" /> Top Market
            </div>
            {analytics.mostActiveMarket ? (
              <>
                <div className="text-sm font-bold text-text-primary line-clamp-2 leading-tight">
                  {analytics.mostActiveMarket.question}
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {formatVolume(analytics.mostActiveMarket.volume)} volume
                </div>
              </>
            ) : (
              <div className="text-sm text-text-muted">No active markets</div>
            )}
          </div>
        </div>
      )}

      {/* === ALL SECTIONS ON ONE PAGE === */}
      <div className="space-y-8">
        {/* Markets section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-text-primary">Markets</h2>
            <span className="text-xs text-text-muted font-medium bg-surface-2 px-2 py-0.5 rounded-pill border border-border-default">
              {event.marketCount}
            </span>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex items-center gap-2.5 text-xs font-medium text-primary">
            <MousePointerClick size={16} />
            <span>Click on any market below to view detailed analytics and trade history.</span>
          </div>

          <MarketsTab
            markets={event.markets}
            onAdd={handleAdd}
            isMarketInParlay={isMarketInParlay}
            getMarketSide={getMarketSide}
            router={router}
          />
        </section>

        {/* 
          NOTE: Using event.markets from useEventDetail hook instead of 
          /api/events/:id/markets endpoint. 
          
          Reason: The event detail hook already fetches all event data including markets
          in a single API call. Using the dedicated /markets endpoint would require
          an additional HTTP request, adding latency without benefit.
          
          The /api/events/:id/markets endpoint is useful when:
          - You only need markets without full event details
          - You want server-side filtering (active_only parameter)
          - You're building a separate markets list page
          
          For the event detail page, the current approach is optimal.
        */}



        {/* Overview / Description */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {event.description && (
              <div className="bg-white rounded-card border border-border-default p-5 shadow-sm">
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                  <Info size={16} className="text-primary" /> About this event
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{event.description}</p>
              </div>
            )}
            {event.tags && event.tags.length > 0 && (
              <div className="bg-white rounded-card border border-border-default p-5 shadow-sm">
                <h3 className="text-sm font-bold text-text-primary mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: any) => (
                    <span key={tag.id} className="text-xs font-medium bg-surface-2 px-2.5 py-1 rounded-pill text-text-secondary hover:text-primary border border-border-default transition-colors cursor-default">
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-primary/5 rounded-card border border-primary/10 p-5 text-center">
              <h3 className="text-sm font-bold text-primary mb-2">Share this event</h3>
              <p className="text-xs text-text-secondary mb-4">Earn rewards when your friends trade.</p>
              <button onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/event/${id}?ref=share`);
              }} className="w-full px-4 py-2.5 bg-white border border-border-default rounded-button text-xs font-bold text-text-primary hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2 shadow-sm active:translate-y-px">
                <Copy size={14} /> Copy Link
              </button>
            </div>
          </div>
        </section>
      </div >
    </div >
  );
}

// === Section Components ===

function MarketsTab({ markets, onAdd, isMarketInParlay, getMarketSide, router }: {
  markets: any[]; onAdd: (m: any, s: "YES" | "NO") => void;
  isMarketInParlay: (id: string) => boolean; getMarketSide: (id: string) => string | null;
  router: any;
}) {
  const now = new Date();
  const activeMarkets = markets.filter((m: any) => isActiveMarket(m, now));

  const sortedMarkets = [...activeMarkets].sort((a: any, b: any) => (b.volume24hr || b.volume || 0) - (a.volume24hr || a.volume || 0));
  const hiddenCount = markets.length - activeMarkets.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
        {sortedMarkets.length === 0 && (
          <div className="py-12 text-center col-span-full bg-white rounded-card border border-border-default border-dashed">
            <Info className="mx-auto text-text-disabled mb-2" />
            <p className="text-sm text-text-muted font-medium">All markets in this event have ended or been resolved.</p>
          </div>
        )}
        {sortedMarkets.map((m: any) => {
          const yp = Math.round(m.yesPrice * 100);
          const np = 100 - yp;
          const side = getMarketSide(m.id);
          const inParlay = isMarketInParlay(m.id);

          return (
            <div key={m.id} role="button" tabIndex={0}
              className={cn(
                "group relative p-4 rounded-card border transition-all cursor-pointer hover:shadow-elevated-hover",
                inParlay
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10"
                  : "bg-white border-border-default hover:border-primary/30"
              )}
              onClick={() => router.push(`/market/${m.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${m.id}`); } }}>

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-text-primary leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                    {m.groupItemTitle || m.question}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted font-medium">
                    <span className="flex items-center gap-1"><Activity size={10} /> Vol: {formatVolume(m.volume)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Timer size={10} /> {timeUntil(new Date(m.endDate))}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-lg font-bold font-tabular leading-none",
                    yp >= 60 ? "text-success" : yp <= 40 ? "text-error" : "text-text-primary"
                  )}>{yp}%</div>
                  <div className="text-[9px] text-text-muted mt-1 font-medium">Prob. Yes</div>
                </div>
              </div>

              {/* Probability bar - ultra thin */}
              <div className="h-1 rounded-pill bg-surface-2 overflow-hidden flex mb-3.5">
                <div className="h-full bg-success" style={{ width: `${yp}%` }} />
                <div className="h-full bg-error" style={{ width: `${np}%` }} />
              </div>

              {/* Action buttons - compact */}
              <div role="group" className="flex gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button onClick={() => onAdd(m, "YES")}
                  className={cn("flex-1 py-1.5 px-3 rounded-button text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm",
                    side === "YES"
                      ? "bg-success text-white border-success"
                      : "bg-white text-success border-border-default hover:bg-success/5 hover:border-success/30"
                  )}>
                  Yes {yp}¢
                </button>
                <button onClick={() => onAdd(m, "NO")}
                  className={cn("flex-1 py-1.5 px-3 rounded-button text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm",
                    side === "NO"
                      ? "bg-error text-white border-error"
                      : "bg-white text-error border-border-default hover:bg-error/5 hover:border-error/30"
                  )}>
                  No {np}¢
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="text-center pt-2 pb-4">
          <p className="text-[10px] text-text-secondary bg-surface-2 inline-block px-3 py-1.5 rounded-pill border border-border-default font-medium">
            Showing {activeMarkets.length} active markets.
            <span className="opacity-70 ml-1 text-text-muted">
              ({hiddenCount} hidden: resolved, closed, or &lt;7% chance)
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// === Analytics Tab — Per-market analysis with market selector ===
async function fetchMarketAnalytics(market: any, signal: AbortSignal) {
  const mkt = {
    id: market.id,
    yesTokenId: market.yesTokenId || "",
    noTokenId: market.noTokenId || "",
    yesPrice: market.yesPrice || 0.5,
    question: market.groupItemTitle || market.question,
    conditionId: market.conditionId || "",
  };

  const [analyticsRes, positionsRes, tradersRes] = await Promise.allSettled([
    fetch(`/api/smart-money?type=market&yes_token=${mkt.yesTokenId}&no_token=${mkt.noTokenId}`, { signal }).then(r => r.json()),
    fetch(`/api/smart-positions?yes_token=${mkt.yesTokenId}&no_token=${mkt.noTokenId}&yes_price=${mkt.yesPrice}&condition_id=${mkt.conditionId}`, { signal }).then(r => r.json()),
    fetch(`/api/market-traders?yes_token=${mkt.yesTokenId}&no_token=${mkt.noTokenId}&yes_price=${mkt.yesPrice}`, { signal }).then(r => r.json()),
  ]);

  return {
    analytics: analyticsRes.status === "fulfilled" && analyticsRes.value.success ? analyticsRes.value.analytics : null,
    smartPositions: positionsRes.status === "fulfilled" && positionsRes.value.success ? positionsRes.value : null,
    marketTraders: tradersRes.status === "fulfilled" && tradersRes.value.success ? tradersRes.value : null,
  };
}

function UnifiedAnalyticsTab({ event }: { event: any }) {
  const now = new Date();
  const markets = (event?.markets || []).filter((m: any) => isActiveMarket(m, now));

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [smartPositions, setSmartPositions] = useState<any>(null);
  const [marketTraders, setMarketTraders] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedMarket = markets[selectedIdx] || markets[0];

  useEffect(() => {
    if (!selectedMarket) { setIsLoading(false); return; }
    setAnalytics(null);
    setSmartPositions(null);
    setMarketTraders(null);
    setIsLoading(true);

    const controller = new AbortController();

    fetchMarketAnalytics(selectedMarket, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setAnalytics(result.analytics);
        setSmartPositions(result.smartPositions);
        setMarketTraders(result.marketTraders);
      })
      .catch((e: any) => {
        if (e?.name !== 'AbortError') {
          console.warn("Analytics fetch error:", e);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [selectedMarket]);

  const fetchForMarket = useCallback(async () => {
    if (!selectedMarket) return;
    setIsRefreshing(true);
    try {
      const result = await fetchMarketAnalytics(selectedMarket, new AbortController().signal);
      setAnalytics(result.analytics);
      setSmartPositions(result.smartPositions);
      setMarketTraders(result.marketTraders);
    } catch (e) {
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedMarket]);

  if (!selectedMarket) {
    return (
      <div className="bg-white rounded-card border border-border-default p-8 text-center shadow-sm">
        <div className="text-sm text-text-muted">No active markets to analyze</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── MARKET SELECTOR ── */}
      {markets.length > 1 && (
        <div className="bg-white rounded-card border border-border-default p-4 shadow-sm">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
            <PieChart size={12} /> Analyzing market
          </div>
          <div className="flex flex-wrap gap-2">
            {markets.map((m: any, i: number) => {
              const yp = Math.round((m.yesPrice || 0.5) * 100);
              return (
                <button key={m.id} onClick={() => setSelectedIdx(i)}
                  className={cn(
                    "px-3 py-2 text-[10px] font-bold transition-all border rounded-button shadow-sm active:translate-y-px",
                    selectedIdx === i
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-surface-2 text-text-secondary border-border-default hover:text-text-primary hover:border-primary/20"
                  )}>
                  <span className="truncate max-w-[160px] inline-block align-bottom leading-none mb-0.5">
                    {m.groupItemTitle || m.question}
                  </span>
                  <span className={cn("ml-1.5 font-mono", selectedIdx === i ? "opacity-100" : "opacity-60")}>{yp}¢</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-card" />
          ))}
        </div>
      ) : (
        <MarketAnalytics
          market={selectedMarket}
          event={event}
          analytics={analytics}
          smartPositions={smartPositions}
          marketTraders={marketTraders}
          onRefresh={fetchForMarket}
          isRefreshing={isRefreshing}
        />
      )}
    </div>
  );
}

function MarketAnalytics({ market, event, analytics, smartPositions, marketTraders, onRefresh, isRefreshing }: {
  market: any; event: any; analytics: any; smartPositions: any; marketTraders: any;
  onRefresh: () => void; isRefreshing: boolean;
}) {
  const [smartTab, setSmartTab] = useState<"overview" | "positions" | "trades" | "watchlist">("overview");
  const yesPrice = market.yesPrice || 0.5;
  const yp = Math.round(yesPrice * 100);
  const np = 100 - yp;

  // Watchlist Logic
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  useEffect(() => {
    const saved = localStorage.getItem("poly_watchlist");
    if (saved) { try { setWatchlist(new Set(JSON.parse(saved))); } catch { } }
  }, []);
  const toggleWatch = (address: string) => {
    const next = new Set(watchlist);
    if (next.has(address)) next.delete(address);
    else next.add(address);
    setWatchlist(next);
    localStorage.setItem("poly_watchlist", JSON.stringify(Array.from(next)));
  };

  const a = analytics;
  const traderSummary = marketTraders?.summary || {};
  const sp = smartPositions;

  const allTraders = useMemo(() => {
    if (!smartPositions) return [];
    const all = [...(smartPositions.yesPositions || []), ...(smartPositions.noPositions || [])];
    if (smartPositions.whales) all.push(...smartPositions.whales);
    return Array.from(new Map(all.map((item: any) => [item.address, item])).values());
  }, [smartPositions]);

  const sharpTraders = useMemo(() => {
    return allTraders.filter((p: any) => p.pnl != null && p.pnl > 0).sort((a: any, b: any) => b.pnl - a.pnl).slice(0, 15);
  }, [allTraders]);

  const dumbMoney = useMemo(() => {
    return allTraders.filter((p: any) => p.pnl != null && p.pnl < 0).sort((a: any, b: any) => a.pnl - b.pnl).slice(0, 15);
  }, [allTraders]);

  const tabDefs = [
    { id: "overview" as const, label: "Overview" },
    { id: "positions" as const, label: "Positions" },
    { id: "trades" as const, label: "Trades" },
    { id: "watchlist" as const, label: "Watchlist" },
  ];

  const [tradesPage, setTradesPage] = useState(0);
  const tradesPerPage = 20;
  const [posPage, setPosPage] = useState(0);
  const posPerPage = 10;

  const fmtPnl = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v.toFixed(0)}`;
  };
  const fmtSize = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

  return (
    <>
      {/* ── TAB NAV ── */}
      <div className="flex items-center gap-1 border-b border-border-default mb-6 overflow-x-auto">
        {tabDefs.map(t => (
          <button key={t.id} onClick={() => setSmartTab(t.id)}
            className={cn(
              "px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
              smartTab === t.id
                ? "text-primary border-primary bg-primary/5"
                : "text-text-muted border-transparent hover:text-text-primary hover:bg-surface-2"
            )}>
            {t.label}
          </button>
        ))}
        {smartPositions && (
          <div className="ml-auto flex items-center gap-2 pl-4">
            <button onClick={onRefresh} disabled={isRefreshing}
              className="px-3 py-1.5 text-[10px] font-bold bg-white border border-border-default rounded-button hover:bg-surface-2 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:translate-y-px">
              {isRefreshing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              <span>Refresh</span>
            </button>
            <span className="text-[9px] text-text-disabled font-mono hidden sm:inline">
              {new Date(smartPositions.fetchedAt || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Removing QuantDashboard as it was deleted */}

      {!smartPositions ? (
        <div className="p-12 text-center text-sm text-text-muted bg-white rounded-card border border-border-default border-dashed">
          Loading market analytics...
        </div>
      ) : smartPositions.totalTrades === 0 ? (
        <div className="p-12 text-center bg-white rounded-card border border-border-default">
          <p className="text-sm font-bold text-text-primary mb-1">No trades found on this market yet</p>
          <p className="text-xs text-text-muted">Be the first to trade!</p>
        </div>
      ) : (
        <>
          {smartTab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <BarChart2 size={18} /> Market Summary
              </h2>

              {/* Activity graph removed */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-primary mb-1">Current Prices</div>
                  <div className="text-[10px] text-text-muted mb-4">Price per share for each outcome</div>
                  <div className="space-y-4">
                    {[
                      { label: "Yes", val: yp, color: "bg-success", textColor: "text-success" },
                      { label: "No", val: np, color: "bg-error", textColor: "text-error" }
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-[11px] font-bold mb-1.5">
                          <span className={item.textColor}>{item.label}</span>
                          <span className="text-text-primary font-mono">{item.val}¢</span>
                        </div>
                        <div className="h-4 rounded-pill bg-surface-2 overflow-hidden">
                          <div className={cn("h-full rounded-pill opacity-80", item.color)} style={{ width: `${item.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-primary mb-1">Volume Split</div>
                  <div className="text-[10px] text-text-muted mb-4">Total volume traded</div>
                  {(() => {
                    const yVol = smartPositions.totalYesUsd || 0;
                    const nVol = smartPositions.totalNoUsd || 0;
                    const maxVol = Math.max(yVol, nVol, 1);
                    return (
                      <div className="space-y-4">
                        {[
                          { label: "Yes", val: yVol, color: "bg-success", textColor: "text-success" },
                          { label: "No", val: nVol, color: "bg-error", textColor: "text-error" }
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex justify-between text-[11px] font-bold mb-1.5">
                              <span className={item.textColor}>{item.label}</span>
                              <span className="text-text-primary font-mono">${item.val.toLocaleString()}</span>
                            </div>
                            <div className="h-4 rounded-pill bg-surface-2 overflow-hidden">
                              <div className={cn("h-full rounded-pill opacity-80", item.color)} style={{ width: `${(item.val / maxVol) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-primary mb-1">Open Interest</div>
                  <div className="text-[10px] text-text-muted mb-4">Total shares held</div>
                  {(() => {
                    const yOI = smartPositions.totalYesShares || 0;
                    const nOI = smartPositions.totalNoShares || 0;
                    const maxOI = Math.max(yOI, nOI, 1);
                    return (
                      <div className="space-y-4">
                        {[
                          { label: `Yes (${smartPositions.yesWallets} traders)`, val: yOI, color: "bg-success", textColor: "text-success" },
                          { label: `No (${smartPositions.noWallets} traders)`, val: nOI, color: "bg-error", textColor: "text-error" }
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex justify-between text-[11px] font-bold mb-1.5">
                              <span className={item.textColor}>{item.label}</span>
                              <span className="text-text-primary font-mono">{fmtSize(item.val)}</span>
                            </div>
                            <div className="h-4 rounded-pill bg-surface-2 overflow-hidden">
                              <div className={cn("h-full rounded-pill opacity-80", item.color)} style={{ width: `${(item.val / maxOI) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mt-8">
                <ArrowUpRight size={18} className="text-success" /> Winners & Losers
              </h2>
              <div className="text-[10px] text-text-muted -mt-5 mb-4">Estimates based on this market activity</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top 10 Winners */}
                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-text-primary">Top 10 Winners</div>
                  </div>
                  <div className="text-[9px] text-text-muted mb-3">Largest estimated unrealized profits (this market)</div>
                  {sharpTraders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-1 rounded-md border border-dashed border-border-default/50">
                      <div className="text-2xl mb-1">🌊</div>
                      <div className="text-[10px] font-bold text-text-primary">No winners found yet</div>
                      <div className="text-[9px] text-text-muted max-w-[150px]">Be the first to profit on this market!</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {sharpTraders.slice(0, 10).map((p: any) => {
                        const maxPnl = sharpTraders[0]?.pnl || 1;
                        const pct = Math.max(3, (p.pnl / maxPnl) * 100);
                        return (
                          <div key={p.address} className="flex items-center gap-2">
                            <a href={p.profileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline truncate min-w-[70px] max-w-[90px]">
                              {p.name}
                            </a>
                            <div className="flex-1 h-5 rounded bg-surface-3 overflow-hidden relative">
                              <div className="h-full bg-success rounded transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-success font-bold min-w-[60px] text-right">
                              +{fmtPnl(p.pnl)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top 10 Losers */}
                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-text-primary">Top 10 Losers</div>
                  </div>
                  <div className="text-[9px] text-text-muted mb-3">Largest estimated unrealized losses (this market)</div>
                  {dumbMoney.length === 0 ? (
                    <div className="text-[10px] text-text-disabled text-center py-6">No losing traders found</div>
                  ) : (
                    <div className="space-y-1.5">
                      {dumbMoney.slice(0, 10).map((p: any) => {
                        const maxLoss = Math.abs(dumbMoney[0]?.pnl || 1);
                        const pct = Math.max(3, (Math.abs(p.pnl) / maxLoss) * 100);
                        return (
                          <div key={p.address} className="flex items-center gap-2">
                            <a href={p.profileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline truncate min-w-[70px] max-w-[90px]">
                              {p.name}
                            </a>
                            <div className="flex-1 h-5 rounded bg-surface-3 overflow-hidden relative">
                              <div className="h-full bg-error rounded transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-error font-bold min-w-[60px] text-right">
                              -{fmtPnl(Math.abs(p.pnl))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Largest Holders (ADDED) ── */}
              <h2 className="text-lg font-bold text-text-primary mt-6">Largest Holders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* YES Holders */}
                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-primary mb-0.5">Yes Holders</div>
                  <div className="text-[9px] text-text-muted mb-3">
                    Total Shares: {fmtSize(smartPositions.totalYesShares)} · Unique Traders: {smartPositions.yesWallets}
                  </div>
                  {smartPositions.yesPositions.length === 0 ? (
                    <div className="text-[10px] text-text-disabled text-center py-6">No YES holders</div>
                  ) : (
                    <div className="space-y-1.5">
                      {smartPositions.yesPositions.slice(0, 10).map((p: any) => {
                        const maxShares = smartPositions.yesPositions[0]?.shares || 1;
                        const pct = Math.max(3, (p.shares / maxShares) * 100);
                        return (
                          <div key={p.address} className="flex items-center gap-2">
                            <a href={p.profileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline truncate min-w-[70px] max-w-[90px]">
                              {p.name}
                            </a>
                            <div className="flex-1 h-5 rounded bg-surface-3 overflow-hidden">
                              <div className="h-full bg-success/60 rounded" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-text-primary min-w-[50px] text-right">
                              {fmtSize(p.shares)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* NO Holders */}
                <div className="rounded-card bg-white border border-border-default p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-primary mb-0.5">No Holders</div>
                  <div className="text-[9px] text-text-muted mb-3">
                    Total Shares: {fmtSize(smartPositions.totalNoShares)} · Unique Traders: {smartPositions.noWallets}
                  </div>
                  {smartPositions.noPositions.length === 0 ? (
                    <div className="text-[10px] text-text-disabled text-center py-6">No NO holders</div>
                  ) : (
                    <div className="space-y-1.5">
                      {smartPositions.noPositions.slice(0, 10).map((p: any) => {
                        const maxShares = smartPositions.noPositions[0]?.shares || 1;
                        const pct = Math.max(3, (p.shares / maxShares) * 100);
                        return (
                          <div key={p.address} className="flex items-center gap-2">
                            <a href={p.profileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline truncate min-w-[70px] max-w-[90px]">
                              {p.name}
                            </a>
                            <div className="flex-1 h-5 rounded bg-surface-3 overflow-hidden">
                              <div className="h-full bg-error/60 rounded" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-text-primary min-w-[50px] text-right">
                              {fmtSize(p.shares)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {smartTab === "positions" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Positions</h2>
              <div className="rounded-card bg-white border border-border-default overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-default bg-surface-2 text-text-secondary text-[10px] uppercase tracking-wider font-bold">
                        <th className="px-4 py-3">Trader</th>
                        <th className="px-4 py-3">Side</th>
                        <th className="px-4 py-3 text-right">Shares</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-right">Est. PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke">
                      {allTraders.sort((a: any, b: any) => Math.abs(b.pnl || 0) - Math.abs(a.pnl || 0))
                        .slice(posPage * posPerPage, (posPage + 1) * posPerPage)
                        .map((p: any) => (
                          <PositionRow key={p.address} p={p} yesPrice={yesPrice} noPrice={1 - yesPrice}
                            fmtPnl={fmtPnl} fmtSize={fmtSize} watchlist={watchlist} toggleWatch={toggleWatch} />
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {smartTab === "trades" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Recent Trades</h2>
              <div className="rounded-card bg-white border border-border-default overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-default bg-surface-2 text-text-secondary text-[10px] uppercase tracking-wider font-bold">
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Trader</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Side</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Shares</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke">
                      {(smartPositions.recentTrades || [])
                        .slice(tradesPage * tradesPerPage, (tradesPage + 1) * tradesPerPage)
                        .map((t: any) => (
                          <TradeRow key={t.id} t={t} fmtSize={fmtSize} />
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {smartTab === "watchlist" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Watchlist</h2>
              {allTraders.filter((p: any) => watchlist.has(p.address)).length === 0 ? (
                <div className="rounded-card bg-white border border-border-default p-12 text-center shadow-sm">
                  <Star size={32} className="mx-auto text-warning mb-3" fill="currentColor" />
                  <p className="text-sm font-bold text-text-primary">Your watchlist is empty for this market</p>
                  <p className="text-xs text-text-muted mt-1">Star traders in the Positions tab to track them here.</p>
                </div>
              ) : (
                <div className="rounded-card bg-white border border-border-default overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-stroke">
                      {allTraders.filter((p: any) => watchlist.has(p.address)).map((p: any) => (
                        <PositionRow key={p.address} p={p} yesPrice={yesPrice} noPrice={1 - yesPrice}
                          fmtPnl={fmtPnl} fmtSize={fmtSize} watchlist={watchlist} toggleWatch={toggleWatch} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

// === Subcomponents ===

function PositionRow({ p, yesPrice, noPrice, fmtPnl, fmtSize, watchlist, toggleWatch }: any) {
  const currentValue = p.shares * (p.side === "YES" ? yesPrice : noPrice);
  const pnlColor = p.pnl > 0 ? "text-success" : p.pnl < 0 ? "text-error" : "text-text-muted";

  return (
    <tr className="hover:bg-surface-1 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.preventDefault(); toggleWatch(p.address); }}
            className={cn("text-sm transition-colors", watchlist.has(p.address) ? "text-warning fill-warn" : "text-stroke hover:text-warning")}>
            <Star size={14} fill={watchlist.has(p.address) ? "currentColor" : "none"} />
          </button>
          <div className="flex items-center gap-2">
            {p.image ? <Image unoptimized src={p.image} alt={p.name} width={20} height={20} className="w-5 h-5 rounded-pill bg-surface-2" onError={(e: any) => { e.currentTarget.style.display = 'none'; }} /> : <div className="w-5 h-5 rounded-pill bg-surface-2 border border-border-default" />}
            <a href={p.profileUrl} target="_blank" className="text-[11px] font-bold text-text-primary hover:text-primary truncate max-w-[120px]">
              {p.name}
            </a>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-pill border",
          p.side === "YES" ? "bg-success/10 text-success border-success/20" : "bg-error/10 text-error border-error/20"
        )}>{p.side}</span>
      </td>
      <td className="px-4 py-3 text-right text-[11px] font-mono text-text-primary">{fmtSize(p.shares)}</td>
      <td className="px-4 py-3 text-right text-[11px] font-mono text-text-primary">${Math.round(currentValue).toLocaleString()}</td>
      <td className="px-4 py-3 text-right">
        {p.pnl != null && p.pnl !== 0 ? (
          <span className={cn("text-[11px] font-mono font-bold", pnlColor)}>
            {p.pnl > 0 ? "+" : ""}{fmtPnl(p.pnl)}
          </span>
        ) : <span className="text-[10px] text-text-disabled font-mono">-</span>}
      </td>
    </tr>
  );
}

function TradeRow({ t, fmtSize }: any) {
  return (
    <tr className="hover:bg-surface-1 transition-colors">
      <td className="px-4 py-2.5 text-[10px] text-text-muted font-mono">
        {t.time ? new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {t.image ? <Image unoptimized src={t.image} alt={t.name} width={16} height={16} className="w-4 h-4 rounded-pill bg-surface-2" onError={(e: any) => { e.currentTarget.style.display = 'none'; }} /> : <div className="w-4 h-4 rounded-pill bg-surface-2" />}
          <a href={`https://polymarket.com/profile/${t.address}`} target="_blank" className="text-[11px] font-bold text-text-primary hover:text-primary truncate max-w-[90px]">
            {t.name}
          </a>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className={cn("text-[10px] font-bold uppercase", t.action === "SELL" ? "text-warning" : "text-success")}>
          {t.action}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className={cn("text-[10px] font-bold", t.side === "YES" ? "text-success" : "text-error")}>{t.side}</span>
      </td>
      <td className="px-4 py-2.5 text-right text-[11px] font-mono text-text-primary">${Math.round(t.usd).toLocaleString()}</td>
      <td className="px-4 py-2.5 text-right text-[11px] font-mono text-text-primary">${t.price.toFixed(2)}</td>
      <td className="px-4 py-2.5 text-right text-[11px] font-mono text-text-muted">{fmtSize(t.shares)}</td>
    </tr>
  );
}
