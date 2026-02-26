"use client";

import React from "react";
import useSWR from "swr";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PriceProbability({ marketId, tokenId }: { marketId?: string; tokenId?: string }) {
    const effectiveId = tokenId || marketId;
    const url = effectiveId
        ? `/api/analytics/arkham/price-prob?token=${effectiveId}`
        : "/api/analytics/arkham/price-prob";
    const { data, error, isLoading } = useSWR(url, fetcher, { refreshInterval: 60000 });

    const history = data?.data?.history || [];
    const startPrice = history[0]?.price ?? 0.5;
    const endPrice = history[history.length - 1]?.price ?? startPrice;
    const isUp = endPrice >= startPrice;
    const delta = Math.abs(endPrice - startPrice) * 100;
    const hasData = history.length > 1;

    return (
        <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '260px',
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Price & Probability
                    </span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '9999px', letterSpacing: '0.06em' }}>
                    24H
                </span>
            </div>

            {/* Stats row */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                        Implied Prob.
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {isLoading ? "—" : `${(endPrice * 100).toFixed(1)}%`}
                    </div>
                </div>
                {!isLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {delta.toFixed(1)}%
                    </div>
                )}
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, padding: '8px 8px 4px', position: 'relative', minHeight: '120px' }}>
                {isLoading ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border-default)', borderTopColor: 'var(--text-primary)', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : !hasData ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <BarChart2 size={28} style={{ color: 'var(--border-default)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No price history available yet</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                            <XAxis dataKey="time" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <ReferenceLine y={0.5} stroke="var(--border-default)" strokeDasharray="3 3" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-dark)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    color: '#fff',
                                    padding: '6px 10px',
                                }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, 'Prob']}
                                labelFormatter={() => ''}
                            />
                            <Line
                                type="monotone"
                                dataKey="price"
                                stroke={isUp ? "var(--accent-green)" : "var(--accent-red)"}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={true}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div style={{ padding: '6px 16px', borderTop: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Graphing 24H intervals{!marketId && " · highest volatility market"}
            </div>
        </div>
    );
}
