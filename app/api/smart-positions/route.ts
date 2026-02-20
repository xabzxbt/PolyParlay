import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/smart-positions?yes_token=X&no_token=Y&yes_price=0.76&condition_id=0x...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yesToken = searchParams.get("yes_token") || "";
    const noToken = searchParams.get("no_token") || "";
    const yesPrice = parseFloat(searchParams.get("yes_price") || "0.5");
    const noPrice = 1 - yesPrice;
    const conditionId = searchParams.get("condition_id") || "";

    if (!yesToken && !noToken) {
      return NextResponse.json({ success: false, error: "token IDs required" }, { status: 400 });
    }

    // ====== 1. Fetch REAL on-chain positions from /holders ======
    // This is the source of truth for current positions (actual ERC1155 balances)
    let holdersData: HolderEntry[] = [];
    let resolvedConditionId = conditionId;

    // Fetch Orderbook for Slippage & Imbalance (Parallel fetch)
    const [orderBookYes, orderBookNo] = await Promise.all([
      yesToken ? fetchOrderBook(yesToken) : null,
      noToken ? fetchOrderBook(noToken) : null
    ]);

    if (resolvedConditionId) {
      holdersData = await fetchHolders(resolvedConditionId);
    } else {
      // Fallback: get conditionId from a trade
      const sampleTrade = await fetchTrades(yesToken || noToken, 1);
      if (sampleTrade.length > 0 && sampleTrade[0].conditionId) {
        resolvedConditionId = sampleTrade[0].conditionId;
        holdersData = await fetchHolders(resolvedConditionId);
      }
    }

    // Build holders map: address -> { yesShares, noShares, name, image }
    const holdersMap = new Map<string, HolderPosition>();
    for (const tokenGroup of holdersData) {
      for (const h of tokenGroup.holders) {
        const addr = h.proxyWallet?.toLowerCase() || "";
        if (!addr) continue;
        const existing = holdersMap.get(addr) || {
          address: h.proxyWallet,
          yesShares: 0, noShares: 0,
          name: resolveDisplayName(h),
          image: h.profileImageOptimized || h.profileImage || "",
          verified: h.verified || false,
        };
        // outcomeIndex: 0 = YES, 1 = NO
        if (h.outcomeIndex === 0) {
          existing.yesShares += h.amount || 0;
        } else {
          existing.noShares += h.amount || 0;
        }
        holdersMap.set(addr, existing);
      }
    }

    // ====== 2. Fetch ALL trades for accurate PnL calculation + trade history ======
    const [yesRaw, noRaw] = await Promise.all([
      yesToken ? fetchTrades(yesToken, 1000000) : [],
      noToken ? fetchTrades(noToken, 1000000) : [],
    ]);

    // Parse trades + extract profiles from trade data
    const allTrades: Trade[] = [];
    const tradeProfiles = new Map<string, { name: string; image: string }>();

    for (const t of yesRaw) {
      const size = parseFloat(t.size || "0");
      const price = parseFloat(t.price || "0");
      const usd = size * price;
      if (usd < 0.5) continue;
      const addr = (t.proxyWallet || t.maker_address || "").toLowerCase();
      allTrades.push({
        id: t.id || `${t.timestamp}-${addr}`,
        address: addr,
        action: t.side === "BUY" ? "BUY" : "SELL",
        tokenSide: "YES",
        shares: size,
        price,
        usd: Math.round(usd * 100) / 100,
        time: t.timestamp ? new Date(t.timestamp * 1000).toISOString() : new Date().toISOString(),
        txHash: t.transactionHash || "",
      });
      collectTradeProfile(tradeProfiles, addr, t);
    }

    for (const t of noRaw) {
      const size = parseFloat(t.size || "0");
      const price = parseFloat(t.price || "0");
      const usd = size * price;
      if (usd < 0.5) continue;
      const addr = (t.proxyWallet || t.maker_address || "").toLowerCase();
      allTrades.push({
        id: t.id || `${t.timestamp}-${addr}`,
        address: addr,
        action: t.side === "BUY" ? "BUY" : "SELL",
        tokenSide: "NO",
        shares: size,
        price,
        usd: Math.round(usd * 100) / 100,
        time: t.timestamp ? new Date(t.timestamp * 1000).toISOString() : new Date().toISOString(),
        txHash: t.transactionHash || "",
      });
      collectTradeProfile(tradeProfiles, addr, t);
    }

    allTrades.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // ====== 3. Calculate PnL from trades (cost basis) ======
    // Aggregate buys and sells per wallet to compute cost basis
    const costMap = new Map<string, CostBasis>();
    for (const t of allTrades) {
      const c = costMap.get(t.address) || {
        yesBuyCost: 0, yesSellProceeds: 0,
        noBuyCost: 0, noSellProceeds: 0,
        trades: 0, firstTrade: t.time, lastTrade: t.time,
      };
      if (t.tokenSide === "YES") {
        if (t.action === "BUY") c.yesBuyCost += t.usd;
        else c.yesSellProceeds += t.usd;
      } else {
        if (t.action === "BUY") c.noBuyCost += t.usd;
        else c.noSellProceeds += t.usd;
      }
      c.trades++;
      if (t.time < c.firstTrade) c.firstTrade = t.time;
      if (t.time > c.lastTrade) c.lastTrade = t.time;
      costMap.set(t.address, c);
    }

    // ====== 4. Build final positions by combining holders + cost basis ======
    // Priority: holders data (real positions) > trade-derived positions
    const yesPositions: Position[] = [];
    const noPositions: Position[] = [];
    const whales: Position[] = [];
    const processedAddrs = new Set<string>();

    // First: process holders (source of truth for current positions)
    for (const [addr, h] of holdersMap) {
      processedAddrs.add(addr);
      const cost = costMap.get(addr);
      const tradeProf = tradeProfiles.get(addr);

      // Merge profile: prefer holders data, supplement with trade data
      const name = (h.name && h.name !== "") ? h.name : (tradeProf?.name || "");
      const image = h.image || tradeProf?.image || "";

      // PnL = (sell proceeds) + (current holdings value) - (buy cost)
      // Current holdings come from /holders (REAL on-chain data)
      const currentValue = (h.yesShares * yesPrice) + (h.noShares * noPrice);
      const totalCashIn = (cost?.yesBuyCost || 0) + (cost?.noBuyCost || 0);
      const totalCashOut = (cost?.yesSellProceeds || 0) + (cost?.noSellProceeds || 0);
      const pnl = cost ? Math.round((totalCashOut + currentValue - totalCashIn) * 100) / 100 : 0;

      // Determine primary side
      const yesValue = h.yesShares * yesPrice;
      const noValue = h.noShares * noPrice;
      const netSide = yesValue >= noValue ? "YES" : "NO";
      const netShares = netSide === "YES" ? h.yesShares : h.noShares;
      const netValue = netSide === "YES" ? yesValue : noValue;
      const volume = totalCashIn + totalCashOut;

      if (netShares < 0.01 && Math.abs(pnl) < 1) continue; // Skip empty positions

      const displayName = name || `${h.address.slice(0, 6)}…${h.address.slice(-4)}`;
      const pos: Position = {
        address: h.address,
        name: displayName,
        image,
        side: netSide,
        shares: Math.round(netShares),
        usd: Math.round(netValue),
        volume: Math.round(volume),
        trades: cost?.trades || 0,
        lastActive: cost?.lastTrade || "",
        profileUrl: `https://polymarket.com/profile/${h.address}`,
        pnl,
        verified: h.verified,
        dataSource: "holders" as const,
      };

      if (netSide === "YES") yesPositions.push(pos);
      else noPositions.push(pos);

      if (volume >= 1000 || netValue >= 500) {
        whales.push({ ...pos });
      }
    }

    // Second: add any wallets from trades that aren't in holders
    // (these may have fully closed their positions but still had trades)
    for (const [addr, cost] of costMap) {
      if (processedAddrs.has(addr)) continue;
      const tradeProf = tradeProfiles.get(addr);

      const totalCashIn = cost.yesBuyCost + cost.noBuyCost;
      const totalCashOut = cost.yesSellProceeds + cost.noSellProceeds;
      const pnl = Math.round((totalCashOut - totalCashIn) * 100) / 100; // No holdings = realized only

      if (Math.abs(pnl) < 1) continue; // Skip dust

      const name = tradeProf?.name || `${addr.slice(0, 6)}…${addr.slice(-4)}`;
      const pos: Position = {
        address: addr,
        name,
        image: tradeProf?.image || "",
        side: cost.yesBuyCost > cost.noBuyCost ? "YES" : "NO",
        shares: 0, // Position closed
        usd: 0,
        volume: Math.round(totalCashIn + totalCashOut),
        trades: cost.trades,
        lastActive: cost.lastTrade,
        profileUrl: `https://polymarket.com/profile/${addr}`,
        pnl,
        verified: false,
        dataSource: "trades" as const,
      };

      if (pos.side === "YES") yesPositions.push(pos);
      else noPositions.push(pos);
    }

    // Sort: by current value (holders first), then by volume
    yesPositions.sort((a, b) => (b.usd || 0) - (a.usd || 0) || (b.volume || 0) - (a.volume || 0));
    noPositions.sort((a, b) => (b.usd || 0) - (a.usd || 0) || (b.volume || 0) - (a.volume || 0));
    whales.sort((a, b) => (b.usd || 0) - (a.usd || 0));

    // ====== 5. Totals ======
    const totalYesShares = yesPositions.reduce((s, p) => s + p.shares, 0);
    const totalNoShares = noPositions.reduce((s, p) => s + p.shares, 0);
    const totalYesUsd = yesPositions.reduce((s, p) => s + p.usd, 0);
    const totalNoUsd = noPositions.reduce((s, p) => s + p.usd, 0);

    // ====== 6. Recent trades feed & Volume History ======
    const recentTrades = allTrades.slice(0, 50).map(t => {
      const prof = tradeProfiles.get(t.address) || holdersMap.get(t.address);
      return {
        ...t,
        side: t.tokenSide, // YES or NO for UI display
        name: prof?.name || `${t.address.slice(0, 6)}…${t.address.slice(-4)}`,
        image: prof?.image || "",
      };
    });



    // ====== 6B. Generate Volume History (Candles priority -> Trades fallback) ======
    let volumeHistory: any[] = [];

    // Fetch candles (history) from CLOB if possible
    // We execute this here to avoid blocking critical initial loads, or we could have done it earlier.
    // For speed, let's try to fetch now or rely on what we fetched earlier?
    // Let's add the fetch to Step 1 or do it here. Doing it here adds latency.
    // BUT we didn't add it to Step 1 yet. Let's add the fetch call here for now.

    let useCandles = false;
    try {
      // Only fetch if we have tokens
      const [yesHistory, noHistory] = await Promise.all([
        yesToken ? fetchCandles(yesToken) : Promise.resolve([]),
        noToken ? fetchCandles(noToken) : Promise.resolve([])
      ]);

      if (yesHistory.length > 0 || noHistory.length > 0) {
        useCandles = true;
        const histMap = new Map<number, { time: number; volume: number; yesVol: number; noVol: number }>();

        // Helper to add
        const add = (t: number, vol: number, side: "YES" | "NO") => {
          // Align t to hour if needed, but CLOB returns aligned timestamps usually
          if (!histMap.has(t)) histMap.set(t, { time: t, volume: 0, yesVol: 0, noVol: 0 });
          const entry = histMap.get(t)!;
          entry.volume += vol;
          if (side === "YES") entry.yesVol += vol;
          else entry.noVol += vol;
        };

        yesHistory.forEach((c: any) => add(c.t * 1000, parseFloat(c.v || "0"), "YES"));
        noHistory.forEach((c: any) => add(c.t * 1000, parseFloat(c.v || "0"), "NO"));

        volumeHistory = Array.from(histMap.values()).sort((a, b) => a.time - b.time);
      }
    } catch (err) {
    }

    // Fallback: Calculate from raw trades if candles failed
    if (!useCandles && allTrades.length > 0) {
      const lastTime = new Date(allTrades[0].time).getTime(); // Newest
      const firstTime = new Date(allTrades[allTrades.length - 1].time).getTime(); // Oldest
      const duration = lastTime - firstTime;

      // If duration is effectively zero (single trade), show 1 point
      if (duration < 60000) {
        volumeHistory = [{
          time: firstTime,
          volume: allTrades.reduce((a, b) => a + b.usd, 0),
          yesVol: allTrades.filter(t => t.tokenSide === "YES").reduce((a, b) => a + b.usd, 0),
          noVol: allTrades.filter(t => t.tokenSide === "NO").reduce((a, b) => a + b.usd, 0),
        }];
      } else {
        const bucketCount = 60;
        const bucketSize = duration / bucketCount;

        // Initialize buckets
        const buckets = new Array(bucketCount).fill(0).map((_, i) => ({
          time: Math.floor(firstTime + (i * bucketSize)),
          endTime: Math.floor(firstTime + ((i + 1) * bucketSize)),
          volume: 0, yesVol: 0, noVol: 0
        }));

        // Fill buckets
        for (const t of allTrades) {
          const tTime = new Date(t.time).getTime();
          // Find bucket index
          let idx = Math.floor((tTime - firstTime) / bucketSize);
          if (idx >= bucketCount) idx = bucketCount - 1;
          if (idx < 0) idx = 0;

          buckets[idx].volume += t.usd;
          if (t.tokenSide === "YES") buckets[idx].yesVol += t.usd;
          else buckets[idx].noVol += t.usd;
        }
        volumeHistory = buckets;
      }
    }



    // ====== 7. Advanced Metrics Calculation ======

    // 7A. Trust & Integrity
    // Wash Trading: Vol > 1000 & abs(NetFlow) < 10% Vol
    let washVolume = 0;
    let totalVolume = 0;

    // Fresh Wallet (New Money): First trade < 24h
    let freshWalletVolume = 0;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;

    for (const [addr, cost] of costMap) {
      const vol = cost.yesBuyCost + cost.yesSellProceeds + cost.noBuyCost + cost.noSellProceeds;
      totalVolume += vol;

      // Wash Check
      const netFlow = (cost.yesBuyCost + cost.noBuyCost) - (cost.yesSellProceeds + cost.noSellProceeds);
      if (vol > 1000 && Math.abs(netFlow) < (0.1 * vol)) {
        washVolume += vol;
      }

      // Fresh Wallet Check
      const firstTradeTime = new Date(cost.firstTrade).getTime();
      if (now - firstTradeTime < oneDayMs) {
        freshWalletVolume += vol;
      }
    }
    const washTradingIndex = totalVolume > 0 ? (washVolume / totalVolume) * 100 : 0;

    // HHI Score (Centralization)
    // Use Top 50 holders by USD value
    const allHolders = [...yesPositions, ...noPositions].sort((a, b) => b.usd - a.usd).slice(0, 50);
    const totalHolderUsd = allHolders.reduce((acc, h) => acc + h.usd, 0);
    let hhiSum = 0;
    if (totalHolderUsd > 0) {
      hhiSum = allHolders.reduce((acc, h) => acc + Math.pow(h.usd / totalHolderUsd, 2), 0);
    }
    const hhiLabel = hhiSum < 0.15 ? "Low" : hhiSum > 0.25 ? "High" : "Medium";

    // 7B. Positions & Profit
    // In/Out of Money
    let inMoneyCount = 0;
    let outMoneyCount = 0;
    let smartMoneyCount = 0;

    // Combined list of active positions
    const activePositions = [...yesPositions, ...noPositions];
    for (const pos of activePositions) {
      if (pos.pnl > 0) inMoneyCount++;
      else outMoneyCount++;

      // Smart Money: Total PnL > 1000 (Simplified proxy)
      if (pos.pnl > 1000) smartMoneyCount++;
    }
    const totalActive = activePositions.length;
    const percentInMoney = totalActive > 0 ? (inMoneyCount / totalActive) * 100 : 0;
    const percentOutOfMoney = totalActive > 0 ? (outMoneyCount / totalActive) * 100 : 0;

    // Slippage
    // Calculate slippage for YES token (primary)
    const slippage1k = orderBookYes ? calculateSlippage(orderBookYes, 1000) : 0;
    const slippage10k = orderBookYes ? calculateSlippage(orderBookYes, 10000) : 0;
    const orderBookImbalance = orderBookYes ? calculateImbalance(orderBookYes) : 0;

    // 7C. Flows & Momentum
    // Whale Net Flow (24h)
    let whaleNetFlow24h = 0;
    let tradesLastHour = 0;
    let tradesLast24h = 0;

    for (const t of allTrades) {
      const tTime = new Date(t.time).getTime();
      const age = now - tTime;

      if (age < oneDayMs) {
        tradesLast24h++;
        if (t.usd > 1000) {
          if (t.action === "BUY") whaleNetFlow24h += t.usd;
          else whaleNetFlow24h -= t.usd;
        }
      }
      if (age < oneHourMs) {
        tradesLastHour++;
      }
    }

    // Holder Retention (Avg Hold Time for Active)
    let totalHoldTimeFn = 0;
    let activeHoldersCount = 0;
    for (const [addr, h] of holdersMap) {
      if (h.yesShares > 1 || h.noShares > 1) { // active
        const cost = costMap.get(addr);
        if (cost) {
          const first = new Date(cost.firstTrade).getTime();
          const dur = now - first; // duration until now
          totalHoldTimeFn += dur;
          activeHoldersCount++;
        }
      }
    }
    const avgHolderRetentionHours = activeHoldersCount > 0 ? (totalHoldTimeFn / activeHoldersCount) / (1000 * 3600) : 0;

    // Trade Velocity
    // Guard against division by zero: if no historical trades, return 0 (N/A)
    const avgTradesPerHour = tradesLast24h / 24;
    const tradeVelocity = avgTradesPerHour > 0 ? Math.min(tradesLastHour / avgTradesPerHour, 999) : 0;

    // ====== 8. High Stakes / Anomalies (Whale Alert) ======
    // Filter for wallets with extremely large positions (> $50k) or massive single trades
    const HIGH_STAKES_THRESHOLD = 50000;
    const highStakes = [...yesPositions, ...noPositions]
      .filter(p => p.usd > HIGH_STAKES_THRESHOLD || Math.abs(p.pnl) > HIGH_STAKES_THRESHOLD)
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 10); // Top 10 anomalies

    return NextResponse.json({
      success: true,
      // Minimal feed for UI
      recentTrades,
      volumeHistory,
      // Top lists only
      // Top lists only
      yesPositions: yesPositions.slice(0, 50),
      noPositions: noPositions.slice(0, 50),
      // Whale tracker
      whales: whales.slice(0, 50),
      highStakes, // <--- NEW: Anomalous wallets

      // Aggregates
      totalYesShares: Math.round(totalYesShares),
      totalNoShares: Math.round(totalNoShares),
      totalYesUsd: Math.round(totalYesUsd),
      totalNoUsd: Math.round(totalNoUsd),
      yesWallets: yesPositions.length,
      noWallets: noPositions.length,
      whaleCount: whales.length,
      totalTrades: allTrades.length,
      holdersCount: holdersMap.size,

      fetchedAt: new Date().toISOString(),
      earliestTradeTime: allTrades.length > 0 ? allTrades[allTrades.length - 1].time : null,
      dataSource: holdersData.length > 0 ? "holders+trades" : "trades-only",

      analytics: {
        washTradingIndex,
        hhiScore: hhiSum,
        hhiLabel,
        freshWalletVolume,
        percentInMoney,
        percentOutOfMoney,
        smartMoneyCount,
        slippage1k,
        slippage10k,
        whaleNetFlow24h,
        avgHolderRetentionHours,
        orderBookImbalance,
        tradeVelocity
      },
      debug: {
        holdersFound: holdersMap.size,
        tradesProfiles: tradeProfiles.size,
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: true, recentTrades: [], yesPositions: [], noPositions: [],
      whales: [], totalYesShares: 0, totalNoShares: 0, totalYesUsd: 0,
      totalNoUsd: 0, yesWallets: 0, noWallets: 0, whaleCount: 0,
      totalTrades: 0, holdersCount: 0, error: String(error),
    });
  }
}

