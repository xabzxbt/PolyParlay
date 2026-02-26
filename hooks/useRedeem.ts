"use client";
import { useCallback, useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { ConditionalTokensABI } from "@/lib/abis/ConditionalTokens";
import { CONTRACTS } from "@/lib/polymarket/order-builder";
import { useAuth } from "@/providers/AuthProvider";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";

interface RedeemResult {
    success: boolean;
    hash?: string;
    error?: string;
}

export function useRedeem() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { address } = useAuth();
    const { proxyWallet } = usePolymarketAuth();
    const [loading, setLoading] = useState(false);
    const [checkingPayout, setCheckingPayout] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Check if a market has been resolved by reading payoutDenominator.
     * A non-zero denominator means the market is resolved.
     */
    const isMarketResolved = useCallback(async (
        conditionId: string
    ): Promise<boolean> => {
        if (!publicClient) return false;

        try {
            const denominator = await publicClient.readContract({
                address: CONTRACTS.conditionalTokens,
                abi: ConditionalTokensABI,
                functionName: "payoutDenominator",
                args: [conditionId as `0x${string}`],
            }) as bigint;

            return denominator > 0n;
        } catch {
            return false;
        }
    }, [publicClient]);

    /**
     * Get payout numerators for each outcome to determine winning outcome(s).
     * Uses the correct CTF function: payoutNumerators(bytes32 conditionId, uint256 index)
     * Returns array where index 0 = YES outcome, index 1 = NO outcome.
     */
    const getPayoutNumerators = useCallback(async (
        conditionId: string
    ): Promise<[bigint, bigint] | null> => {
        if (!publicClient) {
            return null;
        }

        try {
            // Read payout for outcome 0 (YES)
            const payout0 = await publicClient.readContract({
                address: CONTRACTS.conditionalTokens,
                abi: ConditionalTokensABI,
                functionName: "payoutNumerators",
                args: [
                    conditionId as `0x${string}`,
                    0n
                ],
            }) as bigint;

            // Read payout for outcome 1 (NO)
            const payout1 = await publicClient.readContract({
                address: CONTRACTS.conditionalTokens,
                abi: ConditionalTokensABI,
                functionName: "payoutNumerators",
                args: [
                    conditionId as `0x${string}`,
                    1n
                ],
            }) as bigint;

            return [payout0, payout1];
        } catch (err) {
            return null;
        }
    }, [publicClient]);

    /**
     * Determine winning indexSets based on payout numerators.
     * For binary markets:
     * - indexSet 1 (binary: 01) = outcome 0 won
     * - indexSet 2 (binary: 10) = outcome 1 won
     */
    const determineWinningIndexSets = useCallback(async (
        conditionId: string
    ): Promise<number[]> => {
        const payouts = await getPayoutNumerators(conditionId);

        if (!payouts) {
            // Fall back to both outcomes if payout check fails
            return [1, 2];
        }

        const [payout0, payout1] = payouts;
        const winningIndexSets: number[] = [];

        // Binary markets: payoutNumerator > 0 means that outcome won
        if (payout0 > 0n) {
            winningIndexSets.push(1); // outcome 0 (YES) won
        }
        if (payout1 > 0n) {
            winningIndexSets.push(2); // outcome 1 (NO) won
        }

        // If no outcomes won (market not resolved), default to both
        if (winningIndexSets.length === 0) {
            return [1, 2];
        }

        return winningIndexSets;
    }, [getPayoutNumerators]);

    /**
     * Redeem winning positions from the Conditional Tokens contract.
     * Automatically determines winning outcome(s) before redemption.
     * 
     * IMPORTANT: If the user has a proxy wallet (Safe), positions live in the proxy,
     * not in the EOA. Direct writeContract from EOA will NOT redeem proxy positions.
     * Proxy users should redeem via polymarket.com or the Relayer Client.
     */
    const redeem = useCallback(async (
        conditionId: string,
        indexSets?: number[] // Optional: if provided, use these directly (backward compatible)
    ): Promise<RedeemResult> => {
        if (!walletClient || !address) {
            return { success: false, error: "Wallet not connected" };
        }

        // Check if user is using a proxy wallet
        const isProxyUser = proxyWallet && proxyWallet.toLowerCase() !== address.toLowerCase();

        if (isProxyUser) {
            return {
                success: false,
                error: "Your positions are in your Polymarket proxy wallet. Please redeem at polymarket.com/portfolio or wait for automatic redemption."
            };
        }

        setLoading(true);
        setCheckingPayout(true);
        setError(null);

        try {
            // Check if market is actually resolved
            const resolved = await isMarketResolved(conditionId);
            if (!resolved) {
                setLoading(false);
                setCheckingPayout(false);
                return { success: false, error: "Market has not been resolved yet" };
            }

            // Determine which outcomes to redeem
            let winningIndexSets: number[];

            if (indexSets !== undefined) {
                // Use provided indexSets for backward compatibility
                winningIndexSets = indexSets;
            } else {
                // Automatically determine winning outcome(s)
                winningIndexSets = await determineWinningIndexSets(conditionId);
            }

            setCheckingPayout(false);

            // Standard Polymarket redemption parameters
            const collateralToken = CONTRACTS.collateral;
            const parentCollectionId = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Always 0 for base markets

            const hash = await walletClient.writeContract({
                address: CONTRACTS.conditionalTokens,
                abi: ConditionalTokensABI,
                functionName: "redeemPositions",
                args: [
                    collateralToken,
                    parentCollectionId as `0x${string}`,
                    conditionId as `0x${string}`,
                    winningIndexSets.map(BigInt)
                ],
                chain: walletClient.chain,
            });

            // Wait for receipt
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
            }

            setLoading(false);
            return { success: true, hash };

        } catch (err: any) {
            const msg = err?.message || "Redemption failed";
            setError(msg);
            setLoading(false);
            setCheckingPayout(false);
            return { success: false, error: msg };
        }
    }, [walletClient, address, publicClient, proxyWallet, determineWinningIndexSets, isMarketResolved]);

    return {
        redeem,
        loading,
        checkingPayout,
        error
    };
}
