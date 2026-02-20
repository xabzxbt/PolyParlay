// Whale Detector for PolyParlay Analytics
// Identifies and tracks large trades ("whales")

export interface WhaleTrade {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  size: number; // in USDC
  price: number;
  timestamp: number;
  traderAddress: string;
  isSmartMoney?: boolean;
}

export interface WhaleActivity {
  marketId: string;
  marketQuestion: string;
  whaleYesVolume: number;
  whaleNoVolume: number;
  whaleCount: number;
  lastActivity: number;
}

export const WHALE_THRESHOLDS = {
  SMALL: 1000, // $1k - standard whale
  LARGE: 10000, // $10k - big whale
  MEGA: 50000, // $50k+ - mega whale
} as const;

export const WHALE_COLORS = {
  YES: "green",
  NO: "red",
} as const;

export interface WhaleFilter {
  minSize?: number;
  side?: "YES" | "NO" | "ALL";
}

// Filter trades by whale criteria
export function isWhaleTrade(size: number, threshold: number = WHALE_THRESHOLDS.SMALL): boolean {
  return size >= threshold;
}

// Get whale classification based on trade size
export function getWhaleClassification(size: number): "small" | "large" | "mega" {
  if (size >= WHALE_THRESHOLDS.MEGA) return "mega";
  if (size >= WHALE_THRESHOLDS.LARGE) return "large";
  return "small";
}

// Calculate whale confidence for a market (0-1)
export function calculateWhaleConfidence(
  whaleYesVolume: number,
  whaleNoVolume: number
): number {
  const total = whaleYesVolume + whaleNoVolume;
  if (total === 0) return 0.5;
  return whaleYesVolume / total;
}

// Get whale sentiment label
export function getWhaleSentiment(confidence: number): "bullish" | "bearish" | "divided" {
  if (confidence > 0.7) return "bullish";
  if (confidence < 0.3) return "bearish";
  return "divided";
}

// Filter whale trades
export function filterWhaleTrades(
  trades: WhaleTrade[],
  filter: WhaleFilter
): WhaleTrade[] {
  return trades.filter((trade) => {
    if (filter.minSize && trade.size < filter.minSize) return false;
    if (filter.side && filter.side !== "ALL" && trade.side !== filter.side) return false;
    return true;
  });
}

// Sort whale trades by size
export function sortWhaleTradesBySize(
  trades: WhaleTrade[],
  descending: boolean = true
): WhaleTrade[] {
  return [...trades].sort((a, b) => {
    return descending ? b.size - a.size : a.size - b.size;
  });
}

// Group whale trades by market
export function groupWhaleTradesByMarket(trades: WhaleTrade[]): Map<string, WhaleActivity> {
  const grouped = new Map<string, WhaleActivity>();

  trades.forEach((trade) => {
    const existing = grouped.get(trade.marketId);
    if (existing) {
      if (trade.side === "YES") {
        existing.whaleYesVolume += trade.size;
      } else {
        existing.whaleNoVolume += trade.size;
      }
      existing.whaleCount += 1;
      existing.lastActivity = Math.max(existing.lastActivity, trade.timestamp);
    } else {
      grouped.set(trade.marketId, {
        marketId: trade.marketId,
        marketQuestion: trade.marketQuestion,
        whaleYesVolume: trade.side === "YES" ? trade.size : 0,
        whaleNoVolume: trade.side === "NO" ? trade.size : 0,
        whaleCount: 1,
        lastActivity: trade.timestamp,
      });
    }
  });

  return grouped;
}

// Get time ago string
export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Format whale trade size
export function formatWhaleSize(size: number): string {
  if (size >= 1000000) return `$${(size / 1000000).toFixed(1)}M`;
  if (size >= 1000) return `$${(size / 1000).toFixed(0)}K`;
  return `$${size.toFixed(0)}`;
}
