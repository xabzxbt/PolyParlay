"use client";

import React, { useMemo } from "react";
import {
  AlertTriangle,
  TrendingDown,
  Minus,
  TrendingUp,
  Zap,
  RefreshCw,
} from "lucide-react";
import { FearGreedResult, FearGreedHistory } from "@/lib/analytics/fear-greed-index";
import { getNeedleRotation, getFearGreedColor } from "@/lib/analytics/fear-greed-index";
import { cn } from "@/lib/utils";

interface FearGreedGaugeProps {
  result: FearGreedResult | null;
  history?: FearGreedHistory[];
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  AlertTriangle,
  TrendingDown,
  Minus,
  TrendingUp,
  Zap,
};

export function FearGreedGauge({
  result,
  history = [],
  isLoading = false,
  lastUpdated,
  onRefresh,
}: FearGreedGaugeProps) {
  const needleRotation = useMemo(() => {
    if (!result) return 0;
    return getNeedleRotation(result.total);
  }, [result]);

  const color = useMemo(() => {
    if (!result) return "#6B7280";
    return getFearGreedColor(result.total);
  }, [result]);

  const IconComponent = result ? iconMap[result.icon] : Minus;

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Get previous values
  const yesterdayValue = history.length > 1 ? history[history.length - 2]?.value : null;
  const weekAgoValue = history.length > 7 ? history[0]?.value : null;

  return (
    <div className="bg-white border border-border-default rounded-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text-primary">Fear & Greed Index</h3>
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
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-pill h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Gauge */}
      {!isLoading && result && (
        <>
          <div className="relative flex items-center justify-center h-48 mb-4">
            {/* Gauge Arc Background */}
            <svg
              viewBox="0 0 200 120"
              className="w-full max-w-[200px] h-auto"
            >
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1e293b"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Gradient arc segments */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#DC2626" />
                  <stop offset="25%" stopColor="#F97316" />
                  <stop offset="50%" stopColor="#EAB308" />
                  <stop offset="75%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.6"
              />
              {/* Value arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={color}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${(result.total / 100) * 251} 251`}
                className="transition-all duration-1000"
              />
            </svg>

            {/* Needle */}
            <div
              className="absolute bottom-1/2 left-1/2 w-1 h-20 bg-white origin-bottom rounded-pill transition-transform duration-1000 ease-out"
              style={{
                transform: `translateX(-50%) rotate(${needleRotation - 90}deg)`,
                transformOrigin: "50% 100%",
              }}
            />
            {/* Needle center */}
            <div className="absolute bottom-[calc(50%-8px)] left-1/2 -translate-x-1/2 w-4 h-4 rounded-pill bg-white shadow-lg" />
          </div>

          {/* Value Display */}
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-text-primary mb-1">{result.total}</div>
            <div
              className="text-lg font-semibold flex items-center justify-center gap-2"
              style={{ color }}
            >
              <IconComponent className="w-5 h-5" />
              {result.label}
            </div>
          </div>

          {/* Previous Values */}
          <div className="flex items-center justify-center gap-6 text-xs text-text-disabled mb-4">
            {yesterdayValue !== null && (
              <span>Yesterday: {yesterdayValue}</span>
            )}
            {weekAgoValue !== null && (
              <span>Week ago: {weekAgoValue}</span>
            )}
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div>
              <div className="text-xs text-text-disabled mb-1">Price</div>
              <div className="text-sm font-medium text-text-primary">
                {result.breakdown.priceMomentum}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-disabled mb-1">Volume</div>
              <div className="text-sm font-medium text-text-primary">
                {result.breakdown.volumeMomentum}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-disabled mb-1">Whale</div>
              <div className="text-sm font-medium text-text-primary">
                {result.breakdown.whaleNetFlow}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-disabled mb-1">Breadth</div>
              <div className="text-sm font-medium text-text-primary">
                {result.breakdown.marketBreadth}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-disabled mb-1">Fresh</div>
              <div className="text-sm font-medium text-text-primary">
                {result.breakdown.freshWalletActivity}
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-center text-xs text-slate-600 mt-4">
              Updated {formatLastUpdated(lastUpdated)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FearGreedGauge;
