"use client";

import React, { useMemo } from "react";
import { Users, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { DivergenceResult } from "@/lib/analytics/divergence-calculator";
import { formatDivergence, getSignalColor, getSignalLabel } from "@/lib/analytics/divergence-calculator";
import { cn } from "@/lib/utils";

interface DivergenceRadarProps {
  divergences: DivergenceResult[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onMarketClick?: (market: DivergenceResult) => void;
}

export function DivergenceRadar({
  divergences,
  isLoading = false,
  onRefresh,
  onMarketClick,
}: DivergenceRadarProps) {
  const topDivergences = useMemo(() => {
    return divergences.slice(0, 10);
  }, [divergences]);

  return (
    <div className="bg-white border border-border-default rounded-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-text-primary">Divergence Radar</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors",
              isLoading && "animate-spin"
            )}
          >
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-white animate-pulse">
              <div className="h-4 bg-surface-2 rounded w-3/4 mb-2" />
              <div className="h-2 bg-surface-2 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && topDivergences.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-text-disabled">No divergence data available</p>
        </div>
      )}

      {/* Divergence List */}
      {!isLoading && topDivergences.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {topDivergences.map((item, index) => (
            <div
              key={item.marketId}
              className="p-3 rounded-lg bg-surface-2 hover:bg-surface-2 transition-colors cursor-pointer"
              onClick={() => onMarketClick?.(item)}
            >
              {/* Market Name */}
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm text-text-primary font-medium truncate flex-1 pr-2">
                  {item.marketQuestion}
                </span>
                <span className={cn("text-xs font-bold", getSignalColor(item.signal))}>
                  {getSignalLabel(item.signal)}
                </span>
              </div>

              {/* Bars */}
              <div className="space-y-1.5">
                {/* Whale Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-disabled w-12">Whales</span>
                  <div className="flex-1 h-2 bg-surface-3 rounded-pill overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-pill transition-all"
                      style={{ width: `${item.whaleYesPercent * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-10 text-right">
                    {(item.whaleYesPercent * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Retail Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-disabled w-12">Retail</span>
                  <div className="flex-1 h-2 bg-surface-3 rounded-pill overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-pill transition-all"
                      style={{ width: `${item.retailYesPercent * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-10 text-right">
                    {(item.retailYesPercent * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Divergence Indicator */}
              <div className="flex items-center justify-end mt-2">
                <div className={cn("flex items-center gap-1 text-xs font-medium", getSignalColor(item.signal))}>
                  {item.divergence > 0 ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : item.divergence < 0 ? (
                    <ArrowDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>{formatDivergence(item.divergence)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DivergenceRadar;
