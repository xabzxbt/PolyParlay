"use client";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { cn, formatVolume, getLiquidityLevel, timeUntil } from "@/lib/utils";
import { useMarket } from "@/hooks/useMarketData";
import { useParlay } from "@/providers/ParlayProvider";
import CommentsSection from "@/components/markets/CommentsSection";
import { Activity } from "lucide-react";
import MarketDepthAnalysis from "@/components/analytics/arkham/MarketDepth";
import PriceProbability from "@/components/analytics/arkham/PriceProbability";
import WhaleFeed from "@/components/analytics/WhaleFeed";
import EdgeScoreCard from "@/components/analytics/EdgeScoreCard";
import OnChainAnalytics from "@/components/analytics/arkham/OnChainAnalytics";
import { useWhaleActivity } from "@/hooks/useWhaleActivity";
import { useEdgeScore } from "@/hooks/useEdgeScore";

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { market, isLoading } = useMarket(id);
  const { addLeg, removeLeg, getMarketSide } = useParlay();
  const side = market ? getMarketSide(market.id) : null;

  const { trades: allWhaleTrades, isLoading: whalesLoading } = useWhaleActivity({ period: "24h" });
  const marketWhaleTrades = useMemo(() => {
    if (!market) return [];
    return allWhaleTrades.filter(t => t.marketId === market.id);
  }, [allWhaleTrades, market]);

  const { marketsWithEdge, isLoading: edgeLoading } = useEdgeScore();
  const marketEdge = useMemo(() => {
    if (!market) return null;
    return marketsWithEdge.find(m => m.id === market.id);
  }, [marketsWithEdge, market]);

  const handleAdd = (s: "YES" | "NO") => {
    if (!market) return;
    const legId = `${market.id}-${s}`;
    if (side === s) { removeLeg(legId); return; }
    addLeg({
      id: legId, marketId: market.id,
      tokenId: s === "YES" ? market.yesTokenId : market.noTokenId,
      question: market.question, outcome: s,
      price: s === "YES" ? market.yesPrice : market.noPrice,
      side: s, category: market.category || "other",
      endDate: market.endDate, liquidity: market.liquidity,
    });
  };



  if (isLoading) {
    return (
      <div className="max-w-container mx-auto px-4 py-8 space-y-4">
        <div className="shimmer h-8 w-64" />
        <div className="shimmer h-12 w-full" />
        <div className="shimmer h-48" />
        <div className="shimmer h-32" />
        <div className="shimmer h-64" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-container mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-text-primary mb-2">Market not found</h2>
        <p className="text-sm text-text-muted mb-6">This market doesn&apos;t exist or has been closed.</p>
        <button onClick={() => router.push("/")} className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-sm">Back to Markets</button>
      </div>
    );
  }

  // Common derived values
  const yesPrice = market.yesPrice || 0.5;
  const noPrice = market.noPrice || 0.5;
  const yp = Math.round(yesPrice * 100);
  const np = 100 - yp;

  // Pagination for positions & trades
  const tradesPerPage = 20;
  const posPerPage = 10;
  // We'll use simple state for pagination here as well, though strictly invalid since we aren't sub-componenting it yet.
  // Actually, we should probably keep them in state.
  return (
    <div className="max-w-container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] text-text-muted mb-4 uppercase tracking-wider">
        <button onClick={() => router.push("/")} className="hover:text-primary transition-colors">Markets</button>
        <span className="text-text-disabled">/</span>
        <span className="text-text-secondary truncate max-w-[300px]">{market.question.slice(0, 60)}...</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold text-text-primary leading-tight mb-2">{market.question}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-text-muted">
              {/* Liquidity Dot */}
              <span className={cn("inline-block w-2 h-2 rounded-pill", getLiquidityLevel(market.liquidity) === "high" ? "bg-success" : getLiquidityLevel(market.liquidity) === "mid" ? "bg-warning" : "bg-error")} />
              {formatVolume(market.liquidity)}
            </span>
            <span className="text-xs text-text-muted">Vol: {formatVolume(market.volume)}</span>
            <span className="text-xs text-text-muted">{timeUntil(new Date(market.endDate))}</span>
          </div>
        </div>

        {/* Betting Buttons */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={() => handleAdd("YES")}
            className={cn(
              "flex-1 md:flex-none py-2 px-4 rounded-button font-display text-xs font-bold uppercase tracking-wide transition-all border min-w-[100px] flex items-center justify-between gap-3",
              side === "YES"
                ? "bg-polymarket-yes text-white border-polymarket-yes shadow-glow-green"
                : "bg-surface-3 text-polymarket-yes border-polymarket-yes/20 hover:bg-polymarket-yes/10 hover:border-polymarket-yes/50"
            )}>
            <span>Yes</span>
            <span className="font-mono">{yp}¢</span>
          </button>
          <button onClick={() => handleAdd("NO")}
            className={cn(
              "flex-1 md:flex-none py-2 px-4 rounded-button font-display text-xs font-bold uppercase tracking-wide transition-all border min-w-[100px] flex items-center justify-between gap-3",
              side === "NO"
                ? "bg-polymarket-no text-white border-polymarket-no shadow-glow-red"
                : "bg-surface-3 text-polymarket-no border-polymarket-no/20 hover:bg-polymarket-no/10 hover:border-polymarket-no/50"
            )}>
            <span>No</span>
            <span className="font-mono">{np}¢</span>
          </button>
        </div>
      </div>


      {/* ARKHAM ANALYTICS FOR THIS MARKET */}
      <div className="mt-8 space-y-6 animate-fade-in">
        <h2 className="text-xl font-display font-bold text-text-primary flex items-center gap-2 mb-4">
          <Activity className="text-primary" />
          Arkham Intelligence
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
          <div className="min-h-[350px]">
            {/* Uses conditionId for CLOB API compatibility */}
            <PriceProbability marketId={market.conditionId || market.id} />
          </div>
          <div className="min-h-[350px]">
            <MarketDepthAnalysis marketId={market.conditionId || market.id} />
          </div>
        </div>

        {/* On-Chain Advanced Analytics */}
        <OnChainAnalytics market={market} />

        {/* Edge Score (if available) */}
        {!edgeLoading && marketEdge && (
          <div className="mt-6 animate-fade-in max-w-sm mx-auto lg:mx-0">
            <h3 className="text-lg font-display font-bold text-text-primary mb-3">Opportunity Score</h3>
            <EdgeScoreCard market={marketEdge as any} showDetails />
          </div>
        )}

        {/* Whale Activity specific to this market */}
        <div className="mt-8">
          <WhaleFeed trades={marketWhaleTrades} isLoading={whalesLoading} />
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentsSection
            marketId={market.id}
            yesToken={market.yesTokenId}
            noToken={market.noTokenId}
            yesPrice={yesPrice}
          />
        </div>
      </div>
    </div>
  );
}
