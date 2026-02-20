"use client";

import React, { useEffect, useState } from "react";
import { Target, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { MarketWithEdge } from "@/hooks/useEdgeScore";
import EdgeScoreCard from "./EdgeScoreCard";
import { cn } from "@/lib/utils";

interface OpportunityFinderProps {
  opportunities: MarketWithEdge[];
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  onMarketClick?: (market: MarketWithEdge) => void;
}

export function OpportunityFinder({
  opportunities,
  isLoading = false,
  lastUpdated,
  onRefresh,
  onMarketClick,
}: OpportunityFinderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-text-primary">Opportunity Finder</h3>
          <span className="text-xs text-text-disabled px-2 py-0.5 bg-surface-2 rounded">
            Top 5
          </span>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-text-disabled">
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className={cn(
                "p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors",
                (isLoading || isRefreshing) && "animate-spin"
              )}
            >
              <RefreshCw className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-card bg-white border border-border-default animate-pulse"
            >
              <div className="h-4 bg-surface-2 rounded w-3/4 mb-3" />
              <div className="h-3 bg-surface-2 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && opportunities.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-text-disabled">No opportunities found</p>
          <p className="text-xs text-slate-600 mt-1">
            Check back later for new opportunities
          </p>
        </div>
      )}

      {/* Opportunity Cards */}
      {!isLoading && opportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {opportunities.map((market, index) => (
            <div key={market.id} className="relative">
              {/* Rank Badge */}
              <div className="absolute -left-2 -top-2 z-10 w-6 h-6 rounded-pill bg-white border border-border-default flex items-center justify-center">
                <span className="text-xs font-bold text-text-muted">{index + 1}</span>
              </div>
              <EdgeScoreCard
                market={market}
                showDetails={true}
                onClick={() => onMarketClick?.(market)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpportunityFinder;
