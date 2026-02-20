"use client";
import { useCallback, useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { ConditionalTokensABI } from "@/lib/abis/ConditionalTokens";
import { CONTRACTS } from "@/lib/polymarket/order-builder";
import { useAuth } from "@/providers/AuthProvider";

interface RedeemResult {
    success: boolean;
    hash?: string;
    error?: string;
}

export function useRedeem() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { address } = useAuth();
    const [loading, setLoading] = useState(false);
    const [checkingPayout, setCheckingPayout] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Get payout numerators for each outcome to determine winning outcome(s).
     * Returns array where index 0 = YES outcome, index 1 = NO outcome.
     */
    const getPayoutNumerators = useCallback(async (
        conditionId: string
    ): Promise<[bigint, bigint] | null> => {
        if (!publicClient) {
            return null;
        }

        try {
            const collateralToken = CONTRACTS.collateral;
            const parentCollectionId = "0x0000000000000000000000000000000000000000000000000000000000000000";

            // Get payout for outcome 0 (YES) - indexSet [1] in binary
            const payout0 = await publicClient.readContract({
                address: CONTRACTS.conditionalTokens,
                abi: ConditionalTokensABI,
                functionName: "getPayoutNumerator",
                args: [
                    collateralToken,
                    parentCollectionId as `0x${string}`,
                    conditionId as `0x${string}`,
                    [0n] // payoutIndices for outcome 0
                ],
            }) as bigint;

            // Get payout for outcome 1 (NO) - indexSet [2] in binary
            const payout1 = await publicClient.readContract({
                address: CONTRACTS.conditionalTokens,
                abi: ConditionalTokensABI,
                functionName: "getPayoutNumerator",
                args: [
                    collateralToken,
                    parentCollectionId as `0x${string}`,
                    conditionId as `0x${string}`,
                    [1n] // payoutIndices for outcome 1
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
     * Note: This currently supports EOA redemption. Proxy redemption requires Gnosis Safe execution.
     */
    const redeem = useCallback(async (
        conditionId: string,
        indexSets?: number[] // Optional: if provided, use these directly (backward compatible)
    ): Promise<RedeemResult> => {
        if (!walletClient || !address) {
            return { success: false, error: "Wallet not connected" };
        }

        setLoading(true);
        setCheckingPayout(true);
        setError(null);

        try {
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
    }, [walletClient, address, publicClient, determineWinningIndexSets]);

    return {
        redeem,
        loading,
        checkingPayout,
        error
    };
}
