"use client";
import { useState, useEffect, useCallback } from "react";

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30_000;

async function cachedFetch<T>(url: string, ttl = CACHE_TTL): Promise<T> {
  const now = Date.now();
  const c = cache.get(url);
  if (c && now - c.ts < ttl) return c.data as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, ts: now });
  return data as T;
}

// Fetch grouped events + platform stats
export function useEvents(params: {
  limit?: number; tagId?: number; order?: string; ascending?: boolean;
} = {}) {
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { limit = 50, tagId, order = "volume24hr", ascending = false } = params;

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `/api/markets?type=events&limit=${limit}&order=${order}&ascending=${ascending}`;
      if (tagId) url += `&tag_id=${tagId}`;
      const d = await cachedFetch<any>(url);
      if (d.success) { setEvents(d.events); setStats(d.stats); setError(null); }
      else setError(d.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setIsLoading(false); }
  }, [limit, tagId, order, ascending]);

  useEffect(() => { load(); }, [load]);
  return { events, stats, isLoading, error, refresh: load };
}

// Legacy flat markets
function useMarkets(params: {
  limit?: number; tagId?: number; order?: string; ascending?: boolean;
} = {}) {
  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { limit = 50, tagId, order = "volume24hr", ascending = false } = params;

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `/api/markets?type=flat&limit=${limit}&order=${order}&ascending=${ascending}`;
      if (tagId) url += `&tag_id=${tagId}`;
      const d = await cachedFetch<any>(url);
      if (d.success) { setMarkets(d.markets); setError(null); }
      else setError(d.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setIsLoading(false); }
  }, [limit, tagId, order, ascending]);

  useEffect(() => { load(); }, [load]);
  return { markets, isLoading, error, refresh: load };
}

export function useSubTags(tagId: number | null) {
  const [tags, setTags] = useState<{ id: string; label: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(true);
    const url = tagId ? `/api/markets?type=subtags&tag_id=${tagId}` : `/api/markets?type=subtags`;
    cachedFetch<any>(url, 300_000)
      .then(d => { if (d.success && d.tags) setTags(d.tags); else setTags([]); })
      .catch(() => setTags([]))
      .finally(() => setIsLoading(false));
  }, [tagId]);
  return { tags, isLoading };
}

export function useMarket(id: string) {
  const [market, setMarket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    cachedFetch<any>(`/api/markets/${id}`)
      .then(d => { if (d.success) setMarket(d.market); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);
  return { market, isLoading };
}

// Phase 2: Single event detail with all markets
export function useEventDetail(eventId: string) {
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const d = await cachedFetch<any>(`/api/events/${eventId}`);
      if (d.success) { setEvent(d.event); setError(null); }
      else setError(d.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setIsLoading(false); }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);
  return { event, isLoading, error, refresh: load };
}