"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FearGreedResult,
  FearGreedHistory,
} from "@/lib/analytics/fear-greed-index";

interface UseFearGreedOptions {
  refreshInterval?: number; // in milliseconds
  period?: "1h" | "24h" | "7d";
}

export function useFearGreed(options: UseFearGreedOptions = {}) {
  const { refreshInterval = 300000, period = "24h" } = options; // 5 minutes

  const [result, setResult] = useState<FearGreedResult | null>(null);
  const [history, setHistory] = useState<FearGreedHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchFearGreed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analytics/fear-greed?period=${period}`);
      if (!response.ok) {
        throw new Error("Failed to fetch fear and greed index");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      setResult(data.result);
      setHistory(data.history || []);
      setLastUpdated(new Date(data.lastUpdated || Date.now()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate Fear & Greed index");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchFearGreed();
    const interval = setInterval(fetchFearGreed, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchFearGreed, refreshInterval]);

  return {
    result,
    history,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchFearGreed,
  };
}

export default useFearGreed;
