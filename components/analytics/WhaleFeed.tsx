"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Clock,
  RefreshCw,
  Filter,
} from "lucide-react";
import { WhaleTrade, WhaleFilter } from "@/lib/analytics/whale-detector";
import { formatWhaleSize, getTimeAgo, WHALE_THRESHOLDS, getWhaleClassification } from "@/lib/analytics/whale-detector";
import { cn } from "@/lib/utils";

interface WhaleFeedProps {
  trades: WhaleTrade[];
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  onTradeClick?: (trade: WhaleTrade) => void;
}

const filterOptions = [
  { value: "ALL", label: "All" },
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
] as const;

const sizeFilters = [
  { value: 0, label: "All Sizes" },
  { value: WHALE_THRESHOLDS.SMALL, label: ">$1K" },
  { value: WHALE_THRESHOLDS.LARGE, label: ">$10K" },
] as const;

export function WhaleFeed({
  trades,
  isLoading = false,
  lastUpdated,
  onRefresh,
  onTradeClick,
}: WhaleFeedProps) {
  const [filter, setFilter] = useState<"ALL" | "YES" | "NO">("ALL");
  const [minSize, setMinSize] = useState<number>(0);
  const [animatedTrades, setAnimatedTrades] = useState<Set<string>>(new Set());

  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (lastUpdated) setSecondsAgo(0);
  }, [lastUpdated]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track new trades for animation
  useEffect(() => {
    if (trades.length > 0) {
      const newTradeIds = trades.slice(0, 3).map((t) => t.id);
      setAnimatedTrades(new Set(newTradeIds));

      // Clear animation state after animation completes
      const timer = setTimeout(() => {
        setAnimatedTrades(new Set());
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [trades]);

  const filteredTrades = trades.filter((trade) => {
    if (filter !== "ALL" && trade.side !== filter) return false;
    if (minSize > 0 && trade.size < minSize) return false;
    return true;
  });

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-text-primary">Whale Feed</h3>
          <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-pill">
            <span className="w-1.5 h-1.5 rounded-pill bg-green-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-text-disabled">
              Updated {secondsAgo}s ago
            </span>
          )}
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
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white rounded-lg p-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === option.value
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white rounded-lg p-1">
          {sizeFilters.map((option) => (
            <button
              key={option.value}
              onClick={() => setMinSize(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                minSize === option.value
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-white animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-surface-2 rounded-pill" />
                <div className="flex-1">
                  <div className="h-3 bg-surface-2 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-surface-2 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Whale Trades List */}
      {!isLoading && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-text-disabled">No whale trades found</p>
            </div>
          ) : (
            filteredTrades.map((trade) => {
              const classification = getWhaleClassification(trade.size);
              const isAnimated = animatedTrades.has(trade.id);

              return (
                <div
                  key={trade.id}
                  className={cn(
                    "relative p-3 rounded-lg border-l-4 transition-all duration-300 cursor-pointer",
                    trade.side === "YES"
                      ? "border-l-green-500 bg-green-500/5 hover:bg-green-500/10"
                      : "border-l-red-500 bg-red-500/5 hover:bg-red-500/10",
                    isAnimated && "animate-slide-in"
                  )}
                  onClick={() => onTradeClick?.(trade)}
                >
                  {/* Content */}
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-pill flex items-center justify-center",
                        trade.side === "YES"
                          ? "bg-green-500/20"
                          : "bg-red-500/20"
                      )}
                    >
                      {trade.side === "YES" ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            trade.side === "YES" ? "text-green-500" : "text-red-500"
                          )}
                        >
                          {trade.side}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatWhaleSize(trade.size)}
                        </span>
                        {classification === "large" && (
                          <Award className="w-3 h-3 text-yellow-500" />
                        )}
                        {classification === "mega" && (
                          <Award className="w-3 h-3 text-amber-500" />
                        )}
                        {trade.isSmartMoney && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                            Smart
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary truncate">
                        {trade.marketQuestion}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-xs text-text-disabled">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeAgo(trade.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default WhaleFeed;
