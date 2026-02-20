"use client";

import React from "react";
import useSWR from "swr";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from "recharts";
import { Box, HelpCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MarketDepthAnalysis({ marketId }: { marketId?: string }) {
    const url = marketId ? `/api/analytics/arkham/market-depth?market=${marketId}` : "/api/analytics/arkham/market-depth";
    const { data, error, isLoading } = useSWR(url, fetcher, { refreshInterval: 60000 });

    if (error) return <div className="p-4 bg-red-500/10 text-red-500 rounded-card">Error loading Market Depth</div>;

    const imbalance = data?.data?.imbalance || { bidVolume: 0, askVolume: 0, ratio: 0.5 };
    const walls = data?.data?.liquidityWalls || [];

    // Create a stylized bid/ask bar
    const totalVol = imbalance.bidVolume + imbalance.askVolume;
    const bidPct = totalVol > 0 ? (imbalance.bidVolume / totalVol) * 100 : 50;

    return (
        <div className="bg-surface-1 border border-border-default rounded-card overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border-default flex justify-between items-center">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Box className="w-5 h-5 text-emerald-500" />
                    Market Depth
                </h2>
                <div title="Analyzes top volume market order book limit orders">
                    <HelpCircle className="w-4 h-4 text-text-muted hover:text-text-primary cursor-pointer" />
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Bid/Ask Imbalance */}
                <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                        <span className="text-emerald-400">Bids (${Math.round(imbalance.bidVolume).toLocaleString()})</span>
                        <span className="text-rose-400">Asks (${Math.round(imbalance.askVolume).toLocaleString()})</span>
                    </div>
                    <div className="w-full h-3 rounded-pill overflow-hidden flex bg-surface-2 border border-border-default">
                        <div className="h-full bg-emerald-500/80 transition-all duration-1000" style={{ width: `${bidPct}%` }} />
                        <div className="h-full bg-rose-500/80 transition-all duration-1000" style={{ width: `${100 - bidPct}%` }} />
                    </div>
                    <div className="text-center text-xs text-text-muted mt-2 font-medium">
                        Orderbook Imbalance ({Math.round(bidPct)}% Buy-side) {!marketId && "// Evaluated on top active market"}
                    </div>
                </div>

                {/* Liquidity Walls */}
                <div className="bg-surface-1 border border-border-default rounded-lg p-3">
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Liquidity Walls ($5k+)</h3>
                    {isLoading ? (
                        <div className="h-20 flex items-center justify-center"><div className="w-4 h-4 rounded-pill border-2 border-brand border-t-transparent animate-spin" /></div>
                    ) : walls.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {walls.map((w: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <div className="flex gap-2">
                                        <span className={w.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>{w.side} WALL</span>
                                        <span className="text-text-primary">@ {w.price}¢</span>
                                    </div>
                                    <span className="font-bold font-mono text-text-primary">${w.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-text-muted text-center py-4">No walls &gt; $5,000 detected</div>
                    )}
                </div>
            </div>
        </div>
    );
}
