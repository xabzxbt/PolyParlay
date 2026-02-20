"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase/client";
import {
  getXPData,
  saveXPData,
  addXP,
  calculateLevel,
  getXPProgress,
  getLevelInfo,
  XPAction,
} from "@/lib/gamification/xp-system";
import {
  getUnlockedAchievements,
  saveUnlockedAchievements,
  unlockAchievement,
  isAchievementUnlocked,
  updateAchievementProgress,
  getAchievementCurrentProgress,
  getAchievementTracker,
  getAchievementById,
  ACHIEVEMENTS,
  Achievement,
} from "@/lib/gamification/achievements";
import {
  getStreakData,
  saveStreakData,
  recordVisit,
  getStreakStatus,
  getCalendarData,
  checkMilestoneReached,
  StreakData,
} from "@/lib/gamification/streaks";

export interface GamificationState {
  xp: number;
  level: string;
  levelInfo: ReturnType<typeof getLevelInfo>;
  xpProgress: ReturnType<typeof getXPProgress>;
  streak: number;
  longestStreak: number;
  achievements: Array<Achievement & { unlocked: boolean; progress: number }>;
  calendarData: Array<{ date: string; visited: boolean; isToday: boolean }>;
  recentAchievement: Achievement | null;
  showAchievementPopup: boolean;
}