// === Helpers ===

/** Resolve best display name from holder data */
function resolveDisplayName(h: any): string {
  const name = h.name || "";
  const pseudo = h.pseudonym || "";

  // If name looks like "0xAddress-timestamp" format, use pseudonym instead
  if (name && /^0x[a-fA-F0-9]{10,}-\d+$/.test(name)) {
    return pseudo || "";
  }
  // If name is a bare hex address (0x + 40 chars), use pseudonym
  if (name && /^0x[a-fA-F0-9]{40}$/i.test(name)) {
    return pseudo || "";
  }
  return name || pseudo || "";
}

/** Extract profile from trade data */
function collectTradeProfile(
  map: Map<string, { name: string; image: string }>,
  addr: string,
  raw: any
) {
  if (!addr || map.has(addr)) return;
  // Prefer user-set `name` over auto-generated `pseudonym`
  const rawName = raw.name || "";
  const pseudo = raw.pseudonym || "";
  // Check if name is address-like pattern
  const name = (rawName && !/^0x[a-fA-F0-9]{10,}-\d+$/.test(rawName) && !/^0x[a-fA-F0-9]{40}$/i.test(rawName))
    ? rawName : (pseudo || rawName);
  const img = raw.profileImageOptimized || raw.profileImage || "";
  if (name || img) {
    map.set(addr, { name, image: typeof img === "string" ? img : "" });
  }
}

