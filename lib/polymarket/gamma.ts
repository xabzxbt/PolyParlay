const GAMMA_BASE = "https://gamma-api.polymarket.com";
const FETCH_TIMEOUT = 15000; // 15 секунд

// --- DNS FIX: Bypass geo-blocking by forcing IP resolution ---
try {
  const dns = require('node:dns');

  // Idempotency check
  if (!dns.lookup.__isPatched) {
    const originalLookup = dns.lookup;

    // Cloudflare IP for gamma-api.polymarket.com
    // Hardcoded here to ensure availability in closure
    const CLOUDFLARE_IP = '172.66.148.245';

    // Overwrite dns.lookup
    const patchedLookup = (hostname: string, options: any, callback: any) => {
      // Handle optional options argument
      const cb = typeof options === 'function' ? options : callback;
      const opts = typeof options === 'object' ? options : {};

      if (hostname === 'gamma-api.polymarket.com') {
        // If 'all' option is set, return array
        if (opts.all) {
          return cb(null, [{ address: CLOUDFLARE_IP, family: 4 }]);
        }

        return cb(null, CLOUDFLARE_IP, 4);
      }
      return originalLookup(hostname, options, callback);
    };

    (patchedLookup as { __isPatched?: boolean }).__isPatched = true;
    dns.lookup = patchedLookup;
  }
} catch (error) {
}
// -----------------------------------------------------------

// ✅ ДОДАЙ цю helper функцію на початку файлу
async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT, retries = 3, delay = 1000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store', // ✅ вимкнути кеш Next.js
    });
    clearTimeout(id);

    // Add retry for 425 (Matching Engine restart)
    if (response.status === 425 && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithTimeout(url, timeout, retries - 1, delay * 2);
    }

    if (response.status === 425 && retries === 0) {
      throw new Error(`[Gamma] HTTP 425: Matching engine is restarting. Max retries exceeded for ${url}`);
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  }
}

interface GammaEvent {
  id: string; slug: string; title: string; description: string;
  startDate: string; endDate: string; active: boolean; closed: boolean;
  markets: GammaMarket[]; category?: string; image?: string; icon?: string;
  volume?: number; volume24hr?: number; liquidity?: number;
  tags?: { id: string; label: string; slug: string }[];
  commentCount?: number;
}

interface GammaMarket {
  id: string; question: string; conditionId: string; slug: string;
  outcomes: string[]; outcomePrices: string;
  volume: string; volume24hr?: string; liquidity: string;
  endDate: string; active: boolean; closed: boolean;
  clobTokenIds: string; acceptingOrders: boolean;
  description?: string; groupItemTitle?: string;
  image?: string; icon?: string;
  negRisk?: boolean; negRiskMarketID?: string;
  orderPriceMinTickSize?: number;
}

interface ParsedMarket {
  id: string; conditionId: string; question: string; category: string;
  yesPrice: number; noPrice: number;
  volume: number; volume24hr: number; liquidity: number;
  endDate: string; yesTokenId: string; noTokenId: string;
  active: boolean; imageUrl?: string;
  eventTitle?: string; eventSlug?: string;
  groupItemTitle?: string; outcomes?: string[];
  negRisk: boolean; tickSize: string;
}

interface ParsedEvent {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  category: string;
  volume: number;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  marketCount: number;
  markets: ParsedMarket[];
}

interface SubTag { id: string; label: string; slug: string; }

interface PlatformStats {
  totalVolume24h: number;
  totalLiquidity: number;
  activeEvents: number;
  activeMarkets: number;
}

// ✅ ЗАМІНИ цю функцію
async function fetchEvents(params: {
  active?: boolean; closed?: boolean; limit?: number; offset?: number;
  order?: string; ascending?: boolean; tag_id?: number; related_tags?: boolean;
} = {}): Promise<GammaEvent[]> {
  const sp = new URLSearchParams();
  if (params.active !== undefined) sp.set("active", String(params.active));
  if (params.closed !== undefined) sp.set("closed", String(params.closed));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));
  if (params.order) sp.set("order", params.order);
  if (params.ascending !== undefined) sp.set("ascending", String(params.ascending));
  if (params.tag_id) sp.set("tag_id", String(params.tag_id));
  if (params.related_tags) sp.set("related_tags", "true");

  const url = `${GAMMA_BASE}/events?${sp.toString()}`;

  // ✅ ЗАМІНИ fetch на fetchWithTimeout і ВИДАЛИ next: { revalidate: 30 }
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Gamma API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ✅ ЗАМІНИ цю функцію
export async function fetchRelatedTags(tagId: number): Promise<SubTag[]> {
  try {
    const url = `${GAMMA_BASE}/tags/${tagId}/related-tags/tags?omit_empty=true&status=active`;
    const res = await fetchWithTimeout(url); // ✅ використовуй fetchWithTimeout
    if (!res.ok) return [];
    const tags = await res.json();
    return tags.filter((t: any) => t.label && !t.forceHide).map((t: any) => ({
      id: String(t.id), label: t.label, slug: t.slug || ""
    }));
  } catch (err) {
    return [];
  }
}

