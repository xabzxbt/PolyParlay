"use client";

import { useState, useCallback, useEffect } from "react";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";

interface PortfolioPosition {
    tokenId: string;
    size: number;
    valueUsd: number;
    market?: {
        question: string;
        image: string;
        slug: string;
        outcome: string;
        currentPrice: number; // 0-1
        conditionId: string;
    };
}

interface OpenOrder {
    orderID: string;
    id?: string;
    asset_id: string;
    price: string;
    size: string; // Remaining size
    original_size: string;
    side: string; // "BUY" or "SELL"
    status: string; // "OPEN"
    timestamp: number;
    expiration: number;
    market?: {
        question: string;
        image: string;
        slug: string;
        outcome: string;
    };
}

export function usePortfolio() {
    const { credentials } = usePolymarketAuth();
    const isEnabled = !!credentials;

    const [positions, setPositions] = useState<PortfolioPosition[]>([]);
    const [orders, setOrders] = useState<OpenOrder[]>([]);
    const [totalPositions, setTotalPositions] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPortfolio = useCallback(async () => {
        if (!isEnabled || !credentials) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/portfolio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userCredentials: credentials }),
            });

            const data = await res.json();

            if (data.success) {
                setPositions(data.positions || []);
                // Safely handle orders array (API might return filtered list)
                setOrders(Array.isArray(data.orders) ? data.orders : []);
                setTotalPositions(data.totalPositions || (data.positions || []).length);
            } else {
                setError(data.error || "Failed updates");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load portfolio");
        } finally {
            setLoading(false);
        }
    }, [isEnabled, credentials]);

    // Initial fetch when credentials become available
    useEffect(() => {
        if (isEnabled && credentials) {
            fetchPortfolio();
        }
    }, [isEnabled, credentials]); // Removing fetchPortfolio from deps to avoid loop if not memoized properly

    return {
        positions,
        orders,
        totalPositions,
        loading,
        error,
        refresh: fetchPortfolio,
        isEnabled,
    };
}
