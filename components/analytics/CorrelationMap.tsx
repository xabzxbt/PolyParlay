"use client";

import React, { useState, useEffect } from "react";
import { Info, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
    buildCorrelationMatrix,
    getCorrelationColor,
    type MarketPrice,
    type CorrelationResult
} from "@/lib/analytics/correlation-engine";

interface Market {
    id: string;
    question: string;
    slug: string;
    volume24hr?: number;
}

export default function CorrelationMap() {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [matrix, setMatrix] = useState<CorrelationResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredCell, setHoveredCell] = useState<{ m1: Market, m2: Market, corr: number } | null>(null);

    useEffect(() => {
        async function loadCorrelations() {
            try {
                setLoading(true);
                // We fetch top 30 markets by volume using the available API endpoint
                // You could also use a dedicated endpoint or Gamma API directly
                const res = await fetch("https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false&order=volume24hr&ascending=false");
                const events = await res.json();

                let fetchedMarkets: Market[] = [];
                for (const ev of events) {
                    if (!ev.markets) continue;
                    for (const m of ev.markets) {
                        fetchedMarkets.push({
                            id: m.id,
                            question: m.question,
                            slug: m.slug,
                            volume24hr: parseFloat(m.volume24hr || "0"),
                        });
                    }
                }

                // Take top 30
                fetchedMarkets = fetchedMarkets
                    .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
                    .slice(0, 30);

                setMarkets(fetchedMarkets);

                // Fetch real price history from CLOB for each market via our API proxy
                const priceHistoryPromises = fetchedMarkets.map(async (m) => {
                    try {
                        const res = await fetch(`/api/analytics/price-history?tokenId=${m.id}&interval=1d&fidelity=30`);
                        if (!res.ok) return { marketId: m.id, prices: [] as number[] };
                        const data = await res.json();
                        // data.history is expected to be an array of { t, p } objects
                        const prices = (data.history || []).map((h: any) => parseFloat(h.p || "0.5"));
                        return { marketId: m.id, prices };
                    } catch {
                        return { marketId: m.id, prices: [] as number[] };
                    }
                });

                const marketPrices: MarketPrice[] = (await Promise.all(priceHistoryPromises))
                    .filter(mp => mp.prices.length >= 5); // Need minimum data points for correlation

                if (marketPrices.length < 2) {
                    setMarkets(fetchedMarkets);
                    setMatrix([]);
                    return;
                }

                const correlations = buildCorrelationMatrix(marketPrices);
                setMatrix(correlations);

            } catch (err) {
                console.error("Failed to load correlation matrix", err);
            } finally {
                setLoading(false);
            }
        }

        loadCorrelations();
    }, []);

    const getCorrelation = (id1: string, id2: string) => {
        if (id1 === id2) return 1;
        const result = matrix.find(
            c => (c.marketA === id1 && c.marketB === id2) || (c.marketA === id2 && c.marketB === id1)
        );
        return result ? result.correlation : 0;
    };

    const getCellColor = (correlation: number, isSame: boolean) => {
        if (isSame) return "bg-surface-2";
        // Custom logic to perfectly match the prompt requirements
        if (correlation > 0.7) return "bg-green-800";     // strong positive
        if (correlation > 0.3) return "bg-green-600";     // weak positive
        if (correlation >= -0.3) return "bg-slate-300";    // neutral (-0.3 to 0.3)
        if (correlation >= -0.7) return "bg-red-500";     // weak negative (-0.3 to -0.7)
        return "bg-red-800";                              // strong negative (<-0.7)
    };

    const getIcon = (correlation: number) => {
        if (correlation > 0.3) return <TrendingUp className="w-4 h-4 text-text-primary" />;
        if (correlation < -0.3) return <TrendingDown className="w-4 h-4 text-text-primary" />;
        return <Minus className="w-4 h-4 text-text-primary" />;
    };

    if (loading) {
        return (
            <div className="bg-white border border-border-default rounded-card p-6 h-96 flex flex-col items-center justify-center space-y-4">
                <div className="animate-pulse w-full max-w-md h-full grid grid-cols-10 gap-1 opacity-20">
                    {Array.from({ length: 100 }).map((_, i) => (
                        <div key={i} className="aspect-square bg-slate-500 rounded-sm"></div>
                    ))}
                </div>
                <p className="text-text-muted font-medium">Calculating Correlation Matrix...</p>
            </div>
        );
    }

    // To keep the grid manageable, display up to 15 markets instead of 30 if space is tight,
    // but let's stick to 20 for a good balance of detail vs readability
    const displayMarkets = markets.slice(0, 16);

    return (
        <div className="bg-white border border-border-default rounded-card p-4 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-text-primary">Correlation Map</h3>
                    <div className="group relative">
                        <Info className="w-4 h-4 text-text-disabled hover:text-text-secondary transition-colors cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-surface-2 border border-border-default rounded-lg text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                            Shows how markets move together. Green means they move in the same direction, red means opposite directions.
                        </div>
                    </div>
                </div>
            </div>

            {displayMarkets.length > 0 ? (
                <div className="relative border border-border-default/50 rounded-lg bg-surface-1/30 p-2 overflow-x-auto">
                    <div className="min-w-max">
                        {/* Headers row */}
                        <div className="flex">
                            <div className="w-32 shrink-0"></div>
                            {displayMarkets.map((m, i) => (
                                <div key={m.id} className="w-8 h-8 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] text-text-disabled font-mono" title={m.question}>
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        {displayMarkets.map((m1, i) => (
                            <div key={m1.id} className="flex group/row">
                                {/* Y Axis Label */}
                                <div
                                    className="w-32 shrink-0 pr-2 flex items-center justify-end text-[10px] text-text-disabled truncate group-hover/row:text-text-secondary transition-colors cursor-pointer"
                                    title={m1.question}
                                    onClick={() => window.open(`/market/${m1.slug}`, "_blank")}
                                >
                                    <span className="font-mono mr-1">{(i + 1).toString().padStart(2, '0')}</span>
                                    {m1.question.length > 20 ? m1.question.slice(0, 20) + '...' : m1.question}
                                </div>

                                {/* Cells */}
                                {displayMarkets.map((m2, j) => {
                                    const isSame = m1.id === m2.id;
                                    const corr = getCorrelation(m1.id, m2.id);
                                    const colorClass = getCellColor(corr, isSame);

                                    return (
                                        <div
                                            key={m2.id}
                                            className={`w-8 h-8 shrink-0 border border-slate-950 transition-all cursor-pointer hover:border-white hover:z-10 hover:scale-110 ${colorClass}`}
                                            onMouseEnter={() => setHoveredCell({ m1, m2, corr })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            onClick={() => !isSame && window.open(`/market/${m2.slug}`, "_blank")}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Hover Tooltip Overlay */}
                    {hoveredCell && hoveredCell.m1.id !== hoveredCell.m2.id && (
                        <div className="absolute right-4 top-4 bg-surface-2 border border-border-default rounded-lg p-3 w-64 shadow-2xl z-20 pointer-events-none">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-border-default/50">
                                <span className="text-xs font-semibold text-text-secondary">Correlation</span>
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium
                  ${hoveredCell.corr > 0.3 ? 'text-green-400 bg-green-400/10' :
                                        hoveredCell.corr < -0.3 ? 'text-red-400 bg-red-400/10' :
                                            'text-text-muted bg-slate-400/10'}`}>
                                    {getIcon(hoveredCell.corr)}
                                    {(hoveredCell.corr * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-[9px] text-text-disabled uppercase font-semibold tracking-wider">Market A</div>
                                    <div className="text-xs text-text-primary truncate">{hoveredCell.m1.question}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-text-disabled uppercase font-semibold tracking-wider">Market B</div>
                                    <div className="text-xs text-text-primary truncate">{hoveredCell.m2.question}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center h-64 text-text-disabled">
                    Not enough data to generate correlation map
                </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[10px] text-text-muted">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-800" /> Strong Positive (&gt;0.7)</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-600" /> Positive (0.3 to 0.7)</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-300" /> Neutral</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /> Negative (-0.3 to -0.7)</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-800" /> Strong Negative (&lt;-0.7)</div>
            </div>
        </div>
    );
}
