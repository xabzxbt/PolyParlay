"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  WhaleTrade,
  WhaleActivity,
  WhaleFilter,
  WHALE_THRESHOLDS,
  filterWhaleTrades,
  sortWhaleTradesBySize,
  groupWhaleTradesByMarket,
  calculateWhaleConfidence,
  getWhaleSentiment,
  getWhaleClassification,
} from "@/lib/analytics/whale-detector";

interface UseWhaleActivityOptions {
  pollInterval?: number; // in milliseconds
  minSize?: number;
  maxTrades?: number;
  period?: "1h" | "24h" | "7d";
}

export function useWhaleActivity(options: UseWhaleActivityOptions = {}) {
  const {
    pollInterval = 30000, // 30 seconds
    minSize = WHALE_THRESHOLDS.SMALL,
    maxTrades = 50,
    period = "24h",
  } = options;

  const [trades, setTrades] = useState<WhaleTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<WhaleFilter>({ side: "ALL" });

  // Filter trades based on current filter
  const filteredTrades = useMemo(() => {
    const filtered = filterWhaleTrades(trades, filter);
    return sortWhaleTradesBySize(filtered).slice(0, maxTrades);
  }, [trades, filter, maxTrades]);

  // Group by market
  const marketActivity = useMemo(() => {
    const grouped = groupWhaleTradesByMarket(trades);
    return Array.from(grouped.values()).map((activity) => ({
      ...activity,
      confidence: calculateWhaleConfidence(activity.whaleYesVolume, activity.whaleNoVolume),
      sentiment: getWhaleSentiment(
        calculateWhaleConfidence(activity.whaleYesVolume, activity.whaleNoVolume)
      ),
    }));
  }, [trades]);

  // Get whale confidence for a specific market
  const getMarketWhaleConfidence = useCallback(
    (marketId: string): number => {
      const activity = marketActivity.find((m) => m.marketId === marketId);
      return activity?.confidence ?? 0.5;
    },
    [marketActivity]
  );

  // Fetch whale activity from backend API
  const fetchWhaleActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analytics/whale-activity?minSize=${minSize}&period=${period}`);

      if (!response.ok) {
        throw new Error("Failed to fetch whale activity");
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setTrades(data.trades || []);
      // marketActivity is now calculated via API but we're re-deriving it in the hook's useMemo above. 
      // If we used API's grouped data directly we'd set it here, but keeping pure state sync simple:
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch whale activity");
      setTrades([]);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [minSize, period]);

  // Auto-refresh
  useEffect(() => {
    fetchWhaleActivity();
    const interval = setInterval(fetchWhaleActivity, pollInterval);
    return () => clearInterval(interval);
  }, [fetchWhaleActivity, pollInterval]);

  // Update filter
  const updateFilter = useCallback((newFilter: Partial<WhaleFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  return {
    trades: filteredTrades,
    allTrades: trades,
    marketActivity,
    isLoading,
    error,
    lastUpdated,
    filter,
    updateFilter,
    getMarketWhaleConfidence,
    refresh: fetchWhaleActivity,
  };
}

export default useWhaleActivity;
