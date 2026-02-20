"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn, formatUSD, formatVolume, formatPrice, timeUntil, getCategoryIcon } from "@/lib/utils";
import { isActiveMarket } from "@/lib/filters";
import { useEvents } from "@/hooks/useMarketData";

type Tab = "volume" | "liquidity" | "new";

interface MarketData {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  volume24hr: number;
  liquidity: number;
  category: string;
  endDate: string;
  imageUrl?: string;
  eventId?: string;
  eventTitle?: string;
}

export default function PopularPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("volume");
  const { events, isLoading } = useEvents({ limit: 150 });

  const markets = useMemo(() => {
    const flat: MarketData[] = [];
    for (const ev of events) {
      const g = ev as Record<string, unknown>;
      const evMarkets = (g.markets as Array<Record<string, unknown>>) || [];
      for (const rawM of evMarkets) {
        const m = rawM as unknown as MarketData & { groupItemTitle?: string };
        if (!isActiveMarket(m)) continue;
        flat.push({
          id: m.id,
          question: m.groupItemTitle || m.question,
          yesPrice: m.yesPrice,
          noPrice: m.noPrice,
          volume: m.volume || 0,
          volume24hr: m.volume24hr || 0,
          liquidity: m.liquidity || 0,
          category: (g.category as string) || "other",
          endDate: m.endDate || (g.endDate as string),
          imageUrl: m.imageUrl || (g.imageUrl as string),
          eventId: g.id as string,
          eventTitle: g.title as string,
        });
      }
    }
    return flat;
  }, [events]);

  // Sort by tab
  const sorted = useMemo(() => {
    const list = [...markets];
    switch (tab) {
      case "volume":
        return list.sort((a, b) => b.volume24hr - a.volume24hr).slice(0, 25);
      case "liquidity":
        return list.sort((a, b) => b.liquidity - a.liquidity).slice(0, 25);
      case "new":
        return list.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).slice(0, 25);
      default:
        return list;
    }
  }, [markets, tab]);

  // Quick stats
  const totalVol24h = markets.reduce((s, m) => s + m.volume24hr, 0);
  const totalLiq = markets.reduce((s, m) => s + m.liquidity, 0);
  const totalMarkets = markets.length;

  return (
    <div className="max-w-container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Popular Markets</h1>
        <p className="text-sm text-text-secondary font-medium">Top prediction markets by volume, liquidity, and activity.</p>
      </div>

      {/* Mini stats */}
      <div className="flex items-center gap-3 text-[10px] text-text-secondary font-medium mb-5">
        <span>24h Volume: <span className="font-tabular text-text-primary font-black">{formatVolume(totalVol24h)}</span></span>
        <span className="text-text-disabled">·</span>
        <span>Liquidity: <span className="font-tabular text-text-primary font-black">{formatVolume(totalLiq)}</span></span>
        <span className="text-text-disabled">·</span>
        <span><span className="font-tabular text-text-primary font-black">{totalMarkets}</span> markets loaded</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border-default mb-4">
        {([
          { id: "volume" as const, label: "Top Volume 24h" },
          { id: "liquidity" as const, label: "Most Liquid" },
          { id: "new" as const, label: "🆕 Ending Soon" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all",
              tab === t.id ? "text-primary border-primary" : "text-text-muted border-transparent hover:text-text-primary"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-card" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xs text-text-muted">No markets found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((m, i) => {
            const yp = Math.round(m.yesPrice * 100);
            return (
              <div key={m.id} role="button" tabIndex={0}
                onClick={() => router.push(`/market/${m.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${m.id}`); } }}
                className="card p-3.5 cursor-pointer hover:bg-surface-3/30 transition-all group">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <span className={cn(
                    "w-7 text-center text-sm font-bold shrink-0",
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-text-muted"
                  )}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}`}
                  </span>

                  {/* Image */}
                  {m.imageUrl ? (
                    <Image unoptimized src={m.imageUrl} alt={m.question} width={32} height={32} className="w-8 h-8 rounded-md object-cover bg-surface-3 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-surface-3 flex items-center justify-center text-xs shrink-0">
                      {getCategoryIcon(m.category)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate group-hover:text-primary transition-colors">
                      {m.question}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                      <span className="capitalize">{m.category}</span>
                      <span className="text-text-disabled">·</span>
                      <span className="font-tabular">{formatVolume(m.volume24hr)} 24h</span>
                      <span className="text-text-disabled">·</span>
                      <span className="font-tabular">{formatVolume(m.liquidity)} liq</span>
                      <span className="text-text-disabled">·</span>
                      <span>⏱ {timeUntil(new Date(m.endDate))}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <div className={cn("text-xl font-mono font-extrabold font-tabular",
                      yp >= 70 ? "text-success" : yp <= 30 ? "text-error" : "text-text-primary"
                    )}>
                      {yp}%
                    </div>
                    <div className="text-[9px] text-text-muted">
                      {tab === "volume" && <span className="font-tabular">{formatVolume(m.volume24hr)}</span>}
                      {tab === "liquidity" && <span className="font-tabular">{formatVolume(m.liquidity)}</span>}
                      {tab === "new" && <span>{timeUntil(new Date(m.endDate))}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
