export interface ParlayLeg {
  id: string;
  marketId: string;
  tokenId: string;
  question: string;
  outcome: string; // "Yes" or "No"
  price: number; // 0-1
  side: "YES" | "NO";
  category?: string;
  endDate?: string;
  liquidity?: number;
}

export interface ParlayCalculation {
  legs: ParlayLeg[];
  stake: number;
  combinedOdds: number;
  impliedProbability: number;
  potentialPayout: number;
  roi: number;
  stakePerLeg: number;
  legDetails: {
    leg: ParlayLeg;
    stake: number;
    shares: number;
    potentialReturn: number;
  }[];
}

// Calculate parlay odds and payouts
export function calculateParlay(
  legs: ParlayLeg[],
  stake: number
): ParlayCalculation {
  if (legs.length === 0 || stake <= 0) {
    return {
      legs,
      stake,
      combinedOdds: 0,
      impliedProbability: 0,
      potentialPayout: 0,
      roi: 0,
      stakePerLeg: 0,
      legDetails: [],
    };
  }

  // Combined odds = product of (1/price) for each leg
  const combinedOdds = legs.reduce((acc, leg) => acc * (1 / leg.price), 1);
  const impliedProbability = 1 / combinedOdds;
  const potentialPayout = stake * combinedOdds;
  const roi = (potentialPayout - stake) / stake;
  const stakePerLeg = stake / legs.length;

  const legDetails = legs.map((leg) => {
    const legStake = stakePerLeg;
    const shares = legStake / leg.price;
    const potentialReturn = shares; // Each share pays $1 if won
    return {
      leg,
      stake: legStake,
      shares,
      potentialReturn,
    };
  });

  return {
    legs,
    stake,
    combinedOdds,
    impliedProbability,
    potentialPayout,
    roi,
    stakePerLeg,
    legDetails,
  };
}

// Correlation matrix: defines which market types tend to correlate
const CORRELATION_CATEGORIES: Record<string, string[]> = {
  politics: ["trump", "biden", "republican", "democrat", "election", "senate", "congress", "president", "gop", "dnc", "vote", "polls"],
  sports: ["nba", "nfl", "mlb", "nhl", "soccer", "football", "basketball", "tennis", "golf", "boxing", "mma", "ufc", "olympics", "world cup"],
  crypto: ["bitcoin", "btc", "ethereum", "eth", "crypto", "defi", "solana", "dogecoin", "xrp", "token", "blockchain"],
  economy: ["fed", "interest rate", "inflation", "gdp", "recession", "unemployment", "jobs", "economy", "federal reserve", "rate hike"],
  tech: ["ai", "openai", "google", "apple", "microsoft", "meta", "facebook", "amazon", "tesla", "nvidia", "tech", "semiconductor"],
};

export interface CorrelationWarning {
  message: string;
  level: "HIGH" | "MEDIUM";
}

// Get numeric correlation estimate for a pair of legs
function getCorrelationValue(legA: ParlayLeg, legB: ParlayLeg): number {
  if (legA.marketId === legB.marketId) return 1.0;

  const questionA = legA.question.toLowerCase();
  const questionB = legB.question.toLowerCase();

  let matchScore = 0;

  for (const [category, keywords] of Object.entries(CORRELATION_CATEGORIES)) {
    const matchesA = keywords.filter(w => questionA.includes(w)).length;
    const matchesB = keywords.filter(w => questionB.includes(w)).length;
    if (matchesA > 0 && matchesB > 0) {
      matchScore += 0.5 + (0.1 * Math.min(matchesA, matchesB));
    }
  }

  const hasPoliticalA = CORRELATION_CATEGORIES.politics.some(w => questionA.includes(w));
  const hasPoliticalB = CORRELATION_CATEGORIES.politics.some(w => questionB.includes(w));
  const hasEconomyA = CORRELATION_CATEGORIES.economy.some(w => questionA.includes(w));
  const hasEconomyB = CORRELATION_CATEGORIES.economy.some(w => questionB.includes(w));

  if ((hasPoliticalA && hasEconomyB) || (hasEconomyA && hasPoliticalB)) {
    matchScore += 0.45;
  }

  // Base category match
  if (legA.category && legA.category === legB.category && legA.category !== "other" && matchScore === 0) {
    matchScore += 0.42;
  }

  return parseFloat(Math.min(0.95, matchScore).toFixed(2));
}

