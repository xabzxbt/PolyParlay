// Achievements System for PolyParlay Gamification
// 20+ achievements with icons and unlock conditions

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  xpReward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_blood",
    name: "First Blood",
    description: "Place your first trade",
    icon: "Crosshair",
    requirement: 1,
    xpReward: 50,
  },
  {
    id: "on_fire",
    name: "On Fire",
    description: "Win 3 trades in a row",
    icon: "Flame",
    requirement: 3,
    xpReward: 100,
  },
  {
    id: "whale_watcher",
    name: "Whale Watcher",
    description: "Follow 10 whale trades",
    icon: "Eye",
    requirement: 10,
    xpReward: 75,
  },
  {
    id: "diamond_hands",
    name: "Diamond Hands",
    description: "Hold a position for 7+ days",
    icon: "Shield",
    requirement: 7,
    xpReward: 150,
  },
  {
    id: "contrarian",
    name: "Contrarian",
    description: "Bet against the majority 5 times and win",
    icon: "RefreshCw",
    requirement: 5,
    xpReward: 200,
  },
  {
    id: "polymath",
    name: "Polymath",
    description: "Trade in 5 different categories",
    icon: "Grid",
    requirement: 5,
    xpReward: 100,
  },
  {
    id: "lucky_streak",
    name: "Lucky Streak",
    description: "Win 5 trades in a row",
    icon: "Star",
    requirement: 5,
    xpReward: 150,
  },
  {
    id: "big_fish",
    name: "Big Fish",
    description: "Place a single trade worth more than $500",
    icon: "TrendingUp",
    requirement: 500,
    xpReward: 75,
  },
  {
    id: "consistent",
    name: "Consistent",
    description: "Trade every day for 7 days",
    icon: "Calendar",
    requirement: 7,
    xpReward: 200,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Trade before 9am 5 times",
    icon: "Clock",
    requirement: 5,
    xpReward: 50,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Trade after midnight 5 times",
    icon: "Moon",
    requirement: 5,
    xpReward: 50,
  },
  {
    id: "analyst_pro",
    name: "Analyst Pro",
    description: "Use the Quant Dashboard 10 times",
    icon: "BarChart2",
    requirement: 10,
    xpReward: 100,
  },
  {
    id: "smart_follow",
    name: "Smart Follow",
    description: "Follow a whale that won 3 times",
    icon: "Users",
    requirement: 3,
    xpReward: 150,
  },
  {
    id: "risk_manager",
    name: "Risk Manager",
    description: "Never exceeded Kelly criterion",
    icon: "Shield",
    requirement: 1,
    xpReward: 100,
  },
  {
    id: "volume_king",
    name: "Volume King",
    description: "Trade more than $10k total volume",
    icon: "Activity",
    requirement: 10000,
    xpReward: 200,
  },
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    description: "Win a trade after 3 consecutive losses",
    icon: "TrendingUp",
    requirement: 1,
    xpReward: 75,
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Win 10 trades in a row",
    icon: "Award",
    requirement: 10,
    xpReward: 300,
  },
  {
    id: "diversifier",
    name: "Diversifier",
    description: "Have positions in 10 different markets",
    icon: "Layers",
    requirement: 10,
    xpReward: 100,
  },
  {
    id: "quick_draw",
    name: "Quick Draw",
    description: "Place 5 trades in a single day",
    icon: "Zap",
    requirement: 5,
    xpReward: 75,
  },
  {
    id: "prophet",
    name: "Prophet",
    description: "Correctly predict 5 markets resolving within 24h",
    icon: "Target",
    requirement: 5,
    xpReward: 150,
  },
  {
    id: "collector",
    name: "Collector",
    description: "Open 50 different market pages",
    icon: "BookOpen",
    requirement: 50,
    xpReward: 50,
  },
  {
    id: "shark",
    name: "Shark",
    description: "Reach Shark level (700 XP)",
    icon: "Zap",
    requirement: 700,
    xpReward: 0,
  },
  {
    id: "whale_level",
    name: "Whale",
    description: "Reach Whale level (1500 XP)",
    icon: "TrendingUp",
    requirement: 1500,
    xpReward: 0,
  },
  {
    id: "kraken",
    name: "Kraken",
    description: "Reach Kraken level (3000 XP)",
    icon: "Star",
    requirement: 3000,
    xpReward: 0,
  },
];

const STORAGE_KEY = "polyparlay_achievements";

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: number;
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  unlocked: boolean;
}

export function getUnlockedAchievements(): UnlockedAchievement[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveUnlockedAchievements(achievements: UnlockedAchievement[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
}

export function unlockAchievement(achievementId: string): UnlockedAchievement | null {
  const unlocked = getUnlockedAchievements();
  const alreadyUnlocked = unlocked.some((a) => a.achievementId === achievementId);

  if (alreadyUnlocked) return null;

  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) return null;

  const newUnlock: UnlockedAchievement = {
    achievementId,
    unlockedAt: Date.now(),
  };

  unlocked.push(newUnlock);
  saveUnlockedAchievements(unlocked);

  return newUnlock;
}

export function isAchievementUnlocked(achievementId: string): boolean {
  const unlocked = getUnlockedAchievements();
  return unlocked.some((a) => a.achievementId === achievementId);
}

export function getAchievementProgress(achievementId: string, current: number): AchievementProgress {
  return {
    achievementId,
    current: Math.min(current, getAchievementRequirement(achievementId)),
    unlocked: isAchievementUnlocked(achievementId),
  };
}

export function getAchievementRequirement(achievementId: string): number {
  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  return achievement?.requirement ?? 1;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAllAchievementsWithProgress(): Array<Achievement & { unlocked: boolean; progress: number }> {
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: isAchievementUnlocked(achievement.id),
    progress: 0, // Will be calculated by caller
  }));
}

// Track achievement progress in localStorage
const PROGRESS_KEY = "polyparlay_achievement_progress";

export function getAchievementTracker(): Record<string, number> {
  if (typeof window === "undefined") return {};

  const stored = localStorage.getItem(PROGRESS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

export function updateAchievementProgress(achievementId: string, amount: number = 1): boolean {
  const tracker = getAchievementTracker();
  const current = tracker[achievementId] || 0;
  const newValue = current + amount;

  tracker[achievementId] = newValue;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(tracker));

  const achievement = getAchievementById(achievementId);
  if (!achievement) return false;

  if (newValue >= achievement.requirement && !isAchievementUnlocked(achievementId)) {
    unlockAchievement(achievementId);
    return true; // Achievement just unlocked
  }

  return false;
}

export function getAchievementCurrentProgress(achievementId: string): number {
  const tracker = getAchievementTracker();
  return tracker[achievementId] || 0;
}

export function resetAchievementProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(STORAGE_KEY);
}
