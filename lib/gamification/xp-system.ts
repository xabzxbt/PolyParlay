// XP System for PolyParlay Gamification
// Stores XP, calculates levels, and tracks XP gains

export interface XPLevel {
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
}

export const XP_LEVELS: XPLevel[] = [
  { name: "Rookie", minXP: 0, maxXP: 100, icon: "Circle" },
  { name: "Trader", minXP: 100, maxXP: 300, icon: "BarChart2" },
  { name: "Analyst", minXP: 300, maxXP: 700, icon: "Target" },
  { name: "Shark", minXP: 700, maxXP: 1500, icon: "Zap" },
  { name: "Whale", minXP: 1500, maxXP: 3000, icon: "TrendingUp" },
  { name: "Kraken", minXP: 3000, maxXP: Infinity, icon: "Star" },
];

export const XP_ACTIONS = {
  PLACE_TRADE: 10,
  WINNING_TRADE: 50,
  BIG_WIN: 100, // Winning trade > $100 profit
  DAILY_LOGIN: 5,
  STREAK_BONUS: 200, // 7-day streak
  EDGE_DISCOVERY: 25, // Find market with edge > 15%
  FOLLOW_WHALE: 15,
} as const;

export type XPAction = keyof typeof XP_ACTIONS;

const STORAGE_KEY = "polyparlay_xp";
const LEVEL_KEY = "polyparlay_level";

export interface XPData {
  xp: number;
  level: string;
  lastXPUpdate: number;
}

export function getXPData(): XPData {
  if (typeof window === "undefined") {
    return { xp: 0, level: "Rookie", lastXPUpdate: Date.now() };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { xp: 0, level: "Rookie", lastXPUpdate: Date.now() };
    }
  }
  return { xp: 0, level: "Rookie", lastXPUpdate: Date.now() };
}

export function saveXPData(data: XPData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addXP(action: XPAction, customAmount?: number): XPData {
  const currentData = getXPData();
  let xpGain = customAmount ?? XP_ACTIONS[action];

  // Apply streak bonus
  if (action === "WINNING_TRADE" && getStreak() >= 7) {
    xpGain += XP_ACTIONS.STREAK_BONUS;
  }

  const newXP = currentData.xp + xpGain;
  const newLevel = calculateLevel(newXP);

  const newData: XPData = {
    xp: newXP,
    level: newLevel,
    lastXPUpdate: Date.now(),
  };

  saveXPData(newData);
  return newData;
}

export function calculateLevel(xp: number): string {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXP) {
      return XP_LEVELS[i].name;
    }
  }
  return "Rookie";
}

export function getLevelInfo(levelName: string): XPLevel | undefined {
  return XP_LEVELS.find((l) => l.name === levelName);
}

export function getXPProgress(xp: number): { current: number; max: number; percentage: number } {
  const currentLevel = getLevelInfo(calculateLevel(xp));
  if (!currentLevel) return { current: 0, max: 100, percentage: 0 };

  if (currentLevel.maxXP === Infinity) {
    return { current: xp - currentLevel.minXP, max: 1000, percentage: 100 };
  }

  const current = xp - currentLevel.minXP;
  const max = currentLevel.maxXP - currentLevel.minXP;
  const percentage = Math.min((current / max) * 100, 100);

  return { current, max, percentage };
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem("polyparlay_streak");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return 0;
    }
  }
  return 0;
}

export function setStreak(streak: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("polyparlay_streak", JSON.stringify(streak));
}

export function incrementStreak(): number {
  const lastVisit = localStorage.getItem("polyparlay_last_visit");
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;

  let currentStreak = getStreak();

  if (lastVisit) {
    const lastVisitDay = new Date(parseInt(lastVisit)).setHours(0, 0, 0, 0);
    if (lastVisitDay === yesterday) {
      currentStreak += 1;
    } else if (lastVisitDay !== today) {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  setStreak(currentStreak);
  localStorage.setItem("polyparlay_last_visit", Date.now().toString());
  return currentStreak;
}

export function checkAndUpdateStreak(): { newStreak: number; broke: boolean } {
  const lastVisit = localStorage.getItem("polyparlay_last_visit");
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;

  if (!lastVisit) {
    return { newStreak: 1, broke: false };
  }

  const lastVisitDay = new Date(parseInt(lastVisit)).setHours(0, 0, 0, 0);

  if (lastVisitDay === yesterday) {
    const currentStreak = getStreak();
    return { newStreak: currentStreak + 1, broke: false };
  } else if (lastVisitDay !== today) {
    setStreak(0);
    return { newStreak: 0, broke: true };
  }

  return { newStreak: getStreak(), broke: false };
}
