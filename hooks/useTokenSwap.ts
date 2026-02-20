"use client";
import { useCallback, useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { erc20Abi, maxUint256 } from "viem";

// Polygon PoS Addresses
const NATIVE_USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const BRIDGED_USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"; // USDC.e
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // SwapRouter (V3)

// Router Interface for ExactInputSingle
const routerAbi = [
    {
        inputs: [
            {
                components: [
                    { name: "tokenIn", type: "address" },
                    { name: "tokenOut", type: "address" },
                    { name: "fee", type: "uint24" },
                    { name: "recipient", type: "address" },
                    { name: "deadline", type: "uint256" },
                    { name: "amountIn", type: "uint256" },
                    { name: "amountOutMinimum", type: "uint256" },
                    { name: "sqrtPriceLimitX96", type: "uint160" },
                ],
                name: "params",
                type: "tuple",
            },
        ],
        name: "exactInputSingle",
        outputs: [{ name: "amountOut", type: "uint256" }],
        stateMutability: "payable",
        type: "function",
    },
] as const;

export function useTokenSwap() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const [isSwapping, setIsSwapping] = useState(false);

    const checkBalances = useCallback(async (walletAddress: `0x${string}`) => {
        if (!publicClient) return { native: BigInt(0), bridged: BigInt(0) };
        try {
            const [native, bridged] = await Promise.all([
                publicClient.readContract({
                    address: NATIVE_USDC,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [walletAddress],
                }),
                publicClient.readContract({
                    address: BRIDGED_USDC,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [walletAddress],
                }),
            ]);
            return { native, bridged };
        } catch (error) {
            return { native: BigInt(0), bridged: BigInt(0) };
        }
    }, [publicClient]);

    const swapNativeToBridged = useCallback(async (walletAddress: `0x${string}`, amount: bigint) => {
        if (!walletClient || !publicClient) return false;
        setIsSwapping(true);

        try {
            const allowance = await publicClient.readContract({
                address: NATIVE_USDC,
                abi: erc20Abi,
                functionName: "allowance",
                args: [walletAddress, UNISWAP_ROUTER],
            });

            if (allowance < amount) {
                const hash = await walletClient.writeContract({
                    address: NATIVE_USDC,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [UNISWAP_ROUTER, amount], // FIX 8: Approve only the exact amount needed
                });
                try {
                    await publicClient.waitForTransactionReceipt({ hash, timeout: 300_000 }); // FIX 3: 5 min timeout
                } catch (timeoutError) {
                    throw new Error("Transaction is taking too long. Check your wallet for status.");
                }
            }

            // Calculate slippage-protected minimum output (0.5% slippage tolerance)
            const slippageTolerance = 0.005; // 0.5%
            const expectedOut = amount; // 1:1 for USDC->USDC.e swap
            const amountOutMinimum = (expectedOut * 995n) / 1000n;

            const params = {
                tokenIn: NATIVE_USDC as `0x${string}`,
                tokenOut: BRIDGED_USDC as `0x${string}`,
                fee: 500, // 0.05% fee tier (better liquidity guarantee)
                recipient: walletAddress,
                deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // 20 mins
                amountIn: amount,
                amountOutMinimum, // Slippage protected
                sqrtPriceLimitX96: BigInt(0),
            };

            const hash = await walletClient.writeContract({
                address: UNISWAP_ROUTER,
                abi: routerAbi,
                functionName: "exactInputSingle",
                args: [params],
            });

            try {
                await publicClient.waitForTransactionReceipt({ hash, timeout: 300_000 }); // FIX 3: 5 min timeout
            } catch (timeoutError) {
                throw new Error("Transaction is taking too long. Check your wallet for status.");
            }
            return true;

        } catch (error: any) {
            // FIX 2: Handle transaction rejection separately
            if (error?.code === 4001 || 
                error?.message?.includes('rejected') ||
                error?.message?.includes('denied') ||
                error?.shortMessage?.includes('rejected') ||
                error?.shortMessage?.includes('denied')) {
                throw new Error("Transaction rejected by user");
            }
            // Handle timeout errors
            if (error?.message?.includes('taking too long')) {
                throw error;
            }
            throw new Error("Swap failed. Please try again.");
        } finally {
            setIsSwapping(false);
        }
    }, [walletClient, publicClient]);

    return { isSwapping, checkBalances, swapNativeToBridged };
}
