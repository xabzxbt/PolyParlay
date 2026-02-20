// Divergence Calculator for Smart vs Retail Analysis
// Calculates where whales and retail traders disagree

export interface DivergenceResult {
  marketId: string;
  marketQuestion: string;
  whaleYesPercent: number; // 0-1
  retailYesPercent: number; // 0-1
  divergence: number; // -1 to 1 (whale% - retail%)
  signal: "buy" | "sell" | "agreement";
}

export interface MarketTradeData {
  marketId: string;
  marketQuestion: string;
  largeTrades: Array<{ side: "YES" | "NO"; size: number }>; // > $1000
  smallTrades: Array<{ side: "YES" | "NO"; size: number }>; // < $100
}

// Calculate whale YES percentage from large trades
export function calculateWhaleYesPercent(trades: Array<{ side: "YES" | "NO"; size: number }>): number {
  if (trades.length === 0) return 0.5;
  
  const totalSize = trades.reduce((sum, t) => sum + t.size, 0);
  if (totalSize === 0) return 0.5;
  
  const yesSize = trades.filter(t => t.side === "YES").reduce((sum, t) => sum + t.size, 0);
  return yesSize / totalSize;
}

// Calculate retail YES percentage from small trades
export function calculateRetailYesPercent(trades: Array<{ side: "YES" | "NO"; size: number }>): number {
  if (trades.length === 0) return 0.5;
  
  const totalSize = trades.reduce((sum, t) => sum + t.size, 0);
  if (totalSize === 0) return 0.5;
  
  const yesSize = trades.filter(t => t.side === "YES").reduce((sum, t) => sum + t.size, 0);
  return yesSize / totalSize;
}

// Calculate divergence for a market
export function calculateDivergence(data: MarketTradeData): DivergenceResult {
  const whaleYesPercent = calculateWhaleYesPercent(data.largeTrades);
  const retailYesPercent = calculateRetailYesPercent(data.smallTrades);
  const divergence = whaleYesPercent - retailYesPercent;

  let signal: DivergenceResult["signal"];
  if (divergence > 0.2) {
    signal = "buy"; // Whales bullish, retail bearish
  } else if (divergence < -0.2) {
    signal = "sell"; // Whales bearish, retail bullish
  } else {
    signal = "agreement";
  }

  return {
    marketId: data.marketId,
    marketQuestion: data.marketQuestion,
    whaleYesPercent,
    retailYesPercent,
    divergence,
    signal,
  };
}

// Calculate divergence for multiple markets
export function calculateAllDivergences(markets: MarketTradeData[]): DivergenceResult[] {
  return markets
    .map(calculateDivergence)
    .sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));
}

// Get top divergence opportunities
export function getTopDivergences(results: DivergenceResult[], count: number = 10): DivergenceResult[] {
  return results.slice(0, count);
}

// Get signal color
export function getSignalColor(signal: DivergenceResult["signal"]): string {
  switch (signal) {
    case "buy":
      return "text-green-500";
    case "sell":
      return "text-red-500";
    default:
      return "text-text-muted";
  }
}

// Get signal icon
export function getSignalLabel(signal: DivergenceResult["signal"]): string {
  switch (signal) {
    case "buy":
      return "Potential BUY";
    case "sell":
      return "Potential SELL";
    default:
      return "Agreement";
  }
}

// Format divergence percentage
export function formatDivergence(divergence: number): string {
  const percentage = Math.abs(divergence) * 100;
  const sign = divergence > 0 ? "+" : "-";
  return `${sign}${percentage.toFixed(0)}%`;
}
