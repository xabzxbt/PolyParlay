"use client";

import React, { useState } from "react";
import {
  Trophy,
  ChevronUp,
  ChevronDown,
  Minus,
  Target,
  TrendingUp,
  Activity,
  Flame,
  RefreshCw,
} from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { formatUSD, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  rankChange: number;
  address: string;
  displayName?: string;
  winRate: number;
  totalPnL: number;
  totalVolume: number;
  streak: number;
  xp: number;
  level: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserAddress?: string;
  currentUserRank?: number;
  totalTraders?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const levelColors: Record<string, string> = {
  Rookie: "text-gray-400",
  Trader: "text-blue-400",
  Analyst: "text-yellow-400",
  Shark: "text-orange-500",
  Whale: "text-purple-500",
  Kraken: "text-amber-400",
};

export function Leaderboard({
  entries,
  currentUserAddress,
  currentUserRank,
  totalTraders = 0,
  isLoading = false,
  onRefresh,
}: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month">("all");

  const timeFilters = [
    { value: "all", label: "All Time" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ] as const;

  return (
    <div className="bg-white border border-border-default rounded-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-text-primary">Leaderboard</h3>
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

      {/* Time Filters */}
      <div className="flex items-center gap-2">
        {timeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTimeFilter(filter.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              timeFilter === filter.value
                ? "bg-blue-500 text-text-primary"
                : "bg-surface-2 text-text-muted hover:text-text-primary"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-white animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-6 bg-surface-2 rounded" />
                <div className="w-20 h-4 bg-surface-2 rounded" />
                <div className="flex-1" />
                <div className="w-16 h-4 bg-surface-2 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Table */}
      {!isLoading && (
        <>
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-text-disabled px-3 py-2">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">Trader</div>
            <div className="col-span-2 text-center">
              <Target className="w-3 h-3 inline" /> Win Rate
            </div>
            <div className="col-span-2 text-center">
              <TrendingUp className="w-3 h-3 inline" /> P&L
            </div>
            <div className="col-span-2 text-center">
              <Activity className="w-3 h-3 inline" /> Volume
            </div>
            <div className="col-span-2 text-center">
              <Flame className="w-3 h-3 inline" /> Streak
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {entries.slice(0, 50).map((entry) => {
              const isCurrentUser = entry.address.toLowerCase() === currentUserAddress?.toLowerCase();

              return (
                <div
                  key={entry.rank}
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-3 rounded-lg transition-colors",
                    isCurrentUser
                      ? "bg-yellow-500/10 border border-yellow-500/30"
                      : "bg-surface-1 hover:bg-surface-2"
                  )}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "font-bold text-sm",
                        entry.rank <= 3 ? "text-yellow-500" : "text-text-muted"
                      )}
                    >
                      #{entry.rank}
                    </span>
                    {entry.rankChange !== 0 && (
                      entry.rankChange > 0 ? (
                        <ChevronUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-red-500" />
                      )
                    )}
                  </div>

                  {/* Address */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className={cn("text-sm font-medium", isCurrentUser ? "text-yellow-400" : "text-text-primary")}>
                      {entry.displayName || shortenAddress(entry.address)}
                    </span>
                    <span className={cn("text-xs", levelColors[entry.level] || "text-text-muted")}>
                      {entry.level}
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="col-span-2 text-center">
                    <span className={cn(
                      "text-sm font-medium",
                      entry.winRate >= 0.6 ? "text-green-500" :
                      entry.winRate >= 0.4 ? "text-yellow-500" : "text-red-500"
                    )}>
                      {formatPercent(entry.winRate)}
                    </span>
                  </div>

                  {/* P&L */}
                  <div className="col-span-2 text-center">
                    <span className={cn(
                      "text-sm font-medium",
                      entry.totalPnL >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {entry.totalPnL >= 0 ? "+" : ""}{formatUSD(entry.totalPnL)}
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm text-text-secondary">
                      {formatUSD(entry.totalVolume)}
                    </span>
                  </div>

                  {/* Streak */}
                  <div className="col-span-2 text-center flex items-center justify-center gap-1">
                    {entry.streak > 0 && <Flame className="w-3 h-3 text-orange-500" />}
                    <span className="text-sm text-text-secondary">{entry.streak}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current User Position */}
          {currentUserAddress && currentUserRank && (
            <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400 font-medium">
                    You are #{currentUserRank} of {totalTraders} traders
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Need +$340 P&L to reach rank #{currentUserRank - 1}
                  </p>
                </div>
                <ChevronUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Leaderboard;