// ✅ ЗАМІНИ цю функцію
export async function fetchTrendingTags(): Promise<SubTag[]> {
  try {
    const url = `${GAMMA_BASE}/tags?limit=30&order=updatedAt&ascending=false`;
    const res = await fetchWithTimeout(url); // ✅ використовуй fetchWithTimeout
    if (!res.ok) return [];
    const tags = await res.json();
    return tags.filter((t: any) => !t.forceHide && t.label && t.id)
      .slice(0, 20)
      .map((t: any) => ({ id: String(t.id), label: t.label, slug: t.slug || "" }));
  } catch (err) {
    return [];
  }
}

function parseMarket(m: GammaMarket, category: string, eventImg?: string, eventTitle?: string, eventSlug?: string): ParsedMarket {
  let prices: number[];
  try { prices = JSON.parse(m.outcomePrices); } catch { prices = [0.5, 0.5]; }
  let tokenIds: string[];
  try { tokenIds = JSON.parse(m.clobTokenIds); } catch { tokenIds = ["", ""]; }

  // Determine tick size from Gamma API or default to 0.01
  let tickSize = "0.01";
  if (m.orderPriceMinTickSize) {
    tickSize = m.orderPriceMinTickSize.toString();
  }

  return {
    id: m.id, conditionId: m.conditionId, question: m.question, category,
    yesPrice: prices[0] ?? 0.5, noPrice: prices[1] ?? 0.5,
    volume: parseFloat(m.volume) || 0, volume24hr: parseFloat(m.volume24hr || "0") || 0,
    liquidity: parseFloat(m.liquidity) || 0, endDate: m.endDate,
    yesTokenId: tokenIds[0] ?? "", noTokenId: tokenIds[1] ?? "",
    active: m.active, imageUrl: m.image || m.icon || eventImg || undefined,
    eventTitle, eventSlug, groupItemTitle: m.groupItemTitle, outcomes: m.outcomes,
    negRisk: m.negRisk ?? true, // Most Polymarket markets are negRisk
    tickSize,
  };
}

export async function getActiveMarkets(params: {
  limit?: number; tagId?: number; order?: string; ascending?: boolean;
} = {}): Promise<ParsedMarket[]> {
  const events = await fetchEvents({
    active: true, closed: false, limit: params.limit || 50,
    order: params.order || "volume24hr", ascending: params.ascending ?? false,
    tag_id: params.tagId, related_tags: !!params.tagId,
  });
  const markets: ParsedMarket[] = [];
  for (const ev of events) {
    const cat = inferCategory(ev);
    const img = ev.image || ev.icon;
    for (const m of ev.markets) {
      if (m.active && m.acceptingOrders) markets.push(parseMarket(m, cat, img, ev.title, ev.slug));
    }
  }
  return markets;
}

export async function getActiveEvents(params: {
  limit?: number; tagId?: number; order?: string; ascending?: boolean;
} = {}): Promise<{ events: ParsedEvent[]; stats: PlatformStats }> {
  const raw = await fetchEvents({
    active: true, closed: false, limit: params.limit || 50,
    order: params.order || "volume24hr", ascending: params.ascending ?? false,
    tag_id: params.tagId, related_tags: !!params.tagId,
  });

  let totalVol24 = 0, totalLiq = 0, totalMarkets = 0;
  const events: ParsedEvent[] = [];

  for (const ev of raw) {
    const cat = inferCategory(ev);
    const img = ev.image || ev.icon;
    const markets: ParsedMarket[] = [];

    for (const m of ev.markets) {
      if (m.active && m.acceptingOrders) {
        markets.push(parseMarket(m, cat, img, ev.title, ev.slug));
      }
    }

    if (markets.length === 0) continue;

    const evVol = markets.reduce((a, m) => a + m.volume, 0);
    const evVol24 = markets.reduce((a, m) => a + m.volume24hr, 0);
    const evLiq = markets.reduce((a, m) => a + m.liquidity, 0);

    totalVol24 += evVol24;
    totalLiq += evLiq;
    totalMarkets += markets.length;

    events.push({
      id: ev.id, slug: ev.slug, title: ev.title,
      imageUrl: img, category: cat,
      volume: evVol, volume24hr: evVol24, liquidity: evLiq,
      endDate: ev.endDate || markets[0].endDate,
      marketCount: markets.length, markets,
    });
  }

  return {
    events,
    stats: { totalVolume24h: totalVol24, totalLiquidity: totalLiq, activeEvents: events.length, activeMarkets: totalMarkets },
  };
}

