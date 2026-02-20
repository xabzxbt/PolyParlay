"use client";

import React, { useState, useEffect } from "react";
import { Zap, X, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { MarketWithEdge } from "@/hooks/useEdgeScore";
import { timeUntil, formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface HotOpportunityBannerProps {
  market: MarketWithEdge | null;
  onDismiss?: () => void;
  onClick?: () => void;
}

export function HotOpportunityBanner({
  market,
  onDismiss,
  onClick,
}: HotOpportunityBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (market && !isDismissed) {
      // Animate in
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [market, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!market || isDismissed) return null;

  const timeRemaining = market.endDate ? timeUntil(new Date(market.endDate)) : "N/A";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-red-500/50 bg-red-950/20 transition-all duration-500",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5 animate-pulse" />

      {/* Flashing border effect */}
      <div className="absolute inset-0 rounded-card animate-border-pulse pointer-events-none" />

      <div className="relative flex items-center justify-between p-4">
        {/* Left - Icon and Content */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-card bg-red-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-red-500 animate-pulse" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                HOT Opportunity
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20">
                <Zap className="w-3 h-3 text-red-400" />
                <span className="text-xs font-bold text-red-400">{market.edgeScore.total}</span>
              </div>
            </div>

            <h4 className="text-text-primary font-medium truncate pr-4">
              {market.question}
            </h4>

            <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {market.edgeScore.recommendedDirection}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeRemaining}
              </span>
              <span className="flex items-center gap-1">
                Vol: {formatUSD(market.volume24hr)}
              </span>
            </div>
          </div>
        </div>

        {/* Right - Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClick}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-text-primary text-sm font-medium transition-colors"
          >
            View
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes border-pulse {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2);
          }
        }
        .animate-border-pulse {
          animation: border-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default HotOpportunityBanner;