// === Types ===
interface Trade {
  id: string; address: string;
  action: "BUY" | "SELL"; tokenSide: "YES" | "NO";
  shares: number; price: number; usd: number;
  time: string; txHash: string;
}
interface CostBasis {
  yesBuyCost: number; yesSellProceeds: number;
  noBuyCost: number; noSellProceeds: number;
  trades: number; firstTrade: string; lastTrade: string;
}
interface HolderEntry {
  token: string;
  holders: {
    proxyWallet: string; amount: number; outcomeIndex: number;
    name: string; pseudonym: string; bio: string;
    profileImage: string; profileImageOptimized: string;
    verified: boolean; displayUsernamePublic: boolean;
  }[];
}
interface HolderPosition {
  address: string; yesShares: number; noShares: number;
  name: string; image: string; verified: boolean;
}
interface Position {
  address: string; name: string; image: string; side: string;
  shares: number; usd: number; volume: number; trades: number;
  lastActive: string; profileUrl: string; pnl: number;
  verified: boolean; dataSource: "holders" | "trades";
}

// === Data Fetchers ===

/** Fetch real on-chain holders from Data API */
async function fetchHolders(conditionId: string): Promise<HolderEntry[]> {
  const allHoldersMap = new Map<string, HolderEntry>();
  let offset = 0;
  const LIMIT = 1000;
  const MAX_FETCH = 5000; // Safety cap
  let keepFetching = true;
  let totalFetched = 0;

  while (keepFetching && totalFetched < MAX_FETCH) {
    let attempts = 0;
    let batchSuccess = false;
    let batchData: HolderEntry[] = [];

    // Retry loop for batch
    while (attempts < 3) {
      try {
        const res = await fetch(`${DATA_API}/holders?market=${conditionId}&limit=${LIMIT}&offset=${offset}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000), // 10s timeout
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            keepFetching = false;
            batchSuccess = true; // Treated as "done"
            break;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          batchData = data;
          batchSuccess = true;
          break;
        } else {
          keepFetching = false;
          batchSuccess = true; // Stop
          break;
        }
      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          keepFetching = false; // Stop on error
          break;
        }
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }

    if (!batchSuccess || batchData.length === 0) break;

    // Merge batchData into allHoldersMap
    // Expected structure: [{ asset_id: "...", holders: [...] }, ...]
    let batchCount = 0;
    for (const entry of batchData) {
      // Use asset_id or token as key. The interface says 'token'. 
      // We need to check if response uses 'token' or 'asset_id'. 
      // Previous code used 'token'. Let's assume 'token' or check if there was a mapping.
      // The previous code didn't map, just returned `data`.
      // We will key by `entry.asset_id` or `entry.token` if available.
      // Let's assume the API returns `asset_id` or `token`. 
      // We'll just define a key based on available ID.
      const key = (entry as { asset_id?: string }).asset_id || entry.token;
      if (!key) continue;

      if (!allHoldersMap.has(key)) {
        allHoldersMap.set(key, { ...entry, holders: [] });
      }
      const existing = allHoldersMap.get(key)!;
      if (entry.holders && Array.isArray(entry.holders)) {
        existing.holders.push(...entry.holders);
        batchCount += entry.holders.length;
      }
    }

    if (batchCount < LIMIT) keepFetching = false;
    offset += LIMIT;
    totalFetched += batchCount;
  }

  return Array.from(allHoldersMap.values());
}

/** Fetch trade history from Data API */
async function fetchTrades(tokenId: string, limit: number): Promise<any[]> {
  const allTrades: any[] = [];

  try {
    let offset = 0;
    const startTime = Date.now();
    let remaining = limit; // Correctly initialize remaining

    while (remaining > 0) {
      const batchSize = Math.min(remaining, 1000);
      let batchSuccess = false;
      let batchData: any[] = [];

      // Retry loop for THIS batch
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(`${DATA_API}/trades?asset_id=${tokenId}&limit=${batchSize}&offset=${offset}`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(15000), // 15s timeout per attempt
            cache: "no-store",
          });

          if (!res.ok) {
            // Don't retry client errors (400, 404, etc) unless 429 (Too Many Requests)
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
              return allTrades; // Stop fetching more
            }
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          if (Array.isArray(data)) {
            batchData = data;
            batchSuccess = true;
            break; // Success! Exit retry loop
          } else {
            // Unexpected format, treat as error but maybe end
            break;
          }

        } catch (innerErr) {
          if (attempt < 3) {
            // Backoff: 1s, 2s...
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }

      if (!batchSuccess) {
        break; // Stop fetching history, return what we have
      }

      if (batchData.length === 0) break; // End of data

      allTrades.push(...batchData);

      // Update pagination
      if (batchData.length < batchSize) break; // Last page reached

      offset += batchSize;
      remaining -= batchSize;

      // Safety cap (increased to 1M)
      if (offset >= 1000000) break;

      // Time budget check (prevent Vercel timeout)
      // Standard function timeout is often 10s-60s. We play safe with 15s total for this fetch.
      if (Date.now() - startTime > 15000) {
        break;
      }
    }

    return allTrades;

  } catch (err) {
    return allTrades; // Return whatever was collected
  }
}

// === Orderbook Helpers ===
async function fetchOrderBook(tokenId: string) {
  try {
    const res = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function fetchCandles(tokenId: string) {
  try {
    // Use 1h interval for efficient historical loading
    const res = await fetch(`https://clob.polymarket.com/prices-history?interval=1h&market=${tokenId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000), // Fast timeout
      cache: "no-store"
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.history) ? json.history : [];
  } catch (e) {
    return [];
  }
}

function calculateSlippage(book: any, sizeUsd: number): number {
  if (!book || !book.asks || book.asks.length === 0) return 0;

  // "asks" are simple: [ { price: "0.45", size: "100" }, ... ] descending or ascending? 
  // CLOB returns asks sorted by price ASC (cheapest first).
  // We want to BUY, so we consume ASKs.

  let cost = 0;
  let sharesBought = 0;
  let remainingUsd = sizeUsd;

  // Deep clone or just iterate carefully
  // book.asks usually: [{price: "0.55", size: "1000"}, ...]

  for (const level of book.asks) {
    const p = parseFloat(level.price);
    const s = parseFloat(level.size);

    if (remainingUsd <= 0) break;

    const costForLevel = s * p; // Full cost of this level

    if (remainingUsd >= costForLevel) {
      // Take all
      cost += costForLevel;
      sharesBought += s;
      remainingUsd -= costForLevel;
    } else {
      // Take partial
      // remainingUsd = partialSize * p
      const partialShares = remainingUsd / p;
      cost += remainingUsd;
      sharesBought += partialShares;
      remainingUsd = 0;
    }
  }

  if (sharesBought === 0) return 0;

  const avgPrice = cost / sharesBought;
  // Initial best price
  const bestPrice = parseFloat(book.asks[0].price);

  // Slippage % = (AvgPrice - BestPrice) / BestPrice
  return ((avgPrice - bestPrice) / bestPrice) * 100;
}

function calculateImbalance(book: any): number {
  if (!book || !book.bids || !book.asks || book.bids.length === 0 || book.asks.length === 0) return 0;

  // Range 5% from mid price
  const bestBid = parseFloat(book.bids[0].price);
  const bestAsk = parseFloat(book.asks[0].price);
  const mid = (bestBid + bestAsk) / 2;
  const lower = mid * 0.95;
  const upper = mid * 1.05;

  let bidVol = 0;
  let askVol = 0;

  for (const b of book.bids) {
    const p = parseFloat(b.price);
    if (p < lower) break; // sorted desc
    bidVol += parseFloat(b.size);
  }

  for (const a of book.asks) {
    const p = parseFloat(a.price);
    if (p > upper) break; // sorted asc
    askVol += parseFloat(a.size);
  }

  const total = bidVol + askVol;
  if (total === 0) return 0;

  return (bidVol - askVol) / total;
}
