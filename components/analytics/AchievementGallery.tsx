"use client";

import React, { useState } from "react";
import {
  Crosshair,
  Flame,
  Eye,
  Shield,
  RefreshCw,
  Grid,
  Star,
  TrendingUp,
  Calendar,
  Clock,
  Moon,
  BarChart2,
  Users,
  Activity,
  Award,
  Zap,
  Lock,
  Trophy,
  Layers,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Crosshair,
  Flame,
  Eye,
  Shield,
  RefreshCw,
  Grid,
  Star,
  TrendingUp,
  Calendar,
  Clock,
  Moon,
  BarChart2,
  Users,
  Activity,
  Award,
  Zap,
  Layers,
  BookOpen,
  Target,
};

interface AchievementCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: number;
    xpReward: number;
    unlocked: boolean;
    progress: number;
  };
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const IconComponent = iconMap[achievement.icon] || Award;
  const progress = Math.min((achievement.progress / achievement.requirement) * 100, 100);

  return (
    <div
      className={cn(
        "relative p-4 rounded-card border transition-all duration-300",
        achievement.unlocked
          ? "bg-surface-2 border-yellow-500/30 hover:border-yellow-500/50"
          : "bg-white border-border-default"
      )}
    >
      {/* Lock overlay for locked achievements */}
      {!achievement.unlocked && (
        <div className="absolute inset-0 bg-white/60 rounded-card flex items-center justify-center">
          <Lock className="w-6 h-6 text-slate-600" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-card flex items-center justify-center",
            achievement.unlocked ? "bg-yellow-500/20" : "bg-surface-2"
          )}
        >
          <IconComponent
            className={cn(
              "w-6 h-6",
              achievement.unlocked ? "text-yellow-500" : "text-slate-600"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "font-semibold text-sm",
              achievement.unlocked ? "text-text-primary" : "text-text-disabled"
            )}
          >
            {achievement.name}
          </h4>
          <p
            className={cn(
              "text-xs mt-0.5",
              achievement.unlocked ? "text-text-muted" : "text-slate-600"
            )}
          >
            {achievement.description}
          </p>

          {/* Progress bar for locked achievements */}
          {!achievement.unlocked && achievement.progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-surface-3 rounded-pill overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-pill transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-text-disabled mt-1">
                {achievement.progress} / {achievement.requirement}
              </p>
            </div>
          )}

          {/* XP Reward */}
          {achievement.unlocked && achievement.xpReward > 0 && (
            <div className="flex items-center gap-1 mt-2 text-yellow-500">
              <Star className="w-3 h-3" />
              <span className="text-xs font-medium">+{achievement.xpReward} XP</span>
            </div>
          )}
        </div>

        {/* Unlocked badge */}
        {achievement.unlocked && (
          <div className="absolute top-2 right-2">
            <Award className="w-4 h-4 text-yellow-500" />
          </div>
        )}
      </div>
    </div>
  );
}

interface AchievementGalleryProps {
  maxDisplay?: number;
}

export function AchievementGallery({ maxDisplay }: AchievementGalleryProps) {
  const { achievements } = useGamification();
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return 0;
  });

  const displayAchievements = maxDisplay && !isExpanded
    ? sortedAchievements.slice(0, maxDisplay)
    : sortedAchievements;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-text-primary">Achievements</h3>
          <span className="text-sm text-text-muted">
            {unlockedCount} / {totalCount}
          </span>
        </div>

        {maxDisplay && achievements.length > maxDisplay && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Show all</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-2 rounded-pill overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 rounded-pill transition-all duration-500"
          style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {displayAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

export default AchievementGallery;
