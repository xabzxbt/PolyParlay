"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { calculateEdgeScore, EdgeScoreResult, EdgeScoreInput } from "@/lib/analytics/edge-score";

export interface MarketWithEdge {
  id: string;
  question: string;
  slug: string;
  description?: string;
  yesPrice: number;
  noPrice: number;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  category?: string;
  edgeScore: EdgeScoreResult;
}

interface UseEdgeScoreOptions {
  refreshInterval?: number; // in milliseconds
}

export function useEdgeScore(options: UseEdgeScoreOptions = {}) {
  const { refreshInterval = 300000 } = options;

  const [marketsWithEdge, setMarketsWithEdge] = useState<MarketWithEdge[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<MarketWithEdge[]>([]);
  const [hotOpportunities, setHotOpportunities] = useState<MarketWithEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refresh data from API
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/edge-score");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setMarketsWithEdge(data.marketsWithEdge || []);
      setTopOpportunities(data.topOpportunities || []);
      setHotOpportunities(data.hotOpportunities || []);
      setLastUpdated(new Date(data.lastUpdated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch edge scores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    marketsWithEdge,
    topOpportunities,
    hotOpportunities,
    isLoading,
    lastUpdated,
    error,
    refresh
  };
}

export default useEdgeScore;
