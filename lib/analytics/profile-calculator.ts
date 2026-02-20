// Trading Profile Calculator for Daily Personal Digest
// Calculates user trading profile from trade history

export interface Trade {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  size: number;
  profit?: number; // positive for win, negative for loss
  outcome?: "win" | "loss" | "pending";
  category?: string;
  timestamp: number;
}

export interface TradingProfile {
  winRate: number; // 0-1
  avgROI: number; // average return per trade
  totalTrades: number;
  wins: number;
  losses: number;
  bestCategory: string | null;
  worstCategory: string | null;
  preferredSide: "YES" | "NO" | "NEUTRAL";
  avgPositionSize: number;
  archetype: "Shark" | "Analyst" | "Whale" | "Degen" | "Trader";
  archetypeIcon: string;
  archetypeColor: string;
}

export interface DailyDigest {
  profile: TradingProfile;
  todayPnL: number;
  winStreak: number;
  recommendedMarkets: string[];
}

// Calculate win rate
export function calculateWinRate(trades: Trade[]): number {
  const resolvedTrades = trades.filter(t => t.outcome !== "pending");
  if (resolvedTrades.length === 0) return 0;
  
  const wins = resolvedTrades.filter(t => t.outcome === "win").length;
  return wins / resolvedTrades.length;
}

// Calculate average ROI
export function calculateAvgROI(trades: Trade[]): number {
  const resolvedTrades = trades.filter(t => t.outcome !== "pending" && t.profit !== undefined);
  if (resolvedTrades.length === 0) return 0;
  
  const totalROI = resolvedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  return totalROI / resolvedTrades.length;
}

// Calculate category win rates
export function calculateCategoryWinRates(trades: Trade[]): Record<string, { wins: number; total: number }> {
  const categoryStats: Record<string, { wins: number; total: number }> = {};
  
  trades.forEach(trade => {
    if (!trade.category || trade.outcome === "pending") return;
    
    if (!categoryStats[trade.category]) {
      categoryStats[trade.category] = { wins: 0, total: 0 };
    }
    
    categoryStats[trade.category].total += 1;
    if (trade.outcome === "win") {
      categoryStats[trade.category].wins += 1;
    }
  });
  
  return categoryStats;
}

// Get best and worst performing categories
export function getBestAndWorstCategories(trades: Trade[]): { best: string | null; worst: string | null } {
  const categoryStats = calculateCategoryWinRates(trades);
  const categories = Object.entries(categoryStats);
  
  if (categories.length === 0) {
    return { best: null, worst: null };
  }
  
  let best: string | null = null;
  let worst: string | null = null;
  let bestRate = -1;
  let worstRate = 2;
  
  categories.forEach(([category, stats]) => {
    const rate = stats.wins / stats.total;
    if (rate > bestRate) {
      bestRate = rate;
      best = category;
    }
    if (rate < worstRate) {
      worstRate = rate;
      worst = category;
    }
  });
  
  return { best, worst };
}

// Get preferred side
export function getPreferredSide(trades: Trade[]): "YES" | "NO" | "NEUTRAL" {
  const yesTrades = trades.filter(t => t.side === "YES").length;
  const noTrades = trades.filter(t => t.side === "NO").length;
  
  if (yesTrades === 0 && noTrades === 0) return "NEUTRAL";
  if (yesTrades > noTrades * 1.5) return "YES";
  if (noTrades > yesTrades * 1.5) return "NO";
  return "NEUTRAL";
}

// Calculate average position size
export function calculateAvgPositionSize(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  
  const totalSize = trades.reduce((sum, t) => sum + t.size, 0);
  return totalSize / trades.length;
}

// Determine trader archetype
export function determineArchetype(profile: {
  winRate: number;
  avgROI: number;
  avgPositionSize: number;
}): { archetype: TradingProfile["archetype"]; icon: string; color: string } {
  if (profile.winRate > 0.6 && profile.avgROI > 0.2) {
    return { archetype: "Shark", icon: "Zap", color: "text-yellow-500" };
  }
  if (profile.winRate > 0.5) {
    return { archetype: "Analyst", icon: "BarChart2", color: "text-blue-500" };
  }
  if (profile.avgPositionSize > 1000) {
    return { archetype: "Whale", icon: "TrendingUp", color: "text-purple-500" };
  }
  if (profile.winRate < 0.4) {
    return { archetype: "Degen", icon: "Crosshair", color: "text-text-muted" };
  }
  return { archetype: "Trader", icon: "Activity", color: "text-white" };
}

// Calculate win streak
export function calculateWinStreak(trades: Trade[]): number {
  const sortedTrades = [...trades]
    .filter(t => t.outcome !== "pending")
    .sort((a, b) => b.timestamp - a.timestamp);
  
  let streak = 0;
  for (const trade of sortedTrades) {
    if (trade.outcome === "win") {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// Calculate today's P&L
export function calculateTodayPnL(trades: Trade[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  const todayTrades = trades.filter(t => t.timestamp >= todayStart && t.profit !== undefined);
  
  return todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
}

// Main function to calculate trading profile
export function calculateTradingProfile(trades: Trade[]): TradingProfile {
  const winRate = calculateWinRate(trades);
  const avgROI = calculateAvgROI(trades);
  const { best: bestCategory, worst: worstCategory } = getBestAndWorstCategories(trades);
  const preferredSide = getPreferredSide(trades);
  const avgPositionSize = calculateAvgPositionSize(trades);
  const resolvedTrades = trades.filter(t => t.outcome !== "pending");
  const wins = resolvedTrades.filter(t => t.outcome === "win").length;
  const losses = resolvedTrades.filter(t => t.outcome === "loss").length;
  
  const archetypeData = determineArchetype({
    winRate,
    avgROI,
    avgPositionSize,
  });
  
  return {
    winRate,
    avgROI,
    totalTrades: resolvedTrades.length,
    wins,
    losses,
    bestCategory,
    worstCategory,
    preferredSide,
    avgPositionSize,
    archetype: archetypeData.archetype,
    archetypeIcon: archetypeData.icon,
    archetypeColor: archetypeData.color,
  };
}

// Generate daily digest
export function generateDailyDigest(
  trades: Trade[],
  recommendedMarketIds: string[] = []
): DailyDigest {
  const profile = calculateTradingProfile(trades);
  const todayPnL = calculateTodayPnL(trades);
  const winStreak = calculateWinStreak(trades);
  
  return {
    profile,
    todayPnL,
    winStreak,
    recommendedMarkets: recommendedMarketIds,
  };
}
