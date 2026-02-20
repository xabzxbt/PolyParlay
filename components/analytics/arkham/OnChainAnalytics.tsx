"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import {
    Activity, ShieldCheck, Zap, Users,
    Calculator, Clock, TrendingUp, TrendingDown,
    AlertTriangle, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getQuantMetrics } from "@/lib/quant-models";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface OnChainAnalyticsProps {
    market: any;
}

export default function OnChainAnalytics({ market }: OnChainAnalyticsProps) {
    const [activeTab, setActiveTab] = useState<"overview" | "traders">("overview");

    // Construct API URLs
    const conditionId = market?.conditionId || market?.id || "";
    const yesToken = market?.yesTokenId || "";
    const noToken = market?.noTokenId || "";
    const yesPrice = market?.yesPrice || 0.5;

    const queryParams = `?condition_id=${conditionId}&yes_token=${yesToken}&no_token=${noToken}&yes_price=${yesPrice}`;

    // Fetch Smart Positions (Integrity, Advanced Metrics)
    const { data: smartPosRes, isLoading: isLoadingSmart } = useSWR(
        market ? `/api/smart-positions${queryParams}` : null,
        fetcher,
        { refreshInterval: 60000 }
    );

    // Fetch Market Traders (Leaderboard, Tiers)
    const { data: tradersRes, isLoading: isLoadingTraders } = useSWR(
        market ? `/api/market-traders${queryParams}` : null,
        fetcher,
        { refreshInterval: 60000 }
    );

    const analytics = smartPosRes?.analytics;
    const highStakes = smartPosRes?.highStakes || [];
    const tradersPnl = tradersRes?.allTraders || [];

    // Local Quant Metrics (Kelly, Monte Carlo)
    const quantMetrics = useMemo(() => {
        if (!market || !smartPosRes) return null;
        const days = Math.max(1, Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000));
        return getQuantMetrics(
            market.yesPrice || 0.5,
            smartPosRes.totalYesUsd || 1000, // Fallbacks to avoid Infinity
            smartPosRes.totalNoUsd || 1000,
            days
        );
    }, [market, smartPosRes]);

    const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
    const fmtUsd = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    if (isLoadingSmart || isLoadingTraders) {
        return (
            <div className="space-y-4 animate-pulse mt-8">
                <div className="h-8 bg-surface-1 rounded-lg w-1/4"></div>
                <div className="h-64 bg-surface-1 rounded-card"></div>
            </div>
        );
    }

    if (!analytics) return null;

    const isWashHigh = analytics.washTradingIndex > 5;
    const isSlippageHigh = analytics.slippage10k > 2;

    return (
        <div className="mt-8 space-y-6 animate-fade-in relative z-10">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Activity className="text-primary" />
                    On-Chain X-Ray
                </h2>
                <div className="flex bg-surface-1 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeTab === "overview" ? "bg-primary text-white shadow" : "text-text-muted hover:text-text-primary")}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("traders")}
                        className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeTab === "traders" ? "bg-primary text-white shadow" : "text-text-muted hover:text-text-primary")}
                    >
                        Top Traders
                    </button>
                </div>
            </div>

            {activeTab === "overview" && (
                <div className="space-y-4">
                    {/* 1. Trust & Integrity + Quant Math */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* HHI Score */}
                        <div className="bg-surface-1 border border-border-default rounded-card p-4 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-text-secondary font-bold uppercase text-xs">
                                <ShieldCheck className="w-4 h-4 text-primary" /> Centralization (HHI)
                            </div>
                            <div className={cn("text-2xl font-mono font-bold", analytics.hhiLabel === "High" ? "text-red-500" : "text-text-primary")}>
                                {analytics.hhiLabel}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Is money held by a few whales?</div>
                        </div>

                        {/* Wash Trading */}
                        <div className="bg-surface-1 border border-border-default rounded-card p-4 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-text-secondary font-bold uppercase text-xs">
                                <Zap className="w-4 h-4 text-primary" /> Wash Index
                            </div>
                            <div className={cn("text-2xl font-mono font-bold", isWashHigh ? "text-red-500" : "text-green-500")}>
                                {fmtPct(analytics.washTradingIndex)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Estimated wash trading %</div>
                        </div>

                        {/* Kelly Criterion */}
                        {quantMetrics && (
                            <div className="bg-surface-1 border border-border-default rounded-card p-4 hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-2 mb-2 text-text-secondary font-bold uppercase text-xs">
                                    <Calculator className="w-4 h-4 text-yellow-500" /> Optimal Kelly Size
                                </div>
                                <div className="text-2xl font-mono font-bold text-yellow-500">
                                    {fmtPct(quantMetrics.kelly.fraction * 100)}
                                </div>
                                <div className="text-xs text-text-muted mt-1">{quantMetrics.kelly.riskReward.toFixed(1)}R Risk/Reward</div>
                            </div>
                        )}

                        {/* Smart Money */}
                        <div className="bg-surface-1 border border-border-default rounded-card p-4 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-text-secondary font-bold uppercase text-xs">
                                <Brain className="w-4 h-4 text-purple-500" /> Smart Money
                            </div>
                            <div className="text-2xl font-mono font-bold text-purple-500">
                                {analytics.smartMoneyCount} <span className="text-sm font-sans">Wallets</span>
                            </div>
                            <div className="text-xs text-text-muted mt-1">Profitable traders active</div>
                        </div>
                    </div>

                    {/* Fresh Money & High Stakes */}
                    {highStakes && highStakes.length > 0 && (
                        <div className="bg-surface-1 border border-red-500/20 rounded-card overflow-hidden p-4 relative">
                            <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay pointer-events-none" />
                            <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <AlertTriangle className="w-4 h-4" />
                                High Stakes Anomalies Detected
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {highStakes.slice(0, 4).map((w: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white border border-red-500/20 rounded-lg">
                                        <div>
                                            <div className="font-bold text-xs">{w.name || `${w.address.slice(0, 6)}...`}</div>
                                            <div className="text-[10px] text-text-muted">Last active: {new Date(w.lastActive).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn("font-bold font-mono text-sm", w.side === "YES" ? "text-green-500" : "text-red-500")}>
                                                {w.side} {fmtUsd(w.usd)}
                                            </div>
                                            <div className="text-[10px] font-bold text-text-secondary">
                                                {w.pnl > 0 ? '+' : ''}{fmtUsd(w.pnl)} PnL
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "traders" && (
                <div className="bg-surface-1 border border-border-default rounded-card overflow-hidden">
                    <div className="p-4 border-b border-border-default bg-surface-1">
                        <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 uppercase tracking-wide">
                            <Users className="w-4 h-4 text-primary" />
                            Top Winners & Losers for this Market
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-default text-[10px] text-text-muted uppercase tracking-wider bg-surface-1/50">
                                    <th className="p-3 font-bold">Trader</th>
                                    <th className="p-3 font-bold text-right">Position Size</th>
                                    <th className="p-3 font-bold text-center">Side</th>
                                    <th className="p-3 font-bold text-right">Realized / Unrealized PnL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stroke text-sm">
                                {tradersPnl.slice(0, 15).map((t: any, idx: number) => {
                                    return (
                                        <tr key={idx} className="hover:bg-surface-1 transition-colors group">
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-text-primary">{t.name || `${t.address.slice(0, 6)}...`}</div>
                                                    {t.isNew && <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded uppercase font-bold">New</span>}
                                                </div>
                                                <div className="text-[10px] text-text-muted flex items-center gap-1 font-mono mt-0.5">
                                                    {t.tradeCount} trades
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-mono text-text-primary">
                                                {fmtUsd(t.positionValue)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                                                    t.side === "YES" ? "bg-green-500/10 text-green-500" :
                                                        t.side === "NO" ? "bg-red-500/10 text-red-500" : "bg-surface-2 text-text-secondary"
                                                )}>
                                                    {t.side}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className={cn("font-bold font-mono group-hover:scale-105 transition-transform origin-right",
                                                    t.pnl > 0 ? "text-green-500" : t.pnl < 0 ? "text-red-500" : "text-text-muted"
                                                )}>
                                                    {t.pnl > 0 ? "+" : ""}{fmtUsd(t.pnl)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tradersPnl.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-text-muted text-sm">
                                            No recent trader data found for this market.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
