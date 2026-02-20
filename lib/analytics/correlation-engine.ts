// Correlation Engine for PolyParlay Analytics
// Calculates price correlations between markets

export interface MarketPrice {
  marketId: string;
  prices: number[]; // Historical prices over time
}

export interface CorrelationResult {
  marketA: string;
  marketB: string;
  correlation: number; // -1 to 1
}

// Calculate Pearson correlation coefficient
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  // Calculate covariance and standard deviations
  let covariance = 0;
  let stdX = 0;
  let stdY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    covariance += dx * dy;
    stdX += dx * dx;
    stdY += dy * dy;
  }
  
  if (stdX === 0 || stdY === 0) return 0;
  
  return covariance / Math.sqrt(stdX * stdY);
}

// Build correlation matrix for multiple markets
export function buildCorrelationMatrix(prices: MarketPrice[]): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      const correlation = calculateCorrelation(
        prices[i].prices,
        prices[j].prices
      );
      
      results.push({
        marketA: prices[i].marketId,
        marketB: prices[j].marketId,
        correlation,
      });
    }
  }
  
  return results;
}

// Get correlation color
export function getCorrelationColor(correlation: number): string {
  if (correlation > 0.7) return "bg-green-800"; // strong positive
  if (correlation > 0.3) return "bg-green-600"; // positive
  if (correlation > -0.3) return "bg-slate-600"; // no correlation
  if (correlation > -0.7) return "bg-red-500"; // negative
  return "bg-red-800"; // strong negative
}

// Get correlated markets for a specific market
export function getCorrelatedMarkets(
  marketId: string,
  correlations: CorrelationResult[],
  minCorrelation: number = 0.5
): CorrelationResult[] {
  return correlations
    .filter(c => 
      (c.marketA === marketId || c.marketB === marketId) &&
      Math.abs(c.correlation) >= minCorrelation
    )
    .map(c => ({
      marketA: c.marketA === marketId ? c.marketA : c.marketB,
      marketB: c.marketB === marketId ? c.marketA : c.marketB,
      correlation: c.correlation,
    }))
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

// Get positively correlated markets (for parlay building warning)
export function getHighlyCorrelatedPairs(
  correlations: CorrelationResult[],
  threshold: number = 0.7
): CorrelationResult[] {
  return correlations
    .filter(c => c.correlation >= threshold)
    .sort((a, b) => b.correlation - a.correlation);
}

// Check if two markets are highly correlated
export function areHighlyCorrelated(
  marketA: string,
  marketB: string,
  correlations: CorrelationResult[],
  threshold: number = 0.7
): boolean {
  const correlation = correlations.find(
    c => (c.marketA === marketA && c.marketB === marketB) ||
         (c.marketA === marketB && c.marketB === marketA)
  );
  
  return correlation !== undefined && correlation.correlation >= threshold;
}
