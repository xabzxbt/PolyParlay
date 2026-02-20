// Quality Score: 0-100 rating for market quality
// Works with basic data (liquidity, volume), enhanced with smart money data
// Falls back gracefully — never blocks rendering

interface QualityInput {
  // Required (always available from Gamma API)
  liquidity: number;
  volume: number;
  volume24hr: number;
  endDate: string;
  marketCount?: number;      // events with more markets = more interesting

  // Optional (from Data API — Phase 3)
  smartMoneyCount?: number;
  smartMoneySentiment?: string;
  recentTradeCount?: number;
}

export interface QualityResult {
  score: number;             // 0-100
  tier: "high" | "mid" | "low" | "dead";
  breakdown: {
    liquidity: number;       // 0-30
    activity: number;        // 0-25
    smartMoney: number;      // 0-25
    health: number;          // 0-20
  };
}

// === Weights ===
const W = {
  liquidity: 0.30,
  activity: 0.25,
  smartMoney: 0.25,
  health: 0.20,
};

// === Score Calculations ===

function liquidityScore(liquidity: number): number {
  // $0 → 0, $5k → 50, $50k → 80, $200k+ → 100
  if (liquidity <= 0) return 0;
  if (liquidity >= 200_000) return 100;
  if (liquidity >= 50_000) return 80 + (liquidity - 50_000) / 150_000 * 20;
  if (liquidity >= 5_000) return 50 + (liquidity - 5_000) / 45_000 * 30;
  return liquidity / 5_000 * 50;
}

function activityScore(volume24hr: number, recentTradeCount?: number): number {
  // Volume component (60%)
  let volScore = 0;
  if (volume24hr >= 100_000) volScore = 100;
  else if (volume24hr >= 10_000) volScore = 70 + (volume24hr - 10_000) / 90_000 * 30;
  else if (volume24hr >= 1_000) volScore = 40 + (volume24hr - 1_000) / 9_000 * 30;
  else volScore = volume24hr / 1_000 * 40;

  // Trade count component (40%) — optional
  let tradeScore = 50; // default if no data
  if (recentTradeCount !== undefined) {
    if (recentTradeCount >= 100) tradeScore = 100;
    else if (recentTradeCount >= 20) tradeScore = 60 + (recentTradeCount - 20) / 80 * 40;
    else tradeScore = recentTradeCount / 20 * 60;
  }

  return volScore * 0.6 + tradeScore * 0.4;
}

function smartMoneyScore(count?: number, sentiment?: string): number {
  // If no smart money data, return neutral score (not 0, to avoid penalizing)
  if (count === undefined) return 40;
  if (count === 0) return 10;

  let base = Math.min(count * 15, 70); // each smart trader adds 15, max 70

  // Sentiment bonus
  if (sentiment === "bullish" || sentiment === "bearish") base += 30;
  else if (sentiment === "mixed") base += 15;

  return Math.min(base, 100);
}

function healthScore(endDate: string, volume: number, liquidity: number, marketCount?: number): number {
  let score = 0;

  // Time to resolution (more time = healthier, but not too far)
  const msLeft = new Date(endDate).getTime() - Date.now();
  const daysLeft = msLeft / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) score += 0;        // expired
  else if (daysLeft < 1) score += 10;   // ending very soon
  else if (daysLeft < 7) score += 30;   // ending this week
  else if (daysLeft < 30) score += 40;  // sweet spot
  else if (daysLeft < 90) score += 35;
  else score += 25;                     // too far out

  // Volume/liquidity ratio (shows market is actively traded)
  const vlRatio = liquidity > 0 ? volume / liquidity : 0;
  if (vlRatio >= 5) score += 30;
  else if (vlRatio >= 2) score += 25;
  else if (vlRatio >= 1) score += 20;
  else score += 10;

  // Multi-market bonus
  if (marketCount && marketCount >= 3) score += 30;
  else if (marketCount && marketCount >= 2) score += 20;
  else score += 10;

  return Math.min(score, 100);
}

// === Main Calculator ===

function calculateQualityScore(input: QualityInput): QualityResult {
  const liq = liquidityScore(input.liquidity);
  const act = activityScore(input.volume24hr, input.recentTradeCount);
  const sm = smartMoneyScore(input.smartMoneyCount, input.smartMoneySentiment);
  const hp = healthScore(input.endDate, input.volume, input.liquidity, input.marketCount);

  const breakdown = {
    liquidity: Math.round(liq * W.liquidity),
    activity: Math.round(act * W.activity),
    smartMoney: Math.round(sm * W.smartMoney),
    health: Math.round(hp * W.health),
  };

  const score = breakdown.liquidity + breakdown.activity + breakdown.smartMoney + breakdown.health;

  let tier: QualityResult["tier"];
  if (score >= 70) tier = "high";
  else if (score >= 40) tier = "mid";
  else if (score > 10) tier = "low";
  else tier = "dead";

  return { score, tier, breakdown };
}

// Convenience: calculate for an event (averaged over its markets)
export function calculateEventQualityScore(event: {
  liquidity: number; volume: number; volume24hr: number;
  endDate: string; marketCount: number;
  smartMoneyCount?: number; smartMoneySentiment?: string;
}): QualityResult {
  return calculateQualityScore({
    liquidity: event.liquidity,
    volume: event.volume,
    volume24hr: event.volume24hr,
    endDate: event.endDate,
    marketCount: event.marketCount,
    smartMoneyCount: event.smartMoneyCount,
    smartMoneySentiment: event.smartMoneySentiment,
  });
}