// Get correlation warnings for a set of legs
export function getCorrelationWarnings(legs: ParlayLeg[]): CorrelationWarning[] {
  const warnings: CorrelationWarning[] = [];

  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const corr = getCorrelationValue(legs[i], legs[j]);
      if (corr > 0.7) {
        warnings.push({
          message: `These markets are highly correlated (${corr.toFixed(2)}) - your parlay risk is higher than it appears`,
          level: "HIGH"
        });
      } else if (corr >= 0.4) {
        warnings.push({
          message: `These markets show medium correlation (${corr.toFixed(2)}) - true odds may be lower`,
          level: "MEDIUM"
        });
      }
    }
  }

  return warnings;
}

/**
 * Estimate slippage for a given stake size based on liquidity
 * Uses a simplified model: assumes uniform distribution of liquidity
 * and calculates price impact based on stake/liquidity ratio
 * @param leg The market leg
 * @param stake The stake amount in USD
 * @returns Estimated slippage percentage
 */
export function estimateSlippage(leg: ParlayLeg, stake: number): number {
  if (!leg.liquidity || leg.liquidity <= 0 || stake <= 0) {
    return 0;
  }

  // Use liquidity-based slippage model
  // Liquidity represents total USD available at reasonable prices
  // For simplicity, we use a quadratic model: slippage increases with square of stake/liquidity ratio
  const ratio = stake / leg.liquidity;

  // Quadratic slippage model:
  // - At 1% of liquidity: ~0.1% slippage
  // - At 5% of liquidity: ~2.5% slippage  
  // - At 10% of liquidity: ~10% slippage
  const slippage = Math.pow(ratio, 1.5) * 100;

  // Cap at 99%
  return Math.min(slippage, 99);
}

/**
 * Calculate estimated slippage for the entire parlay
 * @param legs Array of parlay legs
 * @param stake Total stake amount
 * @returns Object with per-leg and total slippage estimates
 */
export function calculateParlaySlippage(
  legs: ParlayLeg[],
  stake: number
): {
  totalSlippage: number;
  legSlippage: { legId: string; slippage: number; stake: number }[];
  warning?: string;
} {
  if (legs.length === 0 || stake <= 0) {
    return { totalSlippage: 0, legSlippage: [] };
  }

  const stakePerLeg = stake / legs.length;
  const legSlippage: { legId: string; slippage: number; stake: number }[] = [];

  for (const leg of legs) {
    const slippage = estimateSlippage(leg, stakePerLeg);
    legSlippage.push({
      legId: leg.id,
      slippage,
      stake: stakePerLeg
    });
  }

  // Combined slippage is roughly the sum (conservative estimate)
  // In reality, slippage affects each leg independently
  const totalSlippage = legSlippage.reduce((sum, l) => sum + l.slippage, 0) / legs.length;

  // Generate warning if significant slippage expected
  let warning: string | undefined;
  if (totalSlippage > 5) {
    warning = `Estimated ${totalSlippage.toFixed(1)}% average slippage due to low liquidity. Consider reducing stake.`;
  }

  return { totalSlippage, legSlippage, warning };
}

// Check liquidity adequacy
export function checkLiquidity(
  leg: ParlayLeg,
  stakePerLeg: number
): { adequate: boolean; warning?: string; estimatedSlippage?: number } {
  if (!leg.liquidity) return { adequate: true };

  const ratio = stakePerLeg / leg.liquidity;

  // Calculate estimated slippage
  const estimatedSlippage = estimateSlippage(leg, stakePerLeg);

  if (ratio > 0.1) {
    return {
      adequate: false,
      warning: `Your stake exceeds 10% of available liquidity on "${leg.question.slice(0, 30)}...". Expect significant slippage.`,
      estimatedSlippage
    };
  }

  if (ratio > 0.05) {
    return {
      adequate: true,
      warning: `Moderate slippage expected on "${leg.question.slice(0, 30)}..." (${(ratio * 100).toFixed(1)}% of liquidity).`,
      estimatedSlippage
    };
  }

  return { adequate: true, estimatedSlippage };
}

// Format odds in different styles
function formatOddsStyle(
  combinedOdds: number,
  style: "decimal" | "american" | "probability" | "fractional"
): string {
  switch (style) {
    case "decimal":
      return `×${combinedOdds.toFixed(2)}`;
    case "american":
      const american = (combinedOdds - 1) * 100;
      return `+${Math.round(american)}`;
    case "probability":
      return `${((1 / combinedOdds) * 100).toFixed(1)}%`;
    case "fractional":
      const num = Math.round((combinedOdds - 1) * 100);
      return `${num}/100`;
    default:
      return `×${combinedOdds.toFixed(2)}`;
  }
}