export function useGamification() {
  const { address } = useAccount();
  const addressRef = useRef(address);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const [state, setState] = useState<GamificationState>({
    xp: 0,
    level: "Rookie",
    levelInfo: getLevelInfo("Rookie"),
    xpProgress: { current: 0, max: 100, percentage: 0 },
    streak: 0,
    longestStreak: 0,
    achievements: [],
    calendarData: [],
    recentAchievement: null,
    showAchievementPopup: false,
  });

  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const syncToSupabase = useCallback(async (dataToSync: any) => {
    if (!addressRef.current) return;
    try {
      await supabase.from("gamification").upsert({
        user_address: addressRef.current,
        xp: dataToSync.xp !== undefined ? dataToSync.xp : state.xp,
        level: dataToSync.levelInfo?.index || 1,
        streak: dataToSync.streak !== undefined ? dataToSync.streak : state.streak,
        achievements: dataToSync.achievements || state.achievements || [],
        daily_quests: [],
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_address" });
    } catch (e) {
    }
  }, [state]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      let dbData = null;
      if (address) {
        try {
          const { data, error } = await supabase
            .from("gamification")
            .select("*")
            .eq("user_address", address)
            .single();
          if (!error && data) {
            dbData = data;
          }
        } catch (e) {
        }
      }

      const xpData = getXPData();
      const streakData = getStreakData();
      let streakStatus = getStreakStatus();
      const calendarData = getCalendarData();

      if (!streakData.lastVisitDate) {
        setIsFirstVisit(true);
      }

      const newStreakData = recordVisit();
      streakStatus = getStreakStatus();
      checkMilestoneReached();

      let achievementsWithProgress = ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        unlocked: isAchievementUnlocked(achievement.id),
        progress: getAchievementCurrentProgress(achievement.id),
      }));

      let currentXp = xpData.xp;
      let currentLevel = xpData.level;
      let currentStreak = streakStatus.streak;

      if (dbData) {
        currentXp = dbData.xp;
        currentLevel = calculateLevel(currentXp);
        currentStreak = dbData.streak || streakStatus.streak;

        // Sync Supabase facts down to LocalStorage
        saveXPData({ xp: currentXp, level: currentLevel, lastXPUpdate: Date.now() });

        const sd = getStreakData();
        sd.currentStreak = currentStreak;
        saveStreakData(sd);

        if (dbData.achievements && Array.isArray((dbData.achievements as any[]))) {
          const unlockedList: any[] = [];
          const tracker = getAchievementTracker();

          achievementsWithProgress = ACHIEVEMENTS.map((ach) => {
            const dbAch = (dbData.achievements as any[]).find((d: any) => d.id === ach.id);
            const isUnlocked = dbAch ? dbAch.unlocked : isAchievementUnlocked(ach.id);
            const progress = dbAch ? dbAch.progress : getAchievementCurrentProgress(ach.id);

            if (isUnlocked && !unlockedList.some(u => u.achievementId === ach.id)) {
              unlockedList.push({ achievementId: ach.id, unlockedAt: Date.now() });
            }
            tracker[ach.id] = progress;

            return {
              ...ach,
              unlocked: isUnlocked,
              progress: progress,
            };
          });

          saveUnlockedAchievements(unlockedList);
          localStorage.setItem("polyparlay_achievement_progress", JSON.stringify(tracker));
        }
      }

      setState({
        xp: currentXp,
        level: currentLevel,
        levelInfo: getLevelInfo(currentLevel),
        xpProgress: getXPProgress(currentXp),
        streak: currentStreak,
        longestStreak: newStreakData.longestStreak,
        achievements: achievementsWithProgress,
        calendarData: getCalendarData(),
        recentAchievement: null,
        showAchievementPopup: false,
      });
      setIsLoaded(true);

      // Award daily login XP if first visit today (only if not loaded from DB with recent update)
      if (isFirstVisit || newStreakData.lastVisitDate === new Date().toISOString().split("T")[0]) {
        if (!dbData) {
          const newXpData = addXP("DAILY_LOGIN");
          const newState = {
            xp: newXpData.xp,
            level: newXpData.level,
            levelInfo: getLevelInfo(newXpData.level),
            xpProgress: getXPProgress(newXpData.xp),
          };
          setState(prev => ({ ...prev, ...newState }));
          syncToSupabase(newState);
        }
      }
    };
    init();
  }, [address]);

  const awardXP = useCallback((action: XPAction, customAmount?: number) => {
    const newXpData = addXP(action, customAmount);
    setState((prev) => {
      const newState = {
        ...prev,
        xp: newXpData.xp,
        level: newXpData.level,
        levelInfo: getLevelInfo(newXpData.level),
        xpProgress: getXPProgress(newXpData.xp),
      };
      syncToSupabase({ xp: newState.xp, levelInfo: newState.levelInfo });
      return newState;
    });
  }, [syncToSupabase]);

  const trackAchievement = useCallback((achievementId: string, amount: number = 1) => {
    const justUnlocked = updateAchievementProgress(achievementId, amount);

    if (justUnlocked) {
      const achievement = getAchievementById(achievementId);
      if (achievement) {
        const newXpData = addXP("EDGE_DISCOVERY", achievement.xpReward);

        setState((prev) => {
          const updatedAchievements = prev.achievements.map((a) =>
            a.id === achievementId ? { ...a, unlocked: true, progress: a.requirement } : a
          );

          const newState = {
            ...prev,
            xp: newXpData.xp,
            level: newXpData.level,
            levelInfo: getLevelInfo(newXpData.level),
            xpProgress: getXPProgress(newXpData.xp),
            achievements: updatedAchievements,
            recentAchievement: achievement,
            showAchievementPopup: true,
          };

          syncToSupabase({
            xp: newState.xp,
            levelInfo: newState.levelInfo,
            achievements: newState.achievements
          });

          return newState;
        });

        setTimeout(() => {
          setState((prev) => ({ ...prev, showAchievementPopup: false }));
        }, 5000);
      }
    } else {
      setState((prev) => {
        const updatedAchievements = prev.achievements.map((a) =>
          a.id === achievementId
            ? { ...a, progress: getAchievementCurrentProgress(achievementId) }
            : a
        );
        const newState = { ...prev, achievements: updatedAchievements };
        syncToSupabase({ achievements: newState.achievements });
        return newState;
      });
    }
  }, [syncToSupabase]);

  const dismissAchievementPopup = useCallback(() => {
    setState((prev) => ({ ...prev, showAchievementPopup: false }));
  }, []);

  const refreshStreak = useCallback(() => {
    const streakData = getStreakData();
    const streakStatus = getStreakStatus();
    setState((prev) => {
      const newState = {
        ...prev,
        streak: streakStatus.streak,
        longestStreak: streakData.longestStreak,
        calendarData: getCalendarData(),
      };
      syncToSupabase({ streak: newState.streak });
      return newState;
    });
  }, [syncToSupabase]);

  return {
    ...state,
    awardXP,
    trackAchievement,
    dismissAchievementPopup,
    refreshStreak,
    isFirstVisit,
    isLoaded,
  };
}
