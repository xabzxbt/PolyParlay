"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  calculateTradingProfile,
  generateDailyDigest,
  Trade,
  TradingProfile,
  DailyDigest,
} from "@/lib/analytics/profile-calculator";

const CACHE_KEY = "polyparlay_trading_profile";
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface UseTradingProfileOptions {
  userAddress?: string;
  refreshInterval?: number;
}

export function useTradingProfile(options: UseTradingProfileOptions = {}) {
  const { userAddress, refreshInterval = 900000 } = options;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradeHistory = useCallback(async () => {
    if (!userAddress) {
      // No wallet connected — show empty state
      setTrades([]);
      setDigest(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setTrades(data);
          setDigest(generateDailyDigest(data));
          setIsLoading(false);
          return;
        }
      }

      // Fetch from Polymarket Data API
      const response = await fetch(
        `https://data-api.polymarket.com/activity?user=${userAddress}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }

      const data = await response.json();

      // Transform API data to our Trade format
      const transformedTrades: Trade[] = (data || []).map((trade: any) => ({
        id: trade.id || trade.txHash,
        marketId: trade.conditionId || "",
        marketQuestion: trade.question || "",
        side: trade.side === "yes" || trade.outcome === "Yes" ? "YES" : "NO",
        size: parseFloat(trade.size || trade.amount || 0),
        profit: parseFloat(trade.profit || 0),
        outcome: trade.status === "win" ? "win" : trade.status === "loss" ? "loss" : "pending",
        category: trade.category || "other",
        timestamp: new Date(trade.timestamp || trade.createdAt).getTime(),
      }));

      // Cache the results
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: transformedTrades, timestamp: Date.now() })
      );

      setTrades(transformedTrades);
      setDigest(generateDailyDigest(transformedTrades));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trade history");
      // On error, show empty state
      setTrades([]);
      setDigest(null);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Auto-refresh
  useEffect(() => {
    fetchTradeHistory();
    const interval = setInterval(fetchTradeHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchTradeHistory, refreshInterval]);

  // Get recommended markets based on best category
  const recommendedMarkets = useMemo(() => {
    if (!digest?.profile.bestCategory) return [];
    // In production, fetch markets in the best category
    return [];
  }, [digest]);

  return {
    trades,
    digest,
    profile: digest?.profile || null,
    isLoading,
    error,
    refresh: fetchTradeHistory,
    recommendedMarkets,
  };
}

export default useTradingProfile;
