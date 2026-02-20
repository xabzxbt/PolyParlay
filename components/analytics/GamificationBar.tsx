"use client";

import React, { useMemo } from "react";
import {
  Circle,
  BarChart2,
  Target,
  Zap,
  TrendingUp,
  Star,
  Flame,
  ChevronUp,
  ChevronDown,
  Trophy,
  Award,
} from "lucide-react";
import { XP_LEVELS } from "@/lib/gamification/xp-system";
import { useGamification } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

const levelIcons: Record<string, React.ElementType> = {
  Circle: Circle,
  BarChart2: BarChart2,
  Target: Target,
  Zap: Zap,
  TrendingUp: TrendingUp,
  Star: Star,
};

const levelColors: Record<string, string> = {
  Rookie: "text-gray-400",
  Trader: "text-blue-400",
  Analyst: "text-yellow-400",
  Shark: "text-orange-500",
  Whale: "text-purple-500",
  Kraken: "text-amber-400",
};

interface LevelBadgeProps {
  level: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LevelBadge({ level, showLabel = true, size = "md" }: LevelBadgeProps) {
  const levelInfo = XP_LEVELS.find((l) => l.name === level);
  const IconComponent = levelInfo ? levelIcons[levelInfo.icon] : Circle;
  const colorClass = levelColors[level] || "text-gray-400";

  const sizeClasses: Record<string, string> = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const labelSizes: Record<string, string> = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("rounded-pill bg-surface-2 p-1", sizeClasses[size])}>
        <IconComponent className={cn("w-full h-full", colorClass)} />
      </div>
      {showLabel && (
        <span className={cn("font-medium", colorClass, labelSizes[size])}>{level}</span>
      )}
    </div>
  );
}

interface GamificationBarProps {
  showXP?: boolean;
  showStreak?: boolean;
  showLevel?: boolean;
  compact?: boolean;
}

export function GamificationBar({
  showXP = true,
  showStreak = true,
  showLevel = true,
  compact = false,
}: GamificationBarProps) {
  const { xp, level, xpProgress, streak, longestStreak } = useGamification();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {showLevel && <LevelBadge level={level} showLabel={true} size="sm" />}
        {showXP && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-surface-3 rounded-pill overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-pill transition-all duration-500"
                style={{ width: `${xpProgress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">{xp} XP</span>
          </div>
        )}
        {showStreak && streak > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-medium">{streak}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-border-default rounded-lg px-4 py-3">
      <div className="flex items-center gap-6">
        {/* Level Badge */}
        {showLevel && (
          <div className="flex items-center gap-2">
            <LevelBadge level={level} showLabel={true} size="md" />
          </div>
        )}

        {/* XP Progress Bar */}
        {showXP && (
          <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">XP Progress</span>
              <span className="text-text-secondary">
                {xpProgress.current} / {xpProgress.max === 1000 ? "∞" : xpProgress.max}
              </span>
            </div>
            <div className="w-full h-2 bg-surface-3 rounded-pill overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-pill transition-all duration-500 ease-out"
                style={{ width: `${xpProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Streak */}
        {showStreak && (
          <div className="flex items-center gap-2">
            <Flame className={cn("w-5 h-5", streak > 0 ? "text-orange-500" : "text-text-disabled")} />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-text-primary">{streak}</span>
              <span className="text-xs text-text-disabled">day streak</span>
            </div>
            {longestStreak > 0 && (
              <div className="flex items-center gap-1 text-text-disabled">
                <Trophy className="w-3 h-3" />
                <span className="text-xs">{longestStreak}</span>
              </div>
            )}
          </div>
        )}

        {/* Total XP */}
        <div className="flex items-center gap-1 text-text-muted">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">{xp} XP</span>
        </div>
      </div>
    </div>
  );
}

export default GamificationBar;
