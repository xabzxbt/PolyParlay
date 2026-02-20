"use client";

import React from "react";
import useSWR from "swr";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from "recharts";
import { TrendingUp, BarChart2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PriceProbability({ marketId }: { marketId?: string }) {
    const url = marketId ? `/api/analytics/arkham/price-prob?market=${marketId}` : "/api/analytics/arkham/price-prob";
    const { data, error, isLoading } = useSWR(url, fetcher, { refreshInterval: 60000 });

    if (error) return <div className="p-4 bg-red-500/10 text-red-500 rounded-card">Error loading Price Prob</div>;

    const history = data?.data?.history || [];
    const startPrice = history[0]?.price || 0.5;
    const endPrice = history[history.length - 1]?.price || startPrice;
    const isUp = endPrice >= startPrice;

    return (
        <div className="bg-surface-1 border border-border-default rounded-card overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border-default flex justify-between items-center">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-purple-500" />
                    Price & Probability
                </h2>
                <span className="text-xs font-bold text-text-secondary bg-surface-2 px-2 py-1 rounded">24H RANGE</span>
            </div>

            <div className="p-4 bg-surface-1 border-b border-border-default flex items-end justify-between">
                <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Implied Probability</p>
                    <h3 className="text-3xl font-black text-text-primary">
                        {isLoading ? "..." : `${(endPrice * 100).toFixed(1)}%`}
                    </h3>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUp className={`w-4 h-4 ${!isUp && "rotate-180"}`} />
                    {(Math.abs(endPrice - startPrice) * 100).toFixed(1)}%
                </div>
            </div>

            <div className="flex-1 p-4 min-h-[150px] relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-1/50 backdrop-blur-sm z-10">
                        <div className="w-6 h-6 rounded-pill border-2 border-brand border-t-transparent animate-spin" />
                    </div>
                ) : null}

                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, 'Probability']}
                            labelFormatter={() => ''}
                        />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke={isUp ? "#10b981" : "#f43f5e"}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="p-3 border-t border-border-default text-center text-xs text-text-muted">
                Graphing 24H intervals {!marketId && "on highest volatility active market"}.
            </div>
        </div>
    );
}
