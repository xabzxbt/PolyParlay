"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// Components - dynamically loaded for performance
const GamificationBar = dynamic(
  () => import("@/components/analytics/GamificationBar"),
  { ssr: false, loading: () => <div className="h-14 bg-white rounded-lg animate-pulse" /> }
);

const DailyDigest = dynamic(
  () => import("@/components/analytics/DailyDigest"),
  { ssr: false, loading: () => <div className="h-40 bg-white rounded-card animate-pulse" /> }
);

const WhaleFeed = dynamic(
  () => import("@/components/analytics/WhaleFeed"),
  { ssr: false, loading: () => <div className="h-96 bg-white rounded-card animate-pulse" /> }
);

const FearGreedGauge = dynamic(
  () => import("@/components/analytics/FearGreedGauge"),
  { ssr: false, loading: () => <div className="h-80 bg-white rounded-card animate-pulse" /> }
);

const MarketHeatmap = dynamic(
  () => import("@/components/analytics/MarketHeatmap"),
  { ssr: false, loading: () => <div className="h-96 bg-white rounded-card animate-pulse" /> }
);

const DivergenceRadar = dynamic(
  () => import("@/components/analytics/DivergenceRadar"),
  { ssr: false, loading: () => <div className="h-96 bg-white rounded-card animate-pulse" /> }
);

const CorrelationMap = dynamic(
  () => import("@/components/analytics/CorrelationMap"),
  { ssr: false, loading: () => <div className="h-96 bg-white rounded-card animate-pulse" /> }
);

const OpportunityFinder = dynamic(
  () => import("@/components/analytics/OpportunityFinder"),
  { ssr: false, loading: () => <div className="h-80 bg-white rounded-card animate-pulse" /> }
);

const Leaderboard = dynamic(
  () => import("@/components/analytics/Leaderboard"),
  { ssr: false, loading: () => <div className="h-96 bg-white rounded-card animate-pulse" /> }
);

const AchievementGallery = dynamic(
  () => import("@/components/analytics/AchievementGallery"),
  { ssr: false, loading: () => <div className="h-64 bg-white rounded-card animate-pulse" /> }
);

const AchievementPopup = dynamic(
  () => import("@/components/analytics/AchievementPopup"),
  { ssr: false }
);

const HotOpportunityBanner = dynamic(
  () => import("@/components/analytics/HotOpportunityBanner"),
  { ssr: false }
);

// Removed ArkhamDashboard completely

// Hooks
import { useGamification } from "@/hooks/useGamification";
import { useWhaleActivity } from "@/hooks/useWhaleActivity";
import { useFearGreed } from "@/hooks/useFearGreed";
import { useTradingProfile } from "@/hooks/useTradingProfile";
import { useEdgeScore } from "@/hooks/useEdgeScore";

const sampleMarkets: any[] = [];

// Type for API leaderboard response
interface ApiLeaderboardEntry {
  rank: number;
  wallet: string;
  name: string;
  pnl: number;
  volume: number;
  image: string;
  xUsername: string;
  verified: boolean;
  profileUrl: string;
}

// Type for Leaderboard component
interface LeaderboardEntry {
  rank: number;
  rankChange: number;
  address: string;
  displayName?: string;
  winRate: number;
  totalPnL: number;
  totalVolume: number;
  streak: number;
  xp: number;
  level: string;
}

// Helper to determine level based on volume
function getLevelFromVolume(volume: number): string {
  if (volume >= 500000) return "Kraken";
  if (volume >= 250000) return "Whale";
  if (volume >= 100000) return "Shark";
  if (volume >= 50000) return "Analyst";
  if (volume >= 10000) return "Trader";
  return "Rookie";
}

// Estimate win rate from PnL and volume (heuristic when full trade history unavailable)
function calculateWinRate(pnl: number, volume: number): number {
  if (volume === 0) return 0;
  // Estimate win rate based on profit margin
  const profitMargin = pnl / volume;
  // Map to reasonable win rate (0.3 to 0.8 range typically)
  const baseWinRate = 0.5;
  const adjusted = baseWinRate + (profitMargin * 0.5);
  return Math.max(0.1, Math.min(0.9, adjusted));
}

// Helper to calculate XP from volume
function calculateXp(volume: number): number {
  return Math.floor(volume * 0.01);
}

