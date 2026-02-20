// Fetch comments & trader positions from PUBLIC Gamma API
// + Fallback to CLOB trades for markets without comments

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";

interface TraderPosition {
  address: string;
  pseudonym: string;
  profileImage: string;
  side: "YES" | "NO" | "BOTH";
  positionSize: number;
  positionValue: number;
  comment?: string;
  commentDate?: string;
  source?: "comment" | "trade";
  tradeCount?: number;
}

interface CommentData {
  id: string;
  body: string;
  userAddress: string;
  pseudonym: string;
  profileImage: string;
  positions: { tokenId: string; positionSize: number }[];
  createdAt: string;
}

interface MarketComments {
  comments: CommentData[];
  yesTraders: TraderPosition[];
  noTraders: TraderPosition[];
  totalYesSize: number;
  totalNoSize: number;
  source: "comments" | "trades" | "both";
}

async function gammaFetch<T>(url: string, timeoutMs = 10000): Promise<T | null> {
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

function parseComments(raw: any[]): CommentData[] {
  return (raw || []).map((c: any) => ({
    id: c.id || "",
    body: c.body || "",
    userAddress: c.userAddress || c.profile?.baseAddress || "",
    pseudonym: c.profile?.pseudonym || c.profile?.name || "",
    profileImage: c.profile?.profileImageOptimized?.imageUrlOptimized || c.profile?.profileImage || "",
    positions: (c.profile?.positions || []).map((p: any) => ({
      tokenId: p.tokenId || "",
      positionSize: parseFloat(p.positionSize || "0"),
    })),
    createdAt: c.createdAt || "",
  }));
}

function classifyTraders(
  comments: CommentData[],
  yesTokenId: string,
  noTokenId: string,
  yesPrice: number,
): { yesTraders: TraderPosition[]; noTraders: TraderPosition[] } {
  const yesTraders: TraderPosition[] = [];
  const noTraders: TraderPosition[] = [];
  const seen = new Set<string>();

  for (const c of comments) {
    const addr = c.userAddress;
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);

    let yesSize = 0, noSize = 0;
    for (const pos of c.positions) {
      if (pos.tokenId === yesTokenId) yesSize = pos.positionSize;
      if (pos.tokenId === noTokenId) noSize = pos.positionSize;
    }
    if (yesSize <= 0 && noSize <= 0) continue;

    const trader: TraderPosition = {
      address: addr,
      pseudonym: c.pseudonym,
      profileImage: c.profileImage,
      side: yesSize > noSize ? "YES" : noSize > yesSize ? "NO" : "BOTH",
      positionSize: Math.max(yesSize, noSize),
      positionValue: yesSize > noSize ? yesSize * yesPrice : noSize * (1 - yesPrice),
      comment: c.body,
      commentDate: c.createdAt,
      source: "comment",
    };

    if (trader.side === "YES" || trader.side === "BOTH") yesTraders.push(trader);
    if (trader.side === "NO" || trader.side === "BOTH") noTraders.push(trader);
  }

  yesTraders.sort((a, b) => b.positionSize - a.positionSize);
  noTraders.sort((a, b) => b.positionSize - a.positionSize);
  return { yesTraders, noTraders };
}

// === CLOB TRADES FALLBACK ===
// Fetch recent trades and aggregate by wallet address
async function fetchTradesAsPositions(
  yesTokenId: string, noTokenId: string, yesPrice: number
): Promise<{ yesTraders: TraderPosition[]; noTraders: TraderPosition[] }> {
  try {
    const [yesRes, noRes] = await Promise.all([
      yesTokenId ? gammaFetch<any[]>(`${CLOB_BASE}/trades?asset_id=${yesTokenId}&limit=200`) : Promise.resolve(null),
      noTokenId ? gammaFetch<any[]>(`${CLOB_BASE}/trades?asset_id=${noTokenId}&limit=200`) : Promise.resolve(null),
    ]);

    // Aggregate trades by maker address
    const wallets = new Map<string, { yesBuy: number; yesSell: number; noBuy: number; noSell: number; count: number; lastTime: string }>();

    for (const trade of (yesRes || [])) {
      const addr = trade.maker_address || trade.owner || "";
      if (!addr) continue;
      const size = parseFloat(trade.size || "0");
      if (size <= 0) continue;
      const w = wallets.get(addr) || { yesBuy: 0, yesSell: 0, noBuy: 0, noSell: 0, count: 0, lastTime: "" };
      if (trade.side === "BUY") w.yesBuy += size;
      else w.yesSell += size;
      w.count++;
      if (!w.lastTime || trade.match_time > w.lastTime) w.lastTime = trade.match_time;
      wallets.set(addr, w);
    }

    for (const trade of (noRes || [])) {
      const addr = trade.maker_address || trade.owner || "";
      if (!addr) continue;
      const size = parseFloat(trade.size || "0");
      if (size <= 0) continue;
      const w = wallets.get(addr) || { yesBuy: 0, yesSell: 0, noBuy: 0, noSell: 0, count: 0, lastTime: "" };
      if (trade.side === "BUY") w.noBuy += size;
      else w.noSell += size;
      w.count++;
      if (!w.lastTime || trade.match_time > w.lastTime) w.lastTime = trade.match_time;
      wallets.set(addr, w);
    }

    const yesTraders: TraderPosition[] = [];
    const noTraders: TraderPosition[] = [];

    for (const [addr, w] of wallets) {
      const netYes = w.yesBuy - w.yesSell;
      const netNo = w.noBuy - w.noSell;

      // Only show wallets with significant net positions
      if (netYes > 10) {
        yesTraders.push({
          address: addr,
          pseudonym: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          profileImage: "",
          side: "YES",
          positionSize: netYes,
          positionValue: netYes * yesPrice,
          source: "trade",
          tradeCount: w.count,
        });
      }
      if (netNo > 10) {
        noTraders.push({
          address: addr,
          pseudonym: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          profileImage: "",
          side: "NO",
          positionSize: netNo,
          positionValue: netNo * (1 - yesPrice),
          source: "trade",
          tradeCount: w.count,
        });
      }
    }

    yesTraders.sort((a, b) => b.positionSize - a.positionSize);
    noTraders.sort((a, b) => b.positionSize - a.positionSize);

    return { yesTraders: yesTraders.slice(0, 15), noTraders: noTraders.slice(0, 15) };
  } catch {
    return { yesTraders: [], noTraders: [] };
  }
}

