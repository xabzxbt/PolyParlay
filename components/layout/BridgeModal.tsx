"use client";
import React, { useEffect, useState, useCallback } from "react";
import { X, RefreshCw, ArrowRight, Wallet, Info, CheckCircle2 } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useTokenSwap } from "@/hooks/useTokenSwap";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

export default function BridgeModal({ onClose }: { onClose: () => void }) {
    const { address, isConnected } = useAuth();
    const { checkBalances, swapNativeToBridged, isSwapping } = useTokenSwap();
    const { toast } = useToast();
    const [balances, setBalances] = useState({ native: BigInt(0), bridged: BigInt(0) });
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<"swap" | "deposit" | "withdraw">("swap");
    const [isPolling, setIsPolling] = useState(false);

    // Fetch balances
    const refreshBalances = useCallback(async () => {
        if (address) {
            const b = await checkBalances(address as `0x${string}`);
            setBalances(b);
            return b;
        }
    }, [address, checkBalances]);

    useEffect(() => {
        refreshBalances();
    }, [refreshBalances]);

    const nativeBalance = parseFloat(formatUnits(balances.native, 6));
    const bridgedBalance = parseFloat(formatUnits(balances.bridged, 6));

    // FIX 5: Calculate estimated output and fee
    const swapAmount = parseFloat(amount) || 0;
    const estimatedOutput = (swapAmount * 0.9995).toFixed(2); // ~0.05% Uniswap fee
    const uniswapFee = swapAmount * 0.0005;

    const handleMax = () => {
        setAmount(nativeBalance.toString());
        setError("");
        setSuccess(false);
    };

    const handleSwap = async () => {
        if (!address) return;

        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            setError("Enter a valid amount");
            return;
        }
        if (val > nativeBalance) {
            setError("Insufficient balance");
            return;
        }

        setError("");
        setSuccess(false);

        try {
            const amountBigInt = parseUnits(amount, 6);
            await swapNativeToBridged(address as `0x${string}`, amountBigInt);

            // FIX 6: Show success toast notification
            toast("success", `Swap successful! You received ${estimatedOutput} USDC.e`);

            // FIX 7: Close modal after successful swap
            setSuccess(true);
            setAmount("");

            // Refresh balances
            const newBalances = await checkBalances(address as `0x${string}`);
            setBalances(newBalances);

            // Auto-close modal after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (e: any) {
            // FIX 2: Show proper error message from hook
            setError(e.message || "Transaction failed");
        }
    };

    const handlePolymarketBridge = (type: "deposit" | "withdraw") => {
        if (!address) return;
        const url = `https://bridge.polymarket.com/?address=${address}`;
        window.open(url, "_blank");

        if (type === "deposit") {
            setIsPolling(true);
            toast("info", "Waiting for deposit to complete...");

            // Poll balance every 5s for up to 5 mins
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                if (attempts > 60) {
                    clearInterval(poll);
                    setIsPolling(false);
                    return;
                }
                const oldBal = bridgedBalance;
                const newBals = await refreshBalances();
                if (newBals && parseFloat(formatUnits(newBals.bridged, 6)) > oldBal) {
                    clearInterval(poll);
                    setIsPolling(false);
                    toast("success", "Deposit complete! Your USDC.e balance has been updated.");
                }
            }, 5000);
        }
    };

    if (!isConnected) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Connect Wallet">
                <div className="p-6 text-center">
                    <p className="text-sm text-text-muted mb-4">You need to connect your wallet to use the bridge.</p>
                    <button onClick={onClose} className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors w-full">Close</button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={
            <>
                <RefreshCw size={16} className="text-primary" />
                Manage Funds
            </>
        }>
            <div className="p-5 space-y-6">

                {/* Tabs */}
                <div className="flex bg-surface-1 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("swap")}
                        className={cn("flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all", activeTab === "swap" ? "bg-primary text-white shadow" : "text-text-secondary hover:text-text-primary")}
                    >
                        Swap
                    </button>
                    <button
                        onClick={() => setActiveTab("deposit")}
                        className={cn("flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all", activeTab === "deposit" ? "bg-primary text-white shadow" : "text-text-secondary hover:text-text-primary")}
                    >
                        Deposit
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        className={cn("flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all", activeTab === "withdraw" ? "bg-primary text-white shadow" : "text-text-secondary hover:text-text-primary")}
                    >
                        Withdraw
                    </button>
                </div>

                {activeTab === "swap" && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* Info Box */}
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex gap-3">
                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div className="text-[11px] text-text-secondary leading-relaxed">
                                <strong className="text-primary block mb-0.5">Native USDC → Polymarket USDC.e</strong>
                                Swap your Polygon Native USDC to Bridged USDC (USDC.e) instantly to start trading on Polymarket.
                            </div>
                        </div>

                        {/* FIX 5: Fee Disclosure */}
                        {swapAmount > 0 && (
                            <div className="bg-surface-2 border border-border-default rounded-lg p-3 text-[11px] text-text-secondary">
                                <div className="flex justify-between">
                                    <span>Uniswap fee:</span>
                                    <span className="font-mono">~${uniswapFee.toFixed(4)} ({((uniswapFee / swapAmount) * 100).toFixed(2)}%)</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span>Estimated output:</span>
                                    <span className="font-mono font-bold text-success">{estimatedOutput} USDC.e</span>
                                </div>
                            </div>
                        )}

                        {/* Input Section */}
                        <div className="space-y-4">
                            {/* From (Native) */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] uppercase font-bold text-text-muted">
                                    <span>From</span>
                                    <span>Bal: {nativeBalance.toLocaleString()} USDC</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setError("");
                                        }}
                                        placeholder="0.00"
                                        className="w-full bg-surface-2 border border-border-default rounded-lg py-3 pl-3 pr-16 font-mono font-bold text-lg text-text-primary focus:outline-none focus:border-primary transition-all"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <button
                                            onClick={handleMax}
                                            className="text-[10px] font-bold text-primary hover:text-primary-hover uppercase px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                                        >
                                            MAX
                                        </button>
                                        <span className="text-xs font-bold text-text-secondary">USDC</span>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-surface-1 border border-border-default p-1.5 rounded-pill shadow-sm">
                                    <ArrowRight size={16} className="text-text-muted" />
                                </div>
                            </div>

                            {/* To (Bridged) */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] uppercase font-bold text-text-muted">
                                    <span>To</span>
                                    <span>Bal: {bridgedBalance.toLocaleString()} USDC.e</span>
                                </div>
                                <div className="w-full bg-surface-1 border border-border-default rounded-lg py-3 px-3 font-mono font-bold text-lg text-text-muted flex items-center justify-between opacity-75">
                                    <span>{amount || "0.00"}</span>
                                    <span className="text-xs font-sans text-text-secondary">USDC.e</span>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-error font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSwap}
                            disabled={isSwapping || !amount || parseFloat(amount) <= 0}
                            className={cn(
                                "w-full py-3 rounded-lg font-bold uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2",
                                isSwapping || !amount || parseFloat(amount) <= 0
                                    ? "bg-surface-3 text-text-disabled cursor-not-allowed"
                                    : "bg-primary text-white hover:bg-primary-hover hover:shadow-primary/20 active:translate-y-0.5"
                            )}
                        >
                            {isSwapping ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    Swapping...
                                </>
                            ) : "Swap Assets"}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