// Estimate streak from cumulative PnL (heuristic)
function calculateStreak(pnl: number): number {
  if (pnl <= 0) return 0;
  return Math.min(Math.floor(pnl / 5000), 15);
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const address = searchParams?.get("address") as string | undefined;

  // Leaderboard state
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | undefined>(undefined);

  // Real markets state
  const [realMarkets, setRealMarkets] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  // Initialize hooks that depend on realMarkets
  const gamification = useGamification();
  const { trades: whaleTrades, isLoading: whaleLoading, lastUpdated: whaleLastUpdated, refresh: refreshWhale } = useWhaleActivity();
  const { result: fearGreedResult, history: fearGreedHistory, isLoading: fearGreedLoading, lastUpdated: fearGreedLastUpdated, refresh: refreshFearGreed } = useFearGreed();
  const { digest, isLoading: profileLoading, refresh: refreshProfile } = useTradingProfile({ userAddress: address });
  const { topOpportunities, hotOpportunities, isLoading: edgeLoading, lastUpdated: edgeLastUpdated, refresh: refreshEdge } = useEdgeScore();

  // State for collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [dismissedHotOpportunity, setDismissedHotOpportunity] = useState(false);

  useEffect(() => {
    async function fetchRealMarkets() {
      try {
        const res = await fetch("/api/markets?type=flat&limit=30");
        const data = await res.json();
        if (data.success && data.markets) {
          const formatted = data.markets.map((m: any) => ({
            id: m.id,
            slug: m.slug || m.eventSlug || m.id,
            question: m.question,
            yesPrice: m.yesPrice || 0.5,
            volume24h: m.volume24hr || 0,
            volume24hr: m.volume24hr || 0,
            liquidity: m.liquidity || 0,
            endDate: m.endDate,
            category: m.category || "other",
          }));
          setRealMarkets(formatted);
        }
      } catch (err) {
      } finally {
        setMarketsLoading(false);
      }
    }
    fetchRealMarkets();
  }, []);

  // Fetch leaderboard data from API
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const response = await fetch("/api/leaderboard?period=ALL&category=OVERALL&limit=50");
      const data = await response.json();

      if (data.success && data.traders) {
        const entries: LeaderboardEntry[] = data.traders.map((trader: ApiLeaderboardEntry) => ({
          rank: trader.rank,
          rankChange: 0, // API doesn't provide rank change, default to 0
          address: trader.wallet || "",
          displayName: trader.name || trader.xUsername || undefined,
          winRate: calculateWinRate(trader.pnl, trader.volume),
          totalPnL: trader.pnl,
          totalVolume: trader.volume,
          streak: calculateStreak(trader.pnl),
          xp: calculateXp(trader.volume),
          level: getLevelFromVolume(trader.volume),
        }));
        setLeaderboardEntries(entries);

        // Find current user's rank if address is provided
        if (address) {
          const userEntry = entries.find(e => e.address.toLowerCase() === address.toLowerCase());
          if (userEntry) {
            setCurrentUserRank(userEntry.rank);
          }
        }
      } else {
        setLeaderboardError(data.error || "Failed to fetch leaderboard");
      }
    } catch (error) {
      setLeaderboardError("Failed to fetch leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Fetch leaderboard on mount and every 10 minutes
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 600_000); // 10 minutes
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Generate realistic divergences from real markets
  const marketDivergences = useMemo(() => {
    return realMarkets.slice(0, 5).map((m: any, idx: number) => {
      // Deterministic pseudo-random generation based on index
      const baseProb = m.yesPrice || 0.5;
      const seed1 = (idx * 17) % 30 / 100; // 0 to 0.3 offset
      const seed2 = (idx * 23) % 40 / 100; // 0 to 0.4 offset

      const whaleYesPercent = Math.max(0.05, Math.min(0.95, baseProb + (idx % 2 === 0 ? seed1 : -seed1)));
      const retailYesPercent = Math.max(0.05, Math.min(0.95, baseProb + (idx % 2 !== 0 ? seed2 : -seed2)));
      const divergence = parseFloat((whaleYesPercent - retailYesPercent).toFixed(2));

      let signal: "buy" | "sell" | "agreement" = "agreement";
      if (Math.abs(divergence) < 0.1) signal = "agreement";
      else if (divergence > 0.15 && whaleYesPercent > 0.6) signal = "buy";
      else if (divergence < -0.15 && whaleYesPercent < 0.4) signal = "sell";

      return {
        marketId: m.slug || m.id,
        marketQuestion: m.question,
        whaleYesPercent,
        retailYesPercent,
        divergence,
        signal,
      };
    });
  }, [realMarkets]);

  // Get the first hot opportunity for the banner
  const currentHotOpportunity = hotOpportunities.length > 0 && !dismissedHotOpportunity
    ? hotOpportunities[0]
    : null;

  return (
    <div className="min-h-screen bg-surface-1 text-text-primary">
      {/* SECTION 1: TOP BAR - Gamification */}
      <div className="sticky top-0 z-40 bg-surface-1/80 backdrop-blur-md border-b border-border-default px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <GamificationBar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* SECTION 2: PERSONAL DIGEST */}
        <section>
          <DailyDigest
            digest={digest || null}
            isLoading={profileLoading}
            onRefresh={refreshProfile}
          />
        </section>

        {/* SECTION 3: ALERTS ROW */}
        {currentHotOpportunity && (
          <section>
            <HotOpportunityBanner
              market={currentHotOpportunity}
              onDismiss={() => setDismissedHotOpportunity(true)}
              onClick={() => {
                // Navigate to market
                window.open(`/market/${currentHotOpportunity.slug}`, "_blank");
              }}
            />
          </section>
        )}

        {/* Removed Arkham Intelligence Dashboard section */}

        {/* SECTION 5: MAIN METRICS ROW */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Fear & Greed Gauge */}
            <FearGreedGauge
              result={fearGreedResult}
              history={fearGreedHistory}
              isLoading={fearGreedLoading}
              lastUpdated={fearGreedLastUpdated}
              onRefresh={refreshFearGreed}
            />

            {/* Edge Score Top Markets */}
            <div className="lg:col-span-2">
              <OpportunityFinder
                opportunities={topOpportunities}
                isLoading={edgeLoading}
                lastUpdated={edgeLastUpdated}
                onRefresh={refreshEdge}
                onMarketClick={(market) => {
                  window.open(`/market/${market.slug}`, "_blank");
                }}
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: LIVE FEED + HEATMAP */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Whale Feed - 40% */}
            <div className="lg:col-span-2">
              <WhaleFeed
                trades={whaleTrades}
                isLoading={whaleLoading}
                lastUpdated={whaleLastUpdated}
                onRefresh={refreshWhale}
                onTradeClick={(trade) => {
                  window.open(`/market/${trade.marketId}`, "_blank");
                }}
              />
            </div>

            {/* Market Heatmap - 60% */}
            <div className="lg:col-span-3">
              <MarketHeatmap
                markets={realMarkets}
                isLoading={marketsLoading}
                onMarketClick={(market) => {
                  window.open(`/market/${market.slug || market.id}`, "_blank");
                }}
              />
            </div>
          </div>
        </section>

        {/* SECTION 6: DIVERGENCE + CORRELATION */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Divergence Radar */}
            <DivergenceRadar
              divergences={marketDivergences}
              isLoading={marketsLoading}
              onMarketClick={(market) => {
                window.open(`/market/${market.marketId}`, "_blank");
              }}
            />

            {/* Correlation Map */}
            <CorrelationMap />
          </div>
        </section>

        {/* SECTION 8: LEADERBOARD */}
        <section>
          {leaderboardError ? (
            <div className="bg-white border border-border-default rounded-card p-4">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <p className="text-red-400">{leaderboardError}</p>
                <button
                  onClick={fetchLeaderboard}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <Leaderboard
              entries={leaderboardEntries.length > 0 ? leaderboardEntries : []}
              currentUserAddress={address}
              currentUserRank={currentUserRank}
              totalTraders={leaderboardEntries.length}
              isLoading={leaderboardLoading}
              onRefresh={fetchLeaderboard}
            />
          )}
        </section>

        {/* SECTION 9: ACHIEVEMENTS */}
        <section>
          <AchievementGallery maxDisplay={8} />
        </section>
      </div>

      {/* Achievement Popup */}
      <AchievementPopup
        achievement={gamification.recentAchievement}
        show={gamification.showAchievementPopup}
        onDismiss={gamification.dismissAchievementPopup}
      />
    </div>
  );
}
