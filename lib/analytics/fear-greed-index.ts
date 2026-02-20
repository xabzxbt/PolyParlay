// Fear & Greed Index Calculator for PolyParlay
// Custom index for Polymarket based on multiple signals

export interface FearGreedInput {
  priceChanges: number[]; // Array of price changes for top 20 markets (last 24h)
  currentVolume24h: number; // Current 24h volume
  avgVolume7d: number; // Average 7-day volume
  whaleYesBuys: number; // Total whale YES buys
  whaleNoBuys: number; // Total whale NO buys
  marketsAbove50: number; // Number of markets where YES price > 0.5
  totalMarkets: number; // Total number of markets
  freshWalletVolume: number; // Volume from fresh wallets
  totalVolume: number; // Total volume
}

export interface FearGreedResult {
  total: number;
  breakdown: {
    priceMomentum: number;
    volumeMomentum: number;
    whaleNetFlow: number;
    marketBreadth: number;
    freshWalletActivity: number;
  };
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  labelKey: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  icon: string;
}

export interface FearGreedHistory {
  timestamp: number;
  value: number;
  label: string;
}

// Weights for each component
const WEIGHTS = {
  PRICE_MOMENTUM: 0.2,
  VOLUME_MOMENTUM: 0.2,
  WHALE_NET_FLOW: 0.2,
  MARKET_BREADTH: 0.2,
  FRESH_WALLET: 0.2,
} as const;

export function calculateFearGreedIndex(input: FearGreedInput): FearGreedResult {
  // 1. Price Momentum (0-100)
  // Average price change - positive = greed, negative = fear
  const avgPriceChange = input.priceChanges.length > 0
    ? input.priceChanges.reduce((a, b) => a + b, 0) / input.priceChanges.length
    : 0;
  // Normalize to 0-100: -1 -> 0, 0 -> 50, +1 -> 100
  const priceMomentum = Math.max(0, Math.min(100, (avgPriceChange + 1) * 50));

  // 2. Volume Momentum (0-100)
  // current24hVolume / avg7dVolume * 50, capped at 100
  const volumeRatio = input.avgVolume7d > 0
    ? (input.currentVolume24h / input.avgVolume7d) * 50
    : 50;
  const volumeMomentum = Math.min(100, Math.max(0, volumeRatio));

  // 3. Whale Net Flow (0-100)
  // (whaleYesBuys - whaleNoBuys) normalized
  const whaleNetFlow = input.whaleYesBuys + input.whaleNoBuys > 0
    ? ((input.whaleYesBuys - input.whaleNoBuys) / (input.whaleYesBuys + input.whaleNoBuys) + 1) * 50
    : 50;

  // 4. Market Breadth (0-100)
  // % of markets where YES price > 0.5
  const marketBreadth = input.totalMarkets > 0
    ? (input.marketsAbove50 / input.totalMarkets) * 100
    : 50;

  // 5. Fresh Wallet Activity (0-100)
  // freshWalletVolume / totalVolume * 100
  const freshWalletActivity = input.totalVolume > 0
    ? (input.freshWalletVolume / input.totalVolume) * 100
    : 50;

  // Calculate weighted total
  const total =
    priceMomentum * WEIGHTS.PRICE_MOMENTUM +
    volumeMomentum * WEIGHTS.VOLUME_MOMENTUM +
    whaleNetFlow * WEIGHTS.WHALE_NET_FLOW +
    marketBreadth * WEIGHTS.MARKET_BREADTH +
    freshWalletActivity * WEIGHTS.FRESH_WALLET;

  // Determine label
  let label: FearGreedResult["label"];
  let labelKey: FearGreedResult["labelKey"];
  let icon: string;

  if (total <= 20) {
    label = "Extreme Fear";
    labelKey = "extreme_fear";
    icon = "AlertTriangle";
  } else if (total <= 40) {
    label = "Fear";
    labelKey = "fear";
    icon = "TrendingDown";
  } else if (total <= 60) {
    label = "Neutral";
    labelKey = "neutral";
    icon = "Minus";
  } else if (total <= 80) {
    label = "Greed";
    labelKey = "greed";
    icon = "TrendingUp";
  } else {
    label = "Extreme Greed";
    labelKey = "extreme_greed";
    icon = "Zap";
  }

  return {
    total: Math.round(total),
    breakdown: {
      priceMomentum: Math.round(priceMomentum),
      volumeMomentum: Math.round(volumeMomentum),
      whaleNetFlow: Math.round(whaleNetFlow),
      marketBreadth: Math.round(marketBreadth),
      freshWalletActivity: Math.round(freshWalletActivity),
    },
    label,
    labelKey,
    icon,
  };
}

// Get color for fear/greed value
export function getFearGreedColor(value: number): string {
  if (value <= 20) return "#DC2626"; // dark red
  if (value <= 40) return "#EF4444"; // red
  if (value <= 60) return "#EAB308"; // yellow
  if (value <= 80) return "#22C55E"; // green
  return "#10B981"; // bright green
}

// Get gradient colors for gauge
export function getFearGreedGradient(value: number): string {
  if (value <= 20) return "from-red-900 via-red-800 to-red-700";
  if (value <= 40) return "from-red-800 via-orange-700 to-orange-600";
  if (value <= 60) return "from-orange-600 via-yellow-500 to-yellow-400";
  if (value <= 80) return "from-yellow-500 via-lime-500 to-green-500";
  return "from-green-500 via-emerald-400 to-emerald-300";
}

// Calculate needle rotation (0-180 degrees)
export function getNeedleRotation(value: number): number {
  // Map 0-100 to 0-180 degrees
  return (value / 100) * 180;
}

// Get label color
export function getLabelColor(label: FearGreedResult["labelKey"]): string {
  switch (label) {
    case "extreme_fear":
      return "text-red-500";
    case "fear":
      return "text-orange-500";
    case "neutral":
      return "text-yellow-500";
    case "greed":
      return "text-green-500";
    case "extreme_greed":
      return "text-emerald-500";
    default:
      return "text-text-muted";
  }
}

// Historical data should be fetched from Supabase or calculated from real market snapshots
// Empty placeholder removed — use API endpoint /api/analytics/fear-greed for real data
