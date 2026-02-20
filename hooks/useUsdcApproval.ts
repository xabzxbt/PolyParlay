"use client";
import { useCallback } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { erc20Abi, maxUint256, type PublicClient } from "viem";
import { CONTRACTS, CHAIN_ID } from "@/lib/polymarket/order-builder";

// Polymarket uses USDC.e (bridged) on Polygon as collateral
const USDC_ADDRESS = CONTRACTS.collateral;
const POLYGON_CHAIN_ID = CHAIN_ID;

// The three contracts that need USDC spending approval:
// 1. CTF Exchange — for standard market orders
// 2. Neg Risk CTF Exchange — for negative risk market orders  
// 3. Neg Risk Adapter — for token minting/splitting in neg risk markets
const SPENDER_CONTRACTS = [
    { address: CONTRACTS.exchange, name: "CTF Exchange" },
    { address: CONTRACTS.negRiskExchange, name: "Neg Risk Exchange" },
    { address: CONTRACTS.negRiskAdapter, name: "Neg Risk Adapter" },
] as const;

interface ApprovalStatus {
    exchange: boolean;
    negRiskExchange: boolean;
    negRiskAdapter: boolean;
    allApproved: boolean;
}

/**
 * Hook to check and set USDC.e allowance for Polymarket exchange contracts.
 * 
 * Polymarket requires that the user's wallet has approved the CTF Exchange contracts
 * to spend USDC on their behalf. Without this approval, all orders will be rejected
 * with "not enough balance / allowance".
 * 
 * Approvals are one-time per wallet (we set max uint256 as allowance).
 */
export function useUsdcApproval() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient({ chainId: POLYGON_CHAIN_ID });

    /**
     * Check current USDC allowance for all exchange contracts.
     * Returns which contracts are already approved.
     */
    const checkAllowances = useCallback(async (
        ownerAddress: `0x${string}`,
        requiredUsdcAmount: number = 0,
    ): Promise<ApprovalStatus> => {
        let client = publicClient;

        if (!client) {
            try {
                const { createPublicClient, http } = await import("viem");
                const { polygon } = await import("viem/chains");
                client = createPublicClient({
                    chain: polygon,
                    transport: http("https://polygon-rpc.com"),
                }) satisfies PublicClient;
            } catch {
                return { exchange: false, negRiskExchange: false, negRiskAdapter: false, allApproved: false };
            }
        }

        const usdcDecimals = BigInt(10 ** 6);
        const requiredAllowance = BigInt(Math.ceil((requiredUsdcAmount + 1) * 1e6)); // 1 USDC buffer
        const MIN_ALLOWANCE = requiredUsdcAmount > 0 ? requiredAllowance : BigInt(10_000_000); // 10 USDC default

        try {
            const results = await Promise.all(
                SPENDER_CONTRACTS.map(async (spender) => {
                    try {
                        const allowance = await (client as PublicClient).readContract({
                            address: USDC_ADDRESS,
                            abi: erc20Abi,
                            functionName: "allowance",
                            args: [ownerAddress, spender.address],
                        });
                        const isApproved = (allowance as bigint) >= MIN_ALLOWANCE;
                        return isApproved;
                    } catch (err) {
                        return false;
                    }
                })
            );

            const status: ApprovalStatus = {
                exchange: results[0],
                negRiskExchange: results[1],
                negRiskAdapter: results[2],
                allApproved: results.every(Boolean),
            };

            return status;
        } catch (err) {
            return { exchange: false, negRiskExchange: false, negRiskAdapter: false, allApproved: false };
        }
    }, [publicClient]);

    /**
     * Approve all unapproved exchange contracts to spend USDC.
     * Sends one approve() transaction per un-approved contract.
     * Returns true if all approvals succeeded.
     */
    const approveAll = useCallback(async (
        ownerAddress: `0x${string}`,
        requiredUsdcAmount: number = 0,
        onProgress?: (step: string) => void,
    ): Promise<boolean> => {
        if (!walletClient) {
            return false;
        }

        // First check which contracts need approval
        const status = await checkAllowances(ownerAddress, requiredUsdcAmount);

        if (status.allApproved) {
            return true;
        }

        const needsApproval = [
            { ...SPENDER_CONTRACTS[0], approved: status.exchange },
            { ...SPENDER_CONTRACTS[1], approved: status.negRiskExchange },
            { ...SPENDER_CONTRACTS[2], approved: status.negRiskAdapter },
        ].filter((c) => !c.approved);


        let client = publicClient;
        if (!client) {
            try {
                const { createPublicClient, http } = await import("viem");
                const { polygon } = await import("viem/chains");
                client = createPublicClient({
                    chain: polygon,
                    transport: http("https://polygon-rpc.com"),
                }) satisfies PublicClient;
            } catch {
                return false;
            }
        }

        for (const contract of needsApproval) {
            try {
                onProgress?.(`Approving ${contract.name}...`);

                const { polygon } = await import("viem/chains");

                const hash = await walletClient.writeContract({
                    address: USDC_ADDRESS,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [contract.address, maxUint256],
                    chain: polygon,
                });

                onProgress?.(`Waiting for ${contract.name} confirmation...`);

                // Wait for transaction confirmation
                if (client) {
                    await (client as PublicClient).waitForTransactionReceipt({ hash, timeout: 60_000 });
                } else {
                    // Fallback: just wait a bit
                    await new Promise((r) => setTimeout(r, 5000));
                }
            } catch (err: any) {
                if (err?.code === 4001) {
                    return false;
                }
                return false;
            }
        }

        return true;
    }, [walletClient, publicClient, checkAllowances]);

    return {
        checkAllowances,
        approveAll,
    };
}
