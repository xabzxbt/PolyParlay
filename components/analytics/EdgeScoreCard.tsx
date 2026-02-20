"use client";

import React, { memo } from "react";
import { Zap, TrendingUp, TrendingDown, Clock, DollarSign, ChevronRight } from "lucide-react";
import { EdgeScoreResult } from "@/lib/analytics/edge-score";
import { formatUSD, timeUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface EdgeScoreCardProps {
  market: {
    id: string;
    question: string;
    slug?: string;
    yesPrice: number;
    volume24hr: number;
    endDate: string;
    edgeScore: EdgeScoreResult;
  };
  showDetails?: boolean;
  onClick?: () => void;
}

const ratingConfig = {
  LOW: { bg: "bg-slate-500/20", text: "text-text-muted", border: "border-slate-500/30", label: "Low" },
  MEDIUM: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", label: "Medium" },
  HIGH: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", label: "High" },
  HOT: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", label: "HOT" },
};

export const EdgeScoreCard = memo(function EdgeScoreCard({
  market,
  showDetails = false,
  onClick,
}: EdgeScoreCardProps) {
  const { edgeScore, question, yesPrice, volume24hr, endDate, slug } = market;
  const config = ratingConfig[edgeScore.rating.toUpperCase() as keyof typeof ratingConfig] || ratingConfig.LOW;

  const truncatedQuestion = question.length > 60 ? question.substring(0, 60) + "..." : question;
  const timeRemaining = endDate ? timeUntil(new Date(endDate)) : "N/A";

  return (
    <div
      className={cn(
        "relative p-4 rounded-card border transition-all duration-300 cursor-pointer",
        "bg-white hover:bg-surface-2",
        config.border,
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-text-primary flex-1 pr-2">{truncatedQuestion}</h4>
        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg", config.bg)}>
          {edgeScore.rating === "HOT" && <Zap className={cn("w-3 h-3", config.text)} />}
          <span className={cn("text-xs font-bold", config.text)}>{edgeScore.total}</span>
        </div>
      </div>

      {/* Recommended Direction */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {edgeScore.recommendedDirection === "YES" ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={cn(
            "text-sm font-semibold",
            edgeScore.recommendedDirection === "YES" ? "text-green-500" : "text-red-500"
          )}>
            {edgeScore.recommendedDirection}
          </span>
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded", config.bg, config.text)}>
          {config.label}
        </span>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-2 mt-3 pt-3 border-t border-border-default">
          {/* Price */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-disabled">YES Price</span>
            <span className="text-text-secondary">{(yesPrice * 100).toFixed(1)}%</span>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-disabled">24h Volume</span>
            <span className="text-text-secondary">{formatUSD(volume24hr)}</span>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-disabled flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Time Left
            </span>
            <span className="text-text-secondary">{timeRemaining}</span>
          </div>

          {/* Kelly Optimal */}
          {edgeScore.kellyOptimal > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-disabled flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Kelly Size
              </span>
              <span className="text-yellow-500 font-medium">{formatUSD(edgeScore.kellyOptimal)}</span>
            </div>
          )}

          {/* Breakdown */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            <div className="text-center">
              <div className="h-1 bg-blue-500 rounded-pill" style={{ width: `${(edgeScore.breakdown.priceEdge / 25) * 100}%` }} />
              <span className="text-[8px] text-text-disabled">Edge</span>
            </div>
            <div className="text-center">
              <div className="h-1 bg-purple-500 rounded-pill" style={{ width: `${(edgeScore.breakdown.liquidity / 20) * 100}%` }} />
              <span className="text-[8px] text-text-disabled">Liq</span>
            </div>
            <div className="text-center">
              <div className="h-1 bg-green-500 rounded-pill" style={{ width: `${(edgeScore.breakdown.whaleSignal / 20) * 100}%` }} />
              <span className="text-[8px] text-text-disabled">Whale</span>
            </div>
            <div className="text-center">
              <div className="h-1 bg-yellow-500 rounded-pill" style={{ width: `${(edgeScore.breakdown.timing / 20) * 100}%` }} />
              <span className="text-[8px] text-text-disabled">Time</span>
            </div>
            <div className="text-center">
              <div className="h-1 bg-pink-500 rounded-pill" style={{ width: `${(edgeScore.breakdown.volumeMomentum / 15) * 100}%` }} />
              <span className="text-[8px] text-text-disabled">Vol</span>
            </div>
          </div>
        </div>
      )}

      {/* Arrow indicator */}
      {onClick && (
        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
      )}
    </div>
  );
});

export default EdgeScoreCard;
