"use client";
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import {
    fetchDepositAddresses,
    fetchDepositStatus,
    fetchSupportedAssets,
    type DepositAddresses,
    type DepositStatusItem,
} from "@/lib/polymarket/bridge";

export type DepositPhase =
    | "idle"
    | "generating"
    | "ready"
    | "monitoring"
    | "completed"
    | "error";

export function useDeposit() {
    const { address } = useAuth();
    const { proxyWallet, loadProxyWallet } = usePolymarketAuth();

    const [depositAddresses, setDepositAddresses] = useState<DepositAddresses | null>(null);
    const [activeDeposits, setActiveDeposits] = useState<DepositStatusItem[]>([]);
    const [phase, setPhase] = useState<DepositPhase>("idle");
    const [error, setError] = useState<string | null>(null);
    const [supportedAssets, setSupportedAssets] = useState<any>(null);

    const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * Load supported assets (chains & tokens) from Bridge API
     */
    const loadSupportedAssets = useCallback(async () => {
        try {
            const assets = await fetchSupportedAssets();
            setSupportedAssets(assets);
            return assets;
        } catch {
            return null;
        }
    }, []);

    /**
     * Generate deposit addresses via Bridge API.
     * Uses proxy wallet if available, otherwise EOA.
     */
    const generateDepositAddresses = useCallback(async () => {
        setPhase("generating");
        setError(null);

        try {
            // Ensure we have the proxy wallet
            let wallet = proxyWallet;
            if (!wallet && address) {
                wallet = await loadProxyWallet(address);
            }

            const targetAddress = wallet || address;
            if (!targetAddress) {
                throw new Error("No wallet address available");
            }

            const addresses = await fetchDepositAddresses(targetAddress);
            setDepositAddresses(addresses);
            setPhase("ready");
            return addresses;
        } catch (e: any) {
            setError(e.message || "Failed to generate deposit addresses");
            setPhase("error");
            return null;
        }
    }, [address, proxyWallet, loadProxyWallet]);

    /**
     * Start monitoring deposit status.
     * Polls the Bridge API every 8 seconds to detect incoming deposits.
     */
    const startMonitoring = useCallback(
        (depositAddress: string, onComplete?: () => void) => {
            // Clear any existing monitor
            if (monitorRef.current) {
                clearInterval(monitorRef.current);
            }

            setPhase("monitoring");
            let attempts = 0;
            const MAX_ATTEMPTS = 150; // ~20 minutes

            monitorRef.current = setInterval(async () => {
                attempts++;

                if (attempts > MAX_ATTEMPTS) {
                    if (monitorRef.current) clearInterval(monitorRef.current);
                    monitorRef.current = null;
                    setPhase("ready");
                    return;
                }

                try {
                    const statuses = await fetchDepositStatus(depositAddress);
                    setActiveDeposits(statuses);

                    const completed = statuses.find((s) => s.status === "COMPLETED");
                    if (completed) {
                        if (monitorRef.current) clearInterval(monitorRef.current);
                        monitorRef.current = null;
                        setPhase("completed");
                        onComplete?.();
                    }
                } catch {
                    // Silently continue polling
                }
            }, 8000);
        },
        []
    );

    /**
     * Stop monitoring
     */
    const stopMonitoring = useCallback(() => {
        if (monitorRef.current) {
            clearInterval(monitorRef.current);
            monitorRef.current = null;
        }
        setPhase("ready");
    }, []);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        stopMonitoring();
        setDepositAddresses(null);
        setActiveDeposits([]);
        setPhase("idle");
        setError(null);
    }, [stopMonitoring]);

    return {
        // State
        depositAddresses,
        activeDeposits,
        phase,
        error,
        supportedAssets,

        // Actions
        generateDepositAddresses,
        startMonitoring,
        stopMonitoring,
        loadSupportedAssets,
        reset,
    };
}
