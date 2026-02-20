"use client";

import React, { useEffect, useState } from "react";
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
  X,
  CheckCircle,
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
};

interface AchievementPopupProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    xpReward?: number;
  } | null;
  show: boolean;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, show, onDismiss }: AchievementPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (show && achievement) {
      setIsVisible(true);
      setTimeout(() => setShowCheck(true), 300);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, achievement, onDismiss]);

  if (!achievement) return null;

  const IconComponent = iconMap[achievement.icon] || Award;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-20 opacity-0"
      )}
    >
      <div className="bg-white border border-yellow-500/50 rounded-card p-4 shadow-2xl shadow-yellow-500/20 min-w-[280px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-pill bg-yellow-500/20 flex items-center justify-center">
                <IconComponent className="w-5 h-5 text-yellow-500" />
              </div>
              {showCheck && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-pill flex items-center justify-center animate-scale-in">
                  <CheckCircle className="w-3 h-3 text-text-primary" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-yellow-500 font-medium uppercase tracking-wider">
                Achievement Unlocked
              </p>
              <h3 className="text-lg font-bold text-text-primary">{achievement.name}</h3>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-text-muted mb-3">{achievement.description}</p>

        {/* XP Reward */}
        <div className="flex items-center gap-2 text-yellow-500">
          <Star className="w-4 h-4" />
          <span className="text-sm font-medium">+{achievement.xpReward || 50} XP</span>
        </div>

        {/* Progress bar animation */}
        <div className="mt-3 h-1 bg-surface-3 rounded-pill overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-pill animate-progress-fill" />
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        @keyframes progress-fill {
          0% { width: 0%;% { width: }
          100 100%; }
        }
        .animate-progress-fill {
          animation: progress-fill 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default AchievementPopup;
