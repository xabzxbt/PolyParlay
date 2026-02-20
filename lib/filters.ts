// Client-side market/event filtering
// Pure functions — no side effects, no state, no components
// This file centralizes ALL filter logic so it can be tested independently

import { calculateEventQualityScore } from "@/lib/quality-score";

export interface FilterState {
  // EXISTING filters (Phase 0)
  activeOnly: boolean;
  search: string;

  // Phase 1 filters
  hideLowLiquidity: boolean;   // hide events < $1,000 liquidity
  hideLowVolume: boolean;      // hide events < $100 24h volume
  liquidityTier: "all" | "high" | "mid" | "low";
  onlyMultiMarket: boolean;    // show only events with 2+ markets

  // Phase 3 filters
  minQualityScore: number;     // 0-100, filter by quality score
  smartMoneyOnly: boolean;     // only show events with smart money activity
}

export function isActiveMarket(m: any, now: Date = new Date()): boolean {
  if (!m) return false;
  if (m.active === false) return false;
  // Bugfix: Ensure closed/resolved markets are strictly excluded
  if (m.closed || m.resolved || m.resolvedBy) return false;

  const p = m.yesPrice;
  if (p === undefined || p === null) return false;
  if (p < 0.07 || p > 0.93) return false;
  if (m.endDate && new Date(m.endDate) < now) return false;
  return true;
}

export const DEFAULT_FILTERS: FilterState = {
  activeOnly: true,
  search: "",
  hideLowLiquidity: false,
  hideLowVolume: false,
  liquidityTier: "all",
  onlyMultiMarket: false,
  minQualityScore: 0,
  smartMoneyOnly: false,
};

// Thresholds (configurable)
const LIQUIDITY_HIGH = 50_000;
const LIQUIDITY_MID = 5_000;
const LIQUIDITY_LOW = 1_000;
const VOLUME_24H_LOW = 100;

// === EVENT-LEVEL FILTERING ===

export function filterEvents(events: any[], filters: FilterState): any[] {
  let result = events;

  // --- EXISTING: activeOnly — filter out decided/ended markets ---
  if (filters.activeOnly) {
    const now = new Date();
    result = result
      .map((ev) => {
        const filtered = (ev.markets || []).filter((m: any) => isActiveMarket(m, now));
        if (filtered.length === 0) return null;
        return { ...ev, markets: filtered, marketCount: filtered.length };
      })
      .filter(Boolean);

    // Also filter out events that have already ended
    result = result.filter((ev: any) => {
      if (ev.endDate) {
        const end = new Date(ev.endDate);
        if (end < now) return false;
      }
      return true;
    });
  }

  // --- EXISTING: search ---
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (ev: any) =>
        ev.title.toLowerCase().includes(q) ||
        ev.markets.some((m: any) => m.question.toLowerCase().includes(q))
    );
  }

  // --- NEW: hideLowLiquidity ---
  if (filters.hideLowLiquidity) {
    result = result.filter((ev: any) => ev.liquidity >= LIQUIDITY_LOW);
  }

  // --- NEW: hideLowVolume ---
  if (filters.hideLowVolume) {
    result = result.filter((ev: any) => ev.volume24hr >= VOLUME_24H_LOW);
  }

  // --- NEW: liquidityTier ---
  if (filters.liquidityTier !== "all") {
    result = result.filter((ev: any) => {
      const liq = ev.liquidity;
      switch (filters.liquidityTier) {
        case "high":
          return liq >= LIQUIDITY_HIGH;
        case "mid":
          return liq >= LIQUIDITY_MID && liq < LIQUIDITY_HIGH;
        case "low":
          return liq < LIQUIDITY_MID;
        default:
          return true;
      }
    });
  }

  // --- NEW: onlyMultiMarket ---
  if (filters.onlyMultiMarket) {
    result = result.filter((ev: any) => ev.marketCount >= 2);
  }

  // --- Phase 3: minQualityScore ---
  if (filters.minQualityScore > 0) {
    result = result.filter((ev: any) => {
      const q = calculateEventQualityScore({
        liquidity: ev.liquidity, volume: ev.volume, volume24hr: ev.volume24hr,
        endDate: ev.endDate, marketCount: ev.marketCount,
        smartMoneyCount: ev.smartMoneyCount, smartMoneySentiment: ev.smartMoneySentiment,
      });
      return q.score >= filters.minQualityScore;
    });
  }

  // --- Phase 3: smartMoneyOnly ---
  if (filters.smartMoneyOnly) {
    result = result.filter((ev: any) => (ev.smartMoneyCount || 0) > 0);
  }

  return result;
}

// === FLAT MARKET FILTERING (for flat view) ===

export function filterFlatMarkets(markets: any[], filters: FilterState): any[] {
  let result = markets;

  if (filters.activeOnly) {
    const now = new Date();
    result = result.filter((m) => isActiveMarket(m, now));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((m) => m.question.toLowerCase().includes(q));
  }

  if (filters.hideLowLiquidity) {
    result = result.filter((m) => m.liquidity >= LIQUIDITY_LOW);
  }

  if (filters.hideLowVolume) {
    result = result.filter((m) => (m.volume24hr || 0) >= VOLUME_24H_LOW);
  }

  if (filters.liquidityTier !== "all") {
    result = result.filter((m) => {
      const liq = m.liquidity;
      switch (filters.liquidityTier) {
        case "high": return liq >= LIQUIDITY_HIGH;
        case "mid": return liq >= LIQUIDITY_MID && liq < LIQUIDITY_HIGH;
        case "low": return liq < LIQUIDITY_MID;
        default: return true;
      }
    });
  }

  if (filters.smartMoneyOnly) {
    result = result.filter((m) => (m.smartMoneyCount || 0) > 0);
  }

  return result;
}

// Count active filters (for badge)
export function countActiveFilters(filters?: FilterState): number {
  if (!filters) return 0;
  let count = 0;
  if (filters.liquidityTier && filters.liquidityTier !== "all") count++;
  if (filters.minQualityScore !== undefined && filters.minQualityScore > 0) count++;
  if (filters.hideLowLiquidity) count++;
  if (filters.hideLowVolume) count++;
  if (filters.onlyMultiMarket) count++;
  if (filters.smartMoneyOnly) count++;
  return count;
}
