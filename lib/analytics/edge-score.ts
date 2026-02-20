// Edge Score Calculator for PolyParlay Analytics
// Calculates 0-100 edge score for markets based on multiple factors

export interface EdgeScoreInput {
  posterior: number; // Bayesian posterior probability
  marketPrice: number; // Current market YES price (0-1)
  liquidity: number; // Current liquidity in USDC
  whaleConfidence: number; // Whale YES% (0-1)
  daysRemaining: number; // Days until market resolves
  volume24h: number; // 24h trading volume in USDC
  avgVolume7d: number; // Average 7-day volume in USDC
}

export interface EdgeScoreResult {
  total: number;
  breakdown: {
    priceEdge: number;
    liquidity: number;
    whaleSignal: number;
    timing: number;
    volumeMomentum: number;
  };
  rating: "Low" | "Medium" | "High" | "HOT";
  recommendedDirection: "YES" | "NO";
  kellyOptimal: number; // Optimal bet size in USDC
}

const PRICE_EDGE_WEIGHT = 25;
const LIQUIDITY_WEIGHT = 20;
const WHALE_SIGNAL_WEIGHT = 20;
const TIMING_WEIGHT = 20;
const VOLUME_MOMENTUM_WEIGHT = 15;

export function calculateEdgeScore(input: EdgeScoreInput): EdgeScoreResult {
  // 1. Price Edge (max 25 pts)
  const priceEdge = Math.abs(input.posterior - input.marketPrice);
  const priceEdgePoints = Math.min(priceEdge * 100, PRICE_EDGE_WEIGHT);

  // 2. Liquidity Score (max 20 pts)
  let liquidityPoints = 0;
  if (input.liquidity > 50000) {
    liquidityPoints = LIQUIDITY_WEIGHT;
  } else if (input.liquidity >= 10000) {
    liquidityPoints = 10;
  } else {
    liquidityPoints = 0;
  }

  // 3. Whale Signal (max 20 pts)
  let whaleSignalPoints = 0;
  if (input.whaleConfidence > 0.7) {
    whaleSignalPoints = WHALE_SIGNAL_WEIGHT;
  } else if (input.whaleConfidence >= 0.5 && input.whaleConfidence <= 0.7) {
    whaleSignalPoints = 10;
  } else if (input.whaleConfidence < 0.3) {
    whaleSignalPoints = 0;
  }

  // 4. Timing Score (max 20 pts)
  let timingPoints = 0;
  if (input.daysRemaining >= 3 && input.daysRemaining <= 30) {
    timingPoints = TIMING_WEIGHT;
  } else if (input.daysRemaining > 30 && input.daysRemaining <= 90) {
    timingPoints = 10;
  } else if (input.daysRemaining < 3) {
    timingPoints = 0;
  } else if (input.daysRemaining > 90) {
    timingPoints = 5;
  }

  // 5. Volume Momentum (max 15 pts)
  let volumeMomentumPoints = 0;
  if (input.avgVolume7d > 0) {
    const volumeRatio = input.volume24h / input.avgVolume7d;
    if (volumeRatio > 1.5) {
      volumeMomentumPoints = VOLUME_MOMENTUM_WEIGHT;
    } else if (volumeRatio > 1) {
      volumeMomentumPoints = 8;
    } else if (volumeRatio < 0.5) {
      volumeMomentumPoints = 0;
    }
  }

  const total =
    priceEdgePoints +
    liquidityPoints +
    whaleSignalPoints +
    timingPoints +
    volumeMomentumPoints;

  // Determine rating
  let rating: EdgeScoreResult["rating"];
  if (total >= 81) {
    rating = "HOT";
  } else if (total >= 61) {
    rating = "High";
  } else if (total >= 31) {
    rating = "Medium";
  } else {
    rating = "Low";
  }

  // Determine recommended direction
  const recommendedDirection: "YES" | "NO" =
    input.posterior > input.marketPrice ? "YES" : "NO";

  // Calculate Kelly optimal bet size
  // Kelly = (bp - q) / b where b = odds - 1, p = probability, q = 1-p
  const b = (1 / input.marketPrice) - 1;
  const p = input.posterior;
  const q = 1 - p;
  const kellyFraction = (b * p - q) / b;
  const kellyOptimal = Math.max(0, kellyFraction * 1000); // Assume $1000 bankroll

  return {
    total: Math.min(Math.round(total), 100),
    breakdown: {
      priceEdge: Math.round(priceEdgePoints),
      liquidity: Math.round(liquidityPoints),
      whaleSignal: Math.round(whaleSignalPoints),
      timing: Math.round(timingPoints),
      volumeMomentum: Math.round(volumeMomentumPoints),
    },
    rating,
    recommendedDirection,
    kellyOptimal: Math.round(kellyOptimal),
  };
}

export function getEdgeScoreColor(rating: EdgeScoreResult["rating"]): string {
  switch (rating) {
    case "HOT":
      return "bg-red-500";
    case "High":
      return "bg-orange-500";
    case "Medium":
      return "bg-yellow-500";
    case "Low":
    default:
      return "bg-slate-500";
  }
}

export function getEdgeScoreTextColor(rating: EdgeScoreResult["rating"]): string {
  switch (rating) {
    case "HOT":
      return "text-red-500";
    case "High":
      return "text-orange-500";
    case "Medium":
      return "text-yellow-500";
    case "Low":
    default:
      return "text-text-muted";
  }
}

export function getEdgeScoreBorderColor(rating: EdgeScoreResult["rating"]): string {
  switch (rating) {
    case "HOT":
      return "border-red-500";
    case "High":
      return "border-orange-500";
    case "Medium":
      return "border-yellow-500";
    case "Low":
    default:
      return "border-slate-500";
  }
}
