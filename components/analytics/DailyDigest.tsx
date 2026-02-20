"use client";

import React from "react";
import {
  Zap,
  BarChart2,
  TrendingUp,
  Crosshair,
  Activity,
  Flame,
  TrendingDown,
  Target,
  RefreshCw,
} from "lucide-react";
import { DailyDigest as DailyDigestType } from "@/lib/analytics/profile-calculator";
import { formatUSD, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

const archetypeIcons: Record<string, React.ElementType> = {
  Zap: Zap,
  BarChart2: BarChart2,
  TrendingUp: TrendingUp,
  Crosshair: Crosshair,
  Activity: Activity,
};

const archetypeColors: Record<string, string> = {
  Shark: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  Analyst: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  Whale: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  Degen: "bg-slate-500/20 text-text-muted border-slate-500/30",
  Trader: "bg-white/10 text-text-primary border-white/20",
};

interface DailyDigestProps {
  digest: DailyDigestType | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function DailyDigest({ digest, isLoading = false, onRefresh }: DailyDigestProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-border-default rounded-card p-6 animate-pulse">
        <div className="h-6 bg-surface-2 rounded w-1/3 mb-4" />
        <div className="h-20 bg-surface-2 rounded" />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="bg-white border border-border-default rounded-card p-6">
        <div className="text-center">
          <Activity className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-text-disabled">No trading data available</p>
          <p className="text-xs text-slate-600 mt-1">Connect your wallet to see your personalized digest</p>
        </div>
      </div>
    );
  }

  const { profile, todayPnL, winStreak } = digest;
  const ArchetypeIcon = archetypeIcons[profile.archetypeIcon] || Activity;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="bg-white border border-border-default rounded-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text-primary">
            {getGreeting()}
          </h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>

      {/* Main Stats Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Archetype Badge */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-card border",
          archetypeColors[profile.archetype] || archetypeColors.Trader
        )}>
          <ArchetypeIcon className="w-5 h-5" />
          <span className="font-semibold">{profile.archetype}</span>
        </div>

        {/* Today's P&L */}
        <div className="flex items-center gap-2">
          {todayPnL >= 0 ? (
            <TrendingUp className="w-5 h-5 text-green-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
          )}
          <div>
            <span className="text-xs text-text-muted">Today P&L</span>
            <span className={cn(
              "ml-2 font-semibold",
              todayPnL >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {todayPnL >= 0 ? "+" : ""}{formatUSD(todayPnL)}
            </span>
          </div>
        </div>

        {/* Win Streak */}
        {winStreak > 0 && (
          <div className="flex items-center gap-2 text-orange-500">
            <Flame className="w-5 h-5" />
            <div>
              <span className="text-xs text-text-muted">Win Streak</span>
              <span className="ml-2 font-semibold">{winStreak}</span>
            </div>
          </div>
        )}

        {/* Win Rate */}
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-text-muted" />
          <div>
            <span className="text-xs text-text-muted">Win Rate</span>
            <span className="ml-2 font-semibold text-text-primary">
              {formatPercent(profile.winRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-default">
        <div>
          <span className="text-xs text-text-disabled">Total Trades</span>
          <p className="text-lg font-semibold text-text-primary">{profile.totalTrades}</p>
        </div>
        <div>
          <span className="text-xs text-text-disabled">Avg Position</span>
          <p className="text-lg font-semibold text-text-primary">{formatUSD(profile.avgPositionSize)}</p>
        </div>
        <div>
          <span className="text-xs text-text-disabled">Avg ROI</span>
          <p className={cn(
            "text-lg font-semibold",
            profile.avgROI >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {profile.avgROI >= 0 ? "+" : ""}{formatPercent(profile.avgROI)}
          </p>
        </div>
        <div>
          <span className="text-xs text-text-disabled">Preferred Side</span>
          <p className="text-lg font-semibold text-text-primary">
            {profile.preferredSide === "NEUTRAL" ? "-" : profile.preferredSide}
          </p>
        </div>
      </div>

      {/* Category Performance */}
      {(profile.bestCategory || profile.worstCategory) && (
        <div className="flex items-center gap-4 pt-4 border-t border-border-default">
          {profile.bestCategory && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-disabled">Best Category</span>
              <span className="text-sm font-medium text-green-500 capitalize">
                {profile.bestCategory}
              </span>
            </div>
          )}
          {profile.worstCategory && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-disabled">Worst Category</span>
              <span className="text-sm font-medium text-red-500 capitalize">
                {profile.worstCategory}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DailyDigest;