// Fetch comments for a market (with trades fallback)
export async function getMarketComments(
  marketId: string, yesTokenId: string, noTokenId: string, yesPrice: number,
): Promise<MarketComments> {
  // 1. Try comments first
  const url = `${GAMMA_BASE}/comments?parent_entity_type=market&parent_entity_id=${marketId}&get_positions=true&limit=50&order=createdAt&ascending=false`;
  const raw = await gammaFetch<any[]>(url);
  const comments = parseComments(raw || []);
  const { yesTraders: commentYes, noTraders: commentNo } = classifyTraders(comments, yesTokenId, noTokenId, yesPrice);

  // 2. Always also fetch trades for more comprehensive data
  const { yesTraders: tradeYes, noTraders: tradeNo } = await fetchTradesAsPositions(yesTokenId, noTokenId, yesPrice);

  // 3. Merge: comment positions first, then trade positions (dedup by address)
  const seenAddrs = new Set<string>();
  const yesTraders: TraderPosition[] = [];
  const noTraders: TraderPosition[] = [];

  for (const t of commentYes) { seenAddrs.add(t.address); yesTraders.push(t); }
  for (const t of commentNo) { seenAddrs.add(t.address); noTraders.push(t); }
  for (const t of tradeYes) { if (!seenAddrs.has(t.address)) { seenAddrs.add(t.address); yesTraders.push(t); } }
  for (const t of tradeNo) { if (!seenAddrs.has(t.address)) { noTraders.push(t); } }

  yesTraders.sort((a, b) => b.positionSize - a.positionSize);
  noTraders.sort((a, b) => b.positionSize - a.positionSize);

  const source = commentYes.length > 0 || commentNo.length > 0
    ? (tradeYes.length > 0 || tradeNo.length > 0 ? "both" : "comments")
    : "trades";

  return {
    comments, yesTraders, noTraders,
    totalYesSize: yesTraders.reduce((s, t) => s + t.positionSize, 0),
    totalNoSize: noTraders.reduce((s, t) => s + t.positionSize, 0),
    source,
  };
}

// Fetch across event + markets
export async function getEventTraders(
  eventId: string,
  markets: { id: string; yesTokenId: string; noTokenId: string; yesPrice: number; question: string }[],
): Promise<{
  topYes: (TraderPosition & { market: string })[];
  topNo: (TraderPosition & { market: string })[];
  totalComments: number;
  comments: CommentData[];
  totalYesSize: number;
  totalNoSize: number;
  source: string;
}> {
  const mainMarket = markets[0];

  // 1. Event-level comments
  const eventUrl = `${GAMMA_BASE}/comments?parent_entity_type=Event&parent_entity_id=${eventId}&get_positions=true&limit=100&order=createdAt&ascending=false`;
  const eventRaw = await gammaFetch<any[]>(eventUrl);
  const eventComments = parseComments(eventRaw || []);
  const { yesTraders: commentYes, noTraders: commentNo } = classifyTraders(
    eventComments, mainMarket?.yesTokenId || "", mainMarket?.noTokenId || "", mainMarket?.yesPrice || 0.5,
  );

  // 2. Also fetch CLOB trades for the main market
  const { yesTraders: tradeYes, noTraders: tradeNo } = await fetchTradesAsPositions(
    mainMarket?.yesTokenId || "", mainMarket?.noTokenId || "", mainMarket?.yesPrice || 0.5
  );

  // 3. Merge
  const seenAddrs = new Set<string>();
  const topYes: (TraderPosition & { market: string })[] = [];
  const topNo: (TraderPosition & { market: string })[] = [];

  for (const t of commentYes) { seenAddrs.add(t.address); topYes.push({ ...t, market: mainMarket?.question || "" }); }
  for (const t of commentNo) { seenAddrs.add(t.address); topNo.push({ ...t, market: mainMarket?.question || "" }); }
  for (const t of tradeYes) { if (!seenAddrs.has(t.address)) { seenAddrs.add(t.address); topYes.push({ ...t, market: mainMarket?.question || "" }); } }
  for (const t of tradeNo) { if (!seenAddrs.has(t.address)) { topNo.push({ ...t, market: mainMarket?.question || "" }); } }

  topYes.sort((a, b) => b.positionSize - a.positionSize);
  topNo.sort((a, b) => b.positionSize - a.positionSize);

  const source = commentYes.length + commentNo.length > 0
    ? (tradeYes.length + tradeNo.length > 0 ? "both" : "comments")
    : "trades";

  return {
    topYes: topYes.slice(0, 15),
    topNo: topNo.slice(0, 15),
    totalComments: eventComments.length,
    comments: eventComments,
    totalYesSize: topYes.reduce((s, t) => s + t.positionSize, 0),
    totalNoSize: topNo.reduce((s, t) => s + t.positionSize, 0),
    source,
  };
}
