// Streaks System for PolyParlay Gamification
// Track daily visits, consecutive days, and streak milestones

const STREAK_KEY = "polyparlay_streak";
const LAST_VISIT_KEY = "polyparlay_last_visit";
const VISIT_HISTORY_KEY = "polyparlay_visit_history";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string;
}

export interface VisitHistory {
  dates: string[];
}

// Milestone thresholds
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

export function getStreakData(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 0, longestStreak: 0, lastVisitDate: "" };
  }

  const stored = localStorage.getItem(STREAK_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { currentStreak: 0, longestStreak: 0, lastVisitDate: "" };
    }
  }
  return { currentStreak: 0, longestStreak: 0, lastVisitDate: "" };
}

export function saveStreakData(data: StreakData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export function recordVisit(): StreakData {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  let data = getStreakData();

  // First visit ever
  if (!data.lastVisitDate) {
    data.currentStreak = 1;
    data.longestStreak = 1;
    data.lastVisitDate = today;
    saveStreakData(data);
    addVisitToHistory(today);
    return data;
  }

  // Already visited today
  if (data.lastVisitDate === today) {
    return data;
  }

  // Visited yesterday - increment streak
  if (data.lastVisitDate === yesterday) {
    data.currentStreak += 1;
    data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
  } else {
    // Streak broken - reset
    data.currentStreak = 1;
  }

  data.lastVisitDate = today;
  saveStreakData(data);
  addVisitToHistory(today);

  return data;
}

export function getVisitHistory(): VisitHistory {
  if (typeof window === "undefined") return { dates: [] };

  const stored = localStorage.getItem(VISIT_HISTORY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { dates: [] };
    }
  }
  return { dates: [] };
}

export function addVisitToHistory(date: string): void {
  const history = getVisitHistory();
  if (!history.dates.includes(date)) {
    history.dates.push(date);
    // Keep only last 30 days
    if (history.dates.length > 30) {
      history.dates = history.dates.slice(-30);
    }
    localStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(history));
  }
}

export function getLast30DaysVisits(): string[] {
  const history = getVisitHistory();
  const today = getTodayDateString();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return history.dates.filter((date) => {
    return new Date(date) >= thirtyDaysAgo && date <= today;
  });
}

export function hasVisitedToday(): boolean {
  const data = getStreakData();
  return data.lastVisitDate === getTodayDateString();
}

export function getNextMilestone(): number {
  const data = getStreakData();
  for (const milestone of STREAK_MILESTONES) {
    if (data.currentStreak < milestone) {
      return milestone;
    }
  }
  return STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

export function getDaysToNextMilestone(): number {
  const data = getStreakData();
  const nextMilestone = getNextMilestone();
  return nextMilestone - data.currentStreak;
}

export function checkMilestoneReached(): number | null {
  const data = getStreakData();
  for (const milestone of STREAK_MILESTONES) {
    if (data.currentStreak === milestone) {
      return milestone;
    }
  }
  return null;
}

export function getStreakStatus(): {
  streak: number;
  longest: number;
  isActive: boolean;
  nextMilestone: number;
  daysToNext: number;
} {
  const data = getStreakData();
  return {
    streak: data.currentStreak,
    longest: data.longestStreak,
    isActive: hasVisitedToday(),
    nextMilestone: getNextMilestone(),
    daysToNext: getDaysToNextMilestone(),
  };
}

// Generate calendar data for last 30 days
export function getCalendarData(): Array<{ date: string; visited: boolean; isToday: boolean }> {
  const today = getTodayDateString();
  const visited = getLast30DaysVisits();
  const visitedSet = new Set(visited);

  const calendar: Array<{ date: string; visited: boolean; isToday: boolean }> = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    calendar.push({
      date: dateStr,
      visited: visitedSet.has(dateStr),
      isToday: dateStr === today,
    });
  }

  return calendar;
}

export function resetStreak(): void {
  if (typeof window === "undefined") return;
  const data = getStreakData();
  data.currentStreak = 0;
  saveStreakData(data);
}
