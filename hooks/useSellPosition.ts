"use client";
import { useState, useCallback } from "react";
import { useWalletClient } from "wagmi";
import { useAuth } from "@/providers/AuthProvider";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import {
    buildOrder, getOrderTypedData, getNegRisk, getTickSize, Side,
    type OrderData, type SignedOrder,
} from "@/lib/polymarket/order-builder";

type SellPhase = "idle" | "checking" | "signing" | "submitting" | "done" | "error";

interface SellResult {
    success: boolean;
    orderID?: string;
    error?: string;
}

/**
 * Hook for selling (closing) a position on Polymarket.
 * 
 * How selling works:
 * 1. User holds YES or NO tokens (conditional tokens on Polygon)
 * 2. To close the position, user creates a SELL order on the CLOB
 * 3. The CLOB matches the SELL order with a buyer
 * 4. User receives USDC in their Polymarket wallet
 * 
 * The signed order is sent to our /api/sell-position endpoint,
 * which forwards it to the CLOB with proper authentication headers.
 */
export function useSellPosition() {
    const { data: walletClient } = useWalletClient();
    const { address, isConnected } = useAuth();
    const { credentials: userCredentials } = usePolymarketAuth();

    const [phase, setPhase] = useState<SellPhase>("idle");
    const [error, setError] = useState<string | null>(null);

    /**
     * Sell shares of a position
     * @param tokenId - The conditional token ID (YES or NO token)
     * @param shares - Number of shares to sell
     * @param pricePerShare - Price per share (0-1)
     * @param proxyWallet - Optional proxy wallet address (if user has one)
     * @param orderType - "GTC" (limit) or "FOK" (market sell)
     */
    const sellPosition = useCallback(async (params: {
        tokenId: string;
        shares: number;
        pricePerShare: number;
        proxyWallet?: string | null;
        orderType?: "GTC" | "FOK";
    }): Promise<SellResult> => {
        const { tokenId, shares, pricePerShare, proxyWallet, orderType = "GTC" } = params;

        if (!isConnected || !address) {
            return { success: false, error: "Wallet not connected" };
        }
        if (!walletClient) {
            return { success: false, error: "Wallet signer not ready" };
        }
        if (!userCredentials) {
            return { success: false, error: "Trading not enabled. Click 'Enable Trading' first." };
        }
        if (shares <= 0) {
            return { success: false, error: "Shares must be greater than 0" };
        }

        setPhase("checking");
        setError(null);

        try {
            const finalMaker = proxyWallet || address;
            const isProxy = !!proxyWallet;

            // 1. Determine negRisk and tickSize for this market
            const negRisk = await getNegRisk(tokenId);
            const tickSize = await getTickSize(tokenId);

            // 2. Build SELL order
            setPhase("signing");
            const order: OrderData = buildOrder({
                maker: finalMaker as `0x${string}`,
                signer: address as `0x${string}`,
                tokenId,
                side: Side.SELL,
                pricePerShare,
                sizeUSD: shares, // For SELL, this is number of shares
                negRisk,
                tickSize,
                isProxy,
            });

            // 3. Sign with wallet
            const typedData = getOrderTypedData(order, negRisk);
            const signature = await walletClient.signTypedData({
                domain: typedData.domain,
                types: typedData.types,
                primaryType: typedData.primaryType,
                message: typedData.message,
            });

            const signedOrder: SignedOrder = { ...order, signature: signature as `0x${string}` };

            // 4. Submit to our API
            setPhase("submitting");
            const res = await fetch("/api/sell-position", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signedOrder,
                    userCredentials: {
                        ...userCredentials,
                        address: finalMaker,
                    },
                    orderType,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setPhase("done");
                return { success: true, orderID: data.orderID };
            } else {
                setPhase("error");
                setError(data.error || "Sell order failed");
                return { success: false, error: data.error };
            }
        } catch (err: any) {
            let msg = "Failed to sell position";
            if (err?.code === 4001) {
                msg = "You rejected the signature";
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setPhase("error");
            setError(msg);
            return { success: false, error: msg };
        }
    }, [walletClient, address, isConnected, userCredentials]);

    /**
     * Check on-chain balance for a given token
     */
    const checkBalance = useCallback(async (tokenId: string): Promise<number> => {
        if (!address) return 0;
        try {
            const res = await fetch(`/api/sell-position?address=${address}&token_id=${tokenId}`);
            const data = await res.json();
            return data.success ? data.balance : 0;
        } catch {
            return 0;
        }
    }, [address]);

    const reset = useCallback(() => {
        setPhase("idle");
        setError(null);
    }, []);

    return {
        sellPosition,
        checkBalance,
        phase,
        error,
        reset,
    };
}
