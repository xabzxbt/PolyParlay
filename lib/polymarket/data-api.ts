// Market analytics using PUBLIC Polymarket CLOB endpoints (NO auth required)
//
// Public endpoints used:
//   GET https://clob.polymarket.com/prices-history?market={tokenId}&interval=1d
//   GET https://clob.polymarket.com/book?token_id={tokenId}
//   GET https://clob.polymarket.com/midpoint?token_id={tokenId}
//   GET https://clob.polymarket.com/last-trade-price/{tokenId}
//
// These are all documented at: https://docs.polymarket.com/developers/CLOB/timeseries

const CLOB_BASE = "https://clob.polymarket.com";

// === Types ===

interface PricePoint {
  t: number;  // unix timestamp
  p: number;  // price
}

interface OrderBookSummary {
  bidDepth: number;      // total USDC on buy side
  askDepth: number;      // total USDC on sell side
  bidCount: number;      // number of bid levels
  askCount: number;      // number of ask levels
  bestBid: number;
  bestAsk: number;
  spread: number;
  midpoint: number;
  imbalance: number;     // -1 to +1 (positive = more buy pressure)
}

interface MarketAnalytics {
  yesBook: OrderBookSummary | null;
  noBook: OrderBookSummary | null;
  priceHistory: PricePoint[];
  priceChange24h: number;       // price change in last 24h
  volatility: number;           // std dev of recent prices
  buyPressure: number;          // 0-100 (from order book imbalance)
  trend: "bullish" | "bearish" | "neutral";
  lastTradePrice: number | null;
}

// === Helper ===

async function publicFetch<T>(url: string, timeoutMs = 5000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// === Public CLOB: Order Book ===

function summarizeBook(book: any): OrderBookSummary | null {
  if (!book) return null;
  const bids: { price: number; size: number }[] = (book.bids || []).map((b: any) => ({
    price: parseFloat(b.price), size: parseFloat(b.size),
  }));
  const asks: { price: number; size: number }[] = (book.asks || []).map((a: any) => ({
    price: parseFloat(a.price), size: parseFloat(a.size),
  }));

  const bidDepth = bids.reduce((s, b) => s + b.price * b.size, 0);
  const askDepth = asks.reduce((s, a) => s + a.price * a.size, 0);
  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 1;
  const spread = bestAsk - bestBid;
  const midpoint = (bestBid + bestAsk) / 2;
  const total = bidDepth + askDepth;
  const imbalance = total > 0 ? (bidDepth - askDepth) / total : 0;

  return {
    bidDepth, askDepth, bidCount: bids.length, askCount: asks.length,
    bestBid, bestAsk, spread, midpoint, imbalance,
  };
}

// === Public CLOB: Price History ===

function calcVolatility(prices: PricePoint[]): number {
  if (prices.length < 3) return 0;
  const vals = prices.map(p => p.p);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

function calc24hChange(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;
  const now = prices[prices.length - 1].p;
  const cutoff = Date.now() / 1000 - 86400;
  // Find price closest to 24h ago
  let old = prices[0].p;
  for (const p of prices) {
    if (p.t <= cutoff) old = p.p;
    else break;
  }
  return old > 0 ? (now - old) / old : 0;
}

// === Main function: Get full analytics for a market ===

export async function getMarketAnalytics(
  yesTokenId: string,
  noTokenId: string,
): Promise<MarketAnalytics> {
  // Fire all requests in parallel — all PUBLIC, no auth needed
  const [yesBookRaw, noBookRaw, historyRaw, lastPriceRaw] = await Promise.all([
    yesTokenId ? publicFetch<any>(`${CLOB_BASE}/book?token_id=${yesTokenId}`) : null,
    noTokenId ? publicFetch<any>(`${CLOB_BASE}/book?token_id=${noTokenId}`) : null,
    yesTokenId ? publicFetch<any>(`${CLOB_BASE}/prices-history?market=${yesTokenId}&interval=1d&fidelity=60`) : null,
    yesTokenId ? publicFetch<any>(`${CLOB_BASE}/last-trade-price/${yesTokenId}`) : null,
  ]);

  const yesBook = summarizeBook(yesBookRaw);
  const noBook = summarizeBook(noBookRaw);

  // Price history
  const priceHistory: PricePoint[] = (historyRaw?.history || []).map((h: any) => ({
    t: h.t, p: h.p,
  }));

  const priceChange24h = calc24hChange(priceHistory);
  const volatility = calcVolatility(priceHistory);

  // Buy pressure from order book imbalance (yes side)
  let buyPressure = 50;
  if (yesBook) {
    buyPressure = Math.round(50 + yesBook.imbalance * 50); // 0-100
  }

  // Trend determination
  let trend: "bullish" | "bearish" | "neutral" = "neutral";
  if (priceChange24h > 0.03) trend = "bullish";
  else if (priceChange24h < -0.03) trend = "bearish";

  const lastTradePrice = lastPriceRaw?.price ? parseFloat(lastPriceRaw.price) : null;

  return {
    yesBook, noBook, priceHistory,
    priceChange24h, volatility, buyPressure, trend, lastTradePrice,
  };
}

// === Convenience: get analytics for multiple markets in an event ===

export async function getEventAnalytics(
  markets: { id: string; yesTokenId: string; noTokenId: string; question: string }[],
): Promise<{ marketId: string; question: string; analytics: MarketAnalytics }[]> {
  // Fetch top 3 markets in parallel (rate limit friendly)
  const top = markets.slice(0, 3);
  const results = await Promise.all(
    top.map(async (m) => {
      const analytics = await getMarketAnalytics(m.yesTokenId, m.noTokenId);
      return { marketId: m.id, question: m.question, analytics };
    })
  );
  return results.filter(r => r.analytics.yesBook || r.analytics.priceHistory.length > 0);
}
