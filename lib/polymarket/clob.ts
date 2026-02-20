// CLOB API — Polymarket's Central Limit Order Book
// Docs: https://docs.polymarket.com/#clob-api

const CLOB_BASE = "https://clob.polymarket.com";

interface OrderBookEntry {
  price: string;
  size: string;
}

interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  hash: string;
  timestamp: string;
}

interface PriceResponse {
  price: string;
}

interface MidpointResponse {
  mid: string;
}

// Get current price for a token
export async function getPrice(tokenId: string, side: "BUY" | "SELL" = "BUY"): Promise<number> {
  const res = await fetch(`${CLOB_BASE}/price?token_id=${tokenId}&side=${side}`);
  if (!res.ok) throw new Error(`CLOB price error: ${res.status}`);
  const data: PriceResponse = await res.json();
  return parseFloat(data.price);
}

// Get midpoint price
async function getMidpoint(tokenId: string): Promise<number> {
  const res = await fetch(`${CLOB_BASE}/midpoint?token_id=${tokenId}`);
  if (!res.ok) throw new Error(`CLOB midpoint error: ${res.status}`);
  const data: MidpointResponse = await res.json();
  return parseFloat(data.mid);
}

// Get order book
async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const res = await fetch(`${CLOB_BASE}/book?token_id=${tokenId}`);
  if (!res.ok) throw new Error(`CLOB book error: ${res.status}`);
  return res.json();
}

// Get multiple prices in batch
async function getPrices(tokenIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  // CLOB doesn't have batch endpoint, so parallel fetch
  await Promise.all(
    tokenIds.map(async (id) => {
      try {
        const price = await getPrice(id);
        prices.set(id, price);
      } catch {
        // Skip failed prices
      }
    })
  );
  return prices;
}

// Get recent trades for a token (REAL trade data!)
// Docs: https://docs.polymarket.com/#trades
interface ClobTrade {
  id: string;
  asset_id: string;
  market: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  status: string;
  match_time: string;
  outcome: string;
  owner: string;
  maker_address: string;
  transaction_hash?: string;
}

async function getTrades(tokenId: string, limit = 100): Promise<ClobTrade[]> {
  try {
    const res = await fetch(`${CLOB_BASE}/trades?asset_id=${tokenId}&limit=${limit}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Get trades for BOTH sides of a market (yes + no tokens)
async function getMarketTrades(yesTokenId: string, noTokenId: string, limit = 50): Promise<{
  trades: ClobTrade[];
  buyVolume: number;
  sellVolume: number;
  traderAddresses: string[];
}> {
  const [yesTrades, noTrades] = await Promise.all([
    getTrades(yesTokenId, limit),
    getTrades(noTokenId, limit),
  ]);

  const allTrades = [...yesTrades, ...noTrades]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, limit);

  let buyVol = 0, sellVol = 0;
  const traders = new Set<string>();

  for (const t of allTrades) {
    const size = parseFloat(t.size) || 0;
    const price = parseFloat(t.price) || 0;
    const usdValue = size * price;
    if (t.side === "BUY") buyVol += usdValue;
    else sellVol += usdValue;
    if (t.maker_address) traders.add(t.maker_address);
    if (t.owner) traders.add(t.owner);
  }

  return {
    trades: allTrades,
    buyVolume: buyVol,
    sellVolume: sellVol,
    traderAddresses: [...traders],
  };
}

// Calculate available liquidity at a price level
function calculateLiquidity(book: OrderBook, side: "BUY" | "SELL", maxSlippage: number = 0.05): {
  totalSize: number;
  avgPrice: number;
  worstPrice: number;
} {
  const entries = side === "BUY" ? book.asks : book.bids;
  if (entries.length === 0) return { totalSize: 0, avgPrice: 0, worstPrice: 0 };

  const basePrice = parseFloat(entries[0].price);
  let totalSize = 0;
  let totalCost = 0;

  for (const entry of entries) {
    const price = parseFloat(entry.price);
    const size = parseFloat(entry.size);

    // Check if still within slippage tolerance
    const slip = Math.abs(price - basePrice) / basePrice;
    if (slip > maxSlippage) break;

    totalSize += size;
    totalCost += price * size;
  }

  return {
    totalSize,
    avgPrice: totalSize > 0 ? totalCost / totalSize : 0,
    worstPrice: totalSize > 0 ? parseFloat(entries[entries.length - 1].price) : 0,
  };
}

// Estimate execution quality for a given stake
async function estimateExecution(tokenId: string, stakeUSD: number): Promise<{
  feasible: boolean;
  estimatedShares: number;
  avgPrice: number;
  slippage: number;
  warning?: string;
}> {
  try {
    const book = await getOrderBook(tokenId);
    const midPrice = parseFloat(book.asks[0]?.price || "0.5");

    let filledUSD = 0;
    let filledShares = 0;

    for (const ask of book.asks) {
      const price = parseFloat(ask.price);
      const size = parseFloat(ask.size);
      const available = price * size;

      if (filledUSD + available >= stakeUSD) {
        const remaining = stakeUSD - filledUSD;
        filledShares += remaining / price;
        filledUSD = stakeUSD;
        break;
      }

      filledUSD += available;
      filledShares += size;
    }

    const avgPrice = filledUSD > 0 ? filledUSD / filledShares : midPrice;
    const slippage = (avgPrice - midPrice) / midPrice;

    return {
      feasible: filledUSD >= stakeUSD * 0.95,
      estimatedShares: filledShares,
      avgPrice,
      slippage,
      warning: slippage > 0.05
        ? `High slippage: ${(slippage * 100).toFixed(1)}%`
        : filledUSD < stakeUSD * 0.95
        ? "Insufficient liquidity for full order"
        : undefined,
    };
  } catch (err) {
    return {
      feasible: false,
      estimatedShares: 0,
      avgPrice: 0,
      slippage: 0,
      warning: "Could not fetch order book",
    };
  }
}
