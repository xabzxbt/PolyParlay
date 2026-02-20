"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Wallet, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSellPosition } from "@/hooks/useSellPosition";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useRedeem } from "@/hooks/useRedeem";
import { useAuth } from "@/providers/AuthProvider";
import BridgeModal from "@/components/wallet/BridgeModal";

export default function PortfolioPage() {
    const { positions, orders, loading, error, refresh, isEnabled } = usePortfolio();
    const { sellPosition, phase: sellPhase } = useSellPosition();
    const { credentials } = usePolymarketAuth();
    const { redeem, loading: redeeming, checkingPayout } = useRedeem();
    const { address } = useAuth();

    // Proxy wallet state
    const [proxyWallet, setProxyWallet] = useState<string | null>(null);
    const [proxyLoading, setProxyLoading] = useState(false);
    const [proxyError, setProxyError] = useState<string | null>(null);

    // Cancel all orders state
    const [showCancelAllModal, setShowCancelAllModal] = useState(false);
    const [cancellingAll, setCancellingAll] = useState(false);

    // Price refresh state
    const [priceLastUpdated, setPriceLastUpdated] = useState(new Date());

    // Sell verification state
    const [verifyingPosition, setVerifyingPosition] = useState(false);
    const [positionWarning, setPositionWarning] = useState<'not_found' | 'mismatch' | null>(null);
    const [actualOnChainSize, setActualOnChainSize] = useState<number | null>(null);

    // Selling state
    const [sellingToken, setSellingToken] = useState<string | null>(null);
    const [sellAmount, setSellAmount] = useState<string>("");

    // Bridge Modal State
    const [isBridgeOpen, setIsBridgeOpen] = useState(false);

    // Verify on-chain position
    const verifyOnChainPosition = async (tokenId: string, expectedSize: number) => {
        setVerifyingPosition(true);
        setPositionWarning(null);
        try {
            const res = await fetch(
                `/api/sell-position?token=${tokenId}&size=${expectedSize}`
            );
            if (!res.ok) return;
            const data = await res.json();
            const actual = data.size ?? data.balance ?? data.amount ?? 0;
            setActualOnChainSize(actual);

            if (actual === 0) {
                setPositionWarning('not_found');
            } else if (Math.abs(actual - expectedSize) > 0.001) {
                setPositionWarning('mismatch');
            }
        } catch {
            // silent fail, allow sell to proceed
        } finally {
            setVerifyingPosition(false);
        }
    };

    // Call verification when selling position is selected
    useEffect(() => {
        if (sellingToken && sellAmount) {
            const size = parseFloat(sellAmount);
            if (size > 0) {
                verifyOnChainPosition(sellingToken, size);
            }
        } else {
            setPositionWarning(null);
            setActualOnChainSize(null);
        }
    }, [sellingToken, sellAmount]);

    const tokenIds = useMemo(() =>
        positions?.map((p: any) => p.asset ?? p.tokenId ?? p.token).filter(Boolean) ?? []
        , [positions]);

    const { data: pricesData, isValidating: priceRefreshing, mutate: mutatePrices } = useSWR(
        tokenIds.length > 0 ? ['/api/prices', tokenIds.join(',')] : null,
        async ([url]: [string, string]) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenIds })
            });
            const data = await res.json();
            return data.success && data.prices ? data.prices : {};
        },
        { refreshInterval: 30000, revalidateOnFocus: true }
    );

    const positionsWithPrices = useMemo(() => {
        if (!positions) return [];
        if (!pricesData) return positions;
        return positions.map((p: any) => {
            const tokenId = p.asset ?? p.tokenId ?? p.token;
            const freshPrice = pricesData[tokenId];
            if (freshPrice != null) {
                return {
                    ...p,
                    market: {
                        ...p.market,
                        currentPrice: freshPrice
                    },
                    valueUsd: p.size * freshPrice
                };
            }
            return p;
        });
    }, [positions, pricesData]);

    const hasPositions = positions && positions.length > 0;

    const handleRefreshPrices = useCallback(() => {
        setPriceLastUpdated(new Date());
        mutatePrices();
    }, [mutatePrices]);

    // Fetch proxy wallet when address changes
    useEffect(() => {
        if (!address) {
            setProxyWallet(null);
            return;
        }

        const fetchProxyWallet = async () => {
            setProxyLoading(true);
            setProxyError(null);
            try {
                const response = await fetch(`/api/proxy-wallet?address=${address}`);
                const data = await response.json();
                if (data.success) {
                    setProxyWallet(data.proxyWallet);
                } else {
                    setProxyError(data.error || "Failed to fetch proxy wallet");
                }
            } catch (err) {
                setProxyError("Failed to fetch proxy wallet");
            } finally {
                setProxyLoading(false);
            }
        };

        fetchProxyWallet();
    }, [address]);

    // Cancel all orders handler - uses POST /cancel-all endpoint
    const handleCancelAllOrders = async () => {
        if (!credentials || orders.length === 0) return;

        setCancellingAll(true);
        try {
            // Use the efficient POST /cancel-all endpoint that cancels all orders at once
            const res = await fetch("/api/cancel-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userCredentials: credentials }),
            });

            const data = await res.json();

            if (data.success) {
                setShowCancelAllModal(false);
                refresh();
                alert(`Successfully cancelled all ${orders.length} orders`);
            } else {
                alert(`Failed to cancel orders: ${data.error}`);
            }
        } catch (err) {
            alert("Failed to cancel orders");
        } finally {
            setCancellingAll(false);
        }
    };

    const handleRedeem = async (conditionId: string) => {
        if (!conditionId) return;
        // Let the redeem hook automatically determine winning outcome(s)
        const res = await redeem(conditionId);
        if (res.success) {
            alert("Redemption successful! Your winnings are now in your wallet (USDC).");
            refresh();
        } else {
            alert(`Redemption failed: ${res.error}. If you use a Proxy Wallet (default Polymarket account), please redeem directly on polymarket.com.`);
        }
    };

    const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");

    // Cancel Order Handler
    const handleCancelOrder = async (orderID: string) => {
        if (!confirm("Cancel this order?")) return;
        if (!credentials) return;

        try {
            const res = await fetch("/api/cancel-order", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID, userCredentials: credentials }),
            });
            if (res.ok) {
                refresh();
            } else {
                alert("Failed to cancel order");
            }
        } catch (e) {
            alert("Error cancelling order");
        }
    };

    // Sell Position Handler
    const handleSell = async () => {
        if (!sellingToken || !sellAmount) return;
        const pos = positionsWithPrices.find((p) => p.tokenId === sellingToken);
        if (!pos) return;

        // Use current market price for limit order (or slightly lower for fill)
        // For simplicity, we default to market price. User can edit ideally.
        const price = pos.market?.currentPrice || 0.5;

        const res = await sellPosition({
            tokenId: sellingToken,
            shares: parseFloat(sellAmount),
            pricePerShare: price, // Limit price
            orderType: "GTC", // Good Til Cancelled
        });

        if (res.success) {
            setSellingToken(null);
            setSellAmount("");
            refresh();
            alert("Sell order placed!");
        } else {
            alert(`Sell failed: ${res.error}`);
        }
    };

    if (!isEnabled) {
        return (
            <div className="min-h-[calc(100vh-60px)] bg-surface-1 flex items-center justify-center font-sans animate-fade-in">
                <div className="bg-white border border-border-default p-8 max-w-md text-center rounded-card shadow-elevated relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-bear to-transparent opacity-50" />
                    <h1 className="text-xl font-bold mb-4 text-text-primary uppercase tracking-widest flex justify-center gap-2">
                        <span className="text-error">🔒</span> Portfolio Locked
                    </h1>
                    <p className="mb-6 text-text-muted text-sm">Connect your wallet and enable trading to view your positions and orders.</p>
                    <Link href="/" className="inline-block bg-primary/10 border border-neon/20 text-primary px-6 py-2.5 font-bold hover:bg-primary/20 hover:border-neon/50 transition-all rounded-button uppercase text-xs tracking-wider">
                        Go to Markets
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-1 text-text-primary font-sans pb-20 pt-8 animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-hero-glow opacity-30" />

            <div className="max-w-container mx-auto p-4 md:p-6 relative z-10">
                <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 border-b border-border-default pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary uppercase tracking-tight flex items-center gap-3">
                            <span className="text-primary animate-pulse-slow">{"///"}</span> My Portfolio
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                                Updated {Math.round((Date.now() - priceLastUpdated.getTime()) / 1000)}s ago
                            </span>
                            <button
                                onClick={handleRefreshPrices}
                                disabled={priceRefreshing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw
                                    size={12}
                                    className={priceRefreshing ? 'animate-spin' : ''}
                                />
                                {priceRefreshing ? 'Refreshing...' : 'Refresh Prices'}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Proxy Wallet Display */}
                        {address && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border border-border-default rounded-button text-xs">
                                <Wallet size={14} className="text-primary" />
                                <span className="text-text-muted">Proxy:</span>
                                {proxyLoading ? (
                                    <Loader2 size={12} className="animate-spin text-slate-400" />
                                ) : proxyWallet ? (
                                    <span className="font-mono text-text-primary" title={proxyWallet}>
                                        {proxyWallet.slice(0, 6)}...{proxyWallet.slice(-4)}
                                    </span>
                                ) : proxyError ? (
                                    <span className="text-error flex items-center gap-1" title={proxyError}>
                                        <AlertTriangle size={12} /> Error
                                    </span>
                                ) : (
                                    <span className="text-amber-500 flex items-center gap-1" title="No proxy wallet detected. Your EOA will be used for trading.">
                                        <AlertTriangle size={12} /> No proxy
                                    </span>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setIsBridgeOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-button bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold uppercase tracking-wider"
                        >
                            <RefreshCw size={14} /> Bridge
                        </button>
                        <Link href="/" className="self-start md:self-auto text-xs font-bold text-text-muted hover:text-primary border border-border-default hover:border-primary/30 bg-white px-4 py-2 transition-all rounded-button flex items-center gap-2 group shadow-sm">
                            <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Markets
                        </Link>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab("positions")}
                        className={`px-5 py-2.5 text-xs font-bold uppercase transition-all tracking-wider rounded-t-sm border-b-2 ${activeTab === "positions"
                            ? "border-primary text-primary bg-primary/5"
                            : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-1"
                            }`}
                    >
                        Positions <span className="ml-1 opacity-60 text-[10px]">{positions.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("orders")}
                        className={`px-5 py-2.5 text-xs font-bold uppercase transition-all tracking-wider rounded-t-sm border-b-2 ${activeTab === "orders"
                            ? "border-primary text-primary bg-primary/5"
                            : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2"
                            }`}
                    >
                        Open Orders <span className="ml-1 opacity-60 text-[10px]">{orders.length}</span>
                    </button>
                    {activeTab === "orders" && orders.length > 0 && (
                        <button
                            onClick={() => setShowCancelAllModal(true)}
                            className="px-4 py-2 text-xs border border-error/30 bg-error/5 text-error hover:bg-error/10 hover:border-error/50 transition-all rounded-button flex items-center gap-2 shadow-sm"
                        >
                            <XCircle size={14} /> Cancel All
                        </button>
                    )}
                    <button
                        onClick={refresh}
                        className="ml-auto px-4 py-2 text-xs border border-border-default bg-white text-text-muted hover:text-primary hover:border-primary/30 transition-all rounded-button flex items-center gap-2 shadow-sm"
                    >
                        <span className={loading ? "animate-spin" : ""}>↻</span> Refresh
                    </button>
                </div>

                {error && (
                    <div className="bg-error-dim border border-error/20 text-error p-4 mb-6 text-sm rounded-card flex items-center gap-3 shadow-glow-red">
                        <span className="text-lg">⚠</span> {error}
                    </div>
                )}

                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((n) => (
                            <div key={`skeleton-${n}`} className="h-16 bg-surface-2 border border-border-default animate-pulse rounded-card" />
                        ))}
                    </div>
                )}

                {!loading && activeTab === "positions" && (
                    <div className="bg-white border border-border-default rounded-card overflow-hidden shadow-elevated relative">
                        {positions.length === 0 ? (
                            <div className="text-center py-24 bg-surface-1/50">
                                <div className="text-4xl mb-4 opacity-10 text-text-muted blur-[1px]">∅</div>
                                <div className="text-text-muted font-bold text-xs tracking-widest uppercase">No Active Positions</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border-default bg-surface-1/80 text-[10px] text-text-muted uppercase tracking-wider">
                                            <th className="p-4 font-medium">Market</th>
                                            <th className="p-4 font-medium">Outcome</th>
                                            <th className="p-4 font-medium text-right">Size (Shares)</th>
                                            <th className="p-4 font-medium text-right">Est. Value</th>
                                            <th className="p-4 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stroke/50">
                                        {positions.map((p: any) => {
                                            const isResolved = p.market?.closed || p.market?.resolved;
                                            // Status colors
                                            let displayValue = p.valueUsd;
                                            let statusLabel = "";
                                            let statusColor = "";

                                            if (isResolved) {
                                                if (p.market?.currentPrice > 0.93) {
                                                    displayValue = p.size;
                                                    statusLabel = "Won";
                                                    statusColor = "text-success";
                                                } else if (p.market?.currentPrice < 0.07) {
                                                    displayValue = 0;
                                                    statusLabel = "Lost";
                                                    statusColor = "text-error";
                                                } else {
                                                    statusLabel = "Resolved";
                                                    statusColor = "text-text-muted";
                                                }
                                            } else {
                                                statusLabel = "Active";
                                                statusColor = "text-primary";
                                            }

                                            return (
                                                <tr key={p.tokenId} className="hover:bg-surface-1/50 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {p.market?.image ? (
                                                                <Image unoptimized src={p.market.image} alt={p.market.question} width={32} height={32} className="w-8 h-8 rounded-lg border border-border-default group-hover:border-primary/30 transition-colors object-cover bg-surface-1" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg border border-border-default bg-surface-1 flex items-center justify-center text-xs text-text-muted">?</div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <Link href={`/event/${p.market?.slug}`} className="hover:text-primary font-medium text-sm text-text-primary max-w-md truncate block transition-colors leading-relaxed">
                                                                    {p.market?.question || `Token: ${p.tokenId.slice(0, 8)}...`}
                                                                </Link>
                                                                <span className={`text-[9px] uppercase font-bold tracking-wider ${statusColor}`}>{statusLabel}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm border ${p.market?.outcome === "Yes" ? "bg-success-dim text-success border-success/20" :
                                                            p.market?.outcome === "No" ? "bg-error-dim text-error border-error/20" : "bg-surface-3 text-text-muted border-border-default"
                                                            }`}>
                                                            {p.market?.outcome || "?"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-mono text-sm text-text-secondary">{p.size.toFixed(2)}</td>
                                                    <td className="p-4 text-right">
                                                        <span className={`font-mono text-sm font-bold ${displayValue > 0 ? "text-text-primary" : "text-text-muted"}`}>
                                                            ${displayValue.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {isResolved && displayValue > 0 ? (
                                                            <button
                                                                onClick={() => handleRedeem(p.market?.conditionId)}
                                                                disabled={redeeming || checkingPayout}
                                                                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 px-3 py-1.5 text-[10px] font-bold transition-all uppercase rounded-button tracking-wider disabled:opacity-50"
                                                            >
                                                                {checkingPayout ? "..." : redeeming ? "..." : "Redeem"}
                                                            </button>
                                                        ) : !isResolved ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSellingToken(p.tokenId);
                                                                    setSellAmount(p.size.toString());
                                                                }}
                                                                className="bg-surface-1 hover:bg-primary/10 text-text-secondary hover:text-primary border border-border-default hover:border-primary/30 px-3 py-1.5 text-[10px] font-bold transition-all uppercase rounded-button tracking-wider"
                                                            >
                                                                Close
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-text-disabled uppercase tracking-wider">Ended</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {!loading && activeTab === "orders" && (
                    <div className="bg-white border border-border-default rounded-card overflow-hidden shadow-elevated relative">
                        {orders.length === 0 ? (
                            <div className="text-center py-24 bg-surface-1/50">
                                <div className="text-4xl mb-4 opacity-10 text-text-muted blur-[1px]">∅</div>
                                <div className="text-text-muted font-bold text-xs tracking-widest uppercase">No Open Orders</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border-default bg-surface-1/80 text-[10px] text-text-muted uppercase tracking-wider">
                                            <th className="p-4 font-medium">Market</th>
                                            <th className="p-4 font-medium">Side</th>
                                            <th className="p-4 font-medium text-right">Price</th>
                                            <th className="p-4 font-medium text-right">Size / Filled</th>
                                            <th className="p-4 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stroke/50">
                                        {orders.map((o: any) => {
                                            const orderId = o.orderID || o.id || "unknown";
                                            return (
                                                <tr key={orderId} className="hover:bg-surface-1/50 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-text-primary block max-w-md truncate group-hover:text-primary transition-colors">
                                                                {o.market?.question || `Order: ${orderId.slice(0, 8)}...`}
                                                            </span>
                                                            <span className="text-[10px] text-text-muted mt-0.5">{o.market?.outcome}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm ${o.side === "BUY" ? "text-success bg-success-dim border border-success/10" : "text-error bg-error-dim border border-error/10"}`}>
                                                            {o.side}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-mono text-sm text-text-primary">{o.price}</td>
                                                    <td className="p-4 text-right font-mono text-sm text-text-secondary">{o.size} <span className="text-text-muted">/ {o.original_size}</span></td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => handleCancelOrder(orderId)}
                                                            className="text-error hover:text-white hover:bg-error/20 border border-transparent hover:border-error/30 px-2 py-1 transition-all rounded-button text-[10px] font-bold uppercase tracking-wider"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SELL MODAL */}
            {sellingToken && (
                <div className="fixed inset-0 bg-surface-1/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white border border-border-default shadow-elevated p-6 max-w-sm w-full rounded-card relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary opacity-80" />
                        <h2 className="text-lg font-bold mb-6 text-text-primary uppercase tracking-wide flex items-center gap-2">
                            <span className="text-primary">⚡</span> Close Position
                        </h2>

                        <div className="mb-6">
                            <label htmlFor="sell-shares" className="block text-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">Shares to Sell</label>
                            <input
                                id="sell-shares"
                                type="number"
                                value={sellAmount}
                                onChange={(e) => setSellAmount(e.target.value)}
                                className="w-full bg-surface-1 border border-border-default focus:border-primary focus:ring-1 focus:ring-primary/20 p-3 font-mono text-lg text-text-primary rounded-input transition-all outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Verification warnings */}
                        {verifyingPosition && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                                <Loader2 size={14} className="animate-spin" />
                                Verifying position on-chain...
                            </div>
                        )}

                        {positionWarning === 'not_found' && (
                            <div className="flex items-start gap-2 text-yellow-500 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 my-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>
                                    Position not found on-chain.
                                    It may have already been sold or redeemed.
                                </span>
                            </div>
                        )}

                        {positionWarning === 'mismatch' && actualOnChainSize && (
                            <div className="flex items-start gap-2 text-yellow-500 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 my-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>
                                    On-chain: {actualOnChainSize} shares
                                    vs portfolio: {sellAmount} shares.
                                    Will sell actual on-chain amount.
                                </span>
                            </div>
                        )}

                        <div className="flex gap-3 font-sans">
                            <button
                                onClick={handleSell}
                                disabled={verifyingPosition || positionWarning === 'not_found' || sellPhase === "signing" || sellPhase === "submitting"}
                                className="flex-1 bg-primary text-white py-3 font-bold uppercase text-xs tracking-wider hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-button shadow-glow shadow-primary/20"
                            >
                                {sellPhase === "signing" ? "Signing..." :
                                    sellPhase === "submitting" ? "Sending..." : "Confirm Sell"}
                            </button>
                            <button
                                onClick={() => setSellingToken(null)}
                                className="flex-1 bg-surface-1 border border-border-default text-text-muted py-3 font-bold uppercase text-xs tracking-wider hover:text-text-primary hover:bg-surface-2 transition-all rounded-button"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CANCEL ALL ORDERS MODAL */}
            {showCancelAllModal && (
                <div className="fixed inset-0 bg-surface-1/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white border border-border-default shadow-elevated p-6 max-w-sm w-full rounded-card relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-bear via-red-400 to-bear opacity-80" />
                        <h2 className="text-lg font-bold mb-4 text-text-primary uppercase tracking-wide flex items-center gap-2">
                            <XCircle size={20} className="text-error" /> Cancel All Orders
                        </h2>

                        <p className="text-text-muted text-sm mb-6">
                            Are you sure you want to cancel all {orders.length} open orders? This action cannot be undone.
                        </p>

                        <div className="flex gap-3 font-sans">
                            <button
                                onClick={handleCancelAllOrders}
                                disabled={cancellingAll}
                                className="flex-1 bg-error text-white py-3 font-bold uppercase text-xs tracking-wider hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-button"
                            >
                                {cancellingAll ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 size={14} className="animate-spin" /> Cancelling...
                                    </span>
                                ) : (
                                    "Cancel All Orders"
                                )}
                            </button>
                            <button
                                onClick={() => setShowCancelAllModal(false)}
                                disabled={cancellingAll}
                                className="flex-1 bg-surface-1 border border-border-default text-text-muted py-3 font-bold uppercase text-xs tracking-wider hover:text-text-primary hover:bg-surface-2 transition-all rounded-button disabled:opacity-50"
                            >
                                Keep Orders
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BridgeModal isOpen={isBridgeOpen} onClose={() => setIsBridgeOpen(false)} />
        </div>
    );
}