function inferCategory(ev: GammaEvent): string {
  const tags = (ev.tags || []).map(t => (t.slug || "").toLowerCase());
  if (tags.some(t => /sport|nba|nfl|soccer|football|tennis|esport/.test(t))) return "sports";
  if (tags.some(t => /politic|election|trump|congress/.test(t))) return "politics";
  if (tags.some(t => /crypto|bitcoin|ethereum|defi|btc|eth/.test(t))) return "crypto";
  if (tags.some(t => /finance|earning|ipo|stock/.test(t))) return "finance";
  if (tags.some(t => /tech|ai|science/.test(t))) return "tech";
  if (tags.some(t => /culture|movie|oscar|music/.test(t))) return "culture";
  if (tags.some(t => /geopolitic|war|world|iran/.test(t))) return "world";
  if (tags.some(t => /econ|fed|rate|gdp|shutdown/.test(t))) return "economy";
  const t = (ev.title + " " + (ev.category || "")).toLowerCase();
  if (/nba|nfl|mlb|soccer|sport|esport/i.test(t)) return "sports";
  if (/trump|biden|election|politic/i.test(t)) return "politics";
  if (/bitcoin|btc|ethereum|crypto/i.test(t)) return "crypto";
  if (/fed|rate|economy|shutdown/i.test(t)) return "economy";
  return "other";
}

interface ParsedEventDetail extends ParsedEvent {
  description: string;
  tags: SubTag[];
  commentCount: number;
  startDate: string;
  active: boolean;
  closed: boolean;
}

// ✅ ЗАМІНИ цю функцію
async function fetchEventById(eventId: string): Promise<GammaEvent | null> {
  try {
    const url = `${GAMMA_BASE}/events/${eventId}`;
    const res = await fetchWithTimeout(url); // ✅ використовуй fetchWithTimeout
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    return null;
  }
}

// ✅ ЗАМІНИ цю функцію
async function fetchEventBySlug(slug: string): Promise<GammaEvent | null> {
  try {
    const url = `${GAMMA_BASE}/events?slug=${slug}&limit=1`;
    const res = await fetchWithTimeout(url); // ✅ використовуй fetchWithTimeout
    if (!res.ok) return null;
    const events = await res.json();
    return events[0] || null;
  } catch (err) {
    return null;
  }
}

export async function getEventDetail(eventId: string): Promise<ParsedEventDetail | null> {
  let ev = await fetchEventById(eventId);
  if (!ev) {
    ev = await fetchEventBySlug(eventId);
  }
  if (!ev) return null;

  const cat = inferCategory(ev);
  const img = ev.image || ev.icon;
  const markets: ParsedMarket[] = [];

  for (const m of ev.markets) {
    markets.push(parseMarket(m, cat, img, ev.title, ev.slug));
  }

  const evVol = markets.reduce((a, m) => a + m.volume, 0);
  const evVol24 = markets.reduce((a, m) => a + m.volume24hr, 0);
  const evLiq = markets.reduce((a, m) => a + m.liquidity, 0);

  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    description: ev.description || "",
    imageUrl: img,
    category: cat,
    volume: evVol,
    volume24hr: evVol24,
    liquidity: evLiq,
    endDate: ev.endDate || markets[0]?.endDate || "",
    startDate: ev.startDate || "",
    marketCount: markets.length,
    markets,
    tags: (ev.tags || []).map(t => ({ id: t.id, label: t.label, slug: t.slug })),
    commentCount: ev.commentCount || 0,
    active: ev.active,
    closed: ev.closed,
  };
}
