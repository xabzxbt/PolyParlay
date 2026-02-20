"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/providers/AuthProvider";
import { useWalletClient, usePublicClient } from "wagmi";
import { getDepositUrl, withdrawUSDCFlow } from "@/lib/polymarket/bridge";
import { formatUnits, erc20Abi } from "viem";
import { ExternalLink, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Loader2, Check } from "lucide-react";

interface BridgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: "deposit" | "withdraw" | "swap";
}

const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

export default function BridgeModal({ isOpen, onClose, defaultTab = "deposit" }: BridgeModalProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const { address } = useAuth();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient({ chainId: 137 });

    const [balance, setBalance] = useState<number>(0);
    const [initialBalance, setInitialBalance] = useState<number | null>(null);
    const [depositDetected, setDepositDetected] = useState(false);

    // Withdraw state
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawToAddress, setWithdrawToAddress] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawTx, setWithdrawTx] = useState("");
    const [withdrawError, setWithdrawError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            setDepositDetected(false);
            setWithdrawAmount("");
            setWithdrawTx("");
            setWithdrawError("");
            setWithdrawToAddress("");
            fetchBalance(true);
        }
    }, [isOpen, defaultTab]);

    const fetchBalance = async (setInitial: boolean = false) => {
        if (!address || !publicClient) return;
        try {
            const balStr = await publicClient.readContract({
                address: USDC_BRIDGED,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address as `0x${string}`],
            });
            const bal = parseFloat(formatUnits(balStr as bigint, 6));
            setBalance(bal);

            if (setInitial) {
                setInitialBalance(bal);
            } else if (initialBalance !== null && bal > initialBalance) {
                setDepositDetected(true);
                setInitialBalance(bal);
            }
        } catch (e) {
        }
    };

    // Poll balance every 10s for deposit tab
    useEffect(() => {
        if (!isOpen || activeTab !== "deposit") return;
        const interval = setInterval(() => {
            fetchBalance(false);
        }, 10000);
        return () => clearInterval(interval);
    }, [isOpen, activeTab, initialBalance, address, publicClient]);

    const handleWithdraw = async () => {
        if (!walletClient || !withdrawToAddress) {
            setWithdrawError("Please connect wallet and enter recipient");
            return;
        }
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt <= 0 || amt > balance) {
            setWithdrawError("Invalid amount");
            return;
        }

        setIsWithdrawing(true);
        setWithdrawError("");
        try {
            const tx = await withdrawUSDCFlow(walletClient, withdrawToAddress as `0x${string}`, amt);
            setWithdrawTx(tx);
            fetchBalance(true); // reset balances
        } catch (e: any) {
            setWithdrawError(e.message || "Withdraw failed");
        } finally {
            setIsWithdrawing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bridge & Funds">
            <div className="flex border-b border-border-default mb-4 mt-[-10px]">
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "deposit" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
                    onClick={() => setActiveTab("deposit")}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ArrowDownToLine size={16} /> Deposit
                    </div>
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "withdraw" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
                    onClick={() => setActiveTab("withdraw")}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ArrowUpFromLine size={16} /> Withdraw
                    </div>
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "swap" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-primary"}`}
                    onClick={() => setActiveTab("swap")}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ArrowRightLeft size={16} /> Swap
                    </div>
                </button>
            </div>

            <div className="p-2 pb-6">
                {/* DEPOSIT TAB */}
                {activeTab === "deposit" && (
                    <div className="space-y-6">
                        <div className="bg-surface-2 rounded-card p-4 text-center">
                            <p className="text-text-muted text-sm mb-1">Your Polygon USDC.e Balance</p>
                            <div className="text-3xl font-bold text-white">${balance.toFixed(2)}</div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-text-secondary text-center">
                                Deposit native USDC from any chain, automatically converted to USDC.e on Polygon.
                            </p>

                            <a
                                href={address ? getDepositUrl(address) : "https://bridge.polymarket.com"}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-3 px-4 rounded-card transition-colors border border-primary/30"
                            >
                                Deposit via Polymarket Bridge <ExternalLink size={16} />
                            </a>
                        </div>

                        {depositDetected && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                                <Check size={16} /> Deposit successfully detected! Balance updated.
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                            <Loader2 size={12} className="animate-spin" /> Polling for balance updates...
                        </div>
                    </div>
                )}

                {/* WITHDRAW TAB */}
                {activeTab === "withdraw" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-text-secondary">Available Balance</span>
                            <span className="font-mono text-white">${balance.toFixed(2)}</span>
                        </div>

                        <div>
                            <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Recipient Address (Polygon)</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={withdrawToAddress}
                                onChange={e => setWithdrawToAddress(e.target.value)}
                                className="w-full bg-surface-2 border border-border-default rounded-card px-4 py-3 text-white focus:outline-none focus:border-primary placeholder:text-text-muted/50"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Amount to Withdraw</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    className="w-full bg-surface-2 border border-border-default rounded-card px-4 py-3 text-white focus:outline-none focus:border-primary placeholder:text-text-muted/50"
                                />
                                <button
                                    onClick={() => setWithdrawAmount(balance.toString())}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                                >
                                    MAX
                                </button>
                            </div>
                        </div>

                        {withdrawError && <div className="text-red-400 text-sm">{withdrawError}</div>}

                        {withdrawTx ? (
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-card space-y-2">
                                <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
                                    <Check size={18} /> Withdrawal Sent!
                                </div>
                                <a
                                    href={`https://polygonscan.com/tx/${withdrawTx}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm flex items-center gap-1 text-primary hover:underline break-all"
                                >
                                    View on Polygonscan <ExternalLink size={14} />
                                </a>
                            </div>
                        ) : (
                            <button
                                onClick={handleWithdraw}
                                disabled={isWithdrawing || !withdrawAmount || !withdrawToAddress}
                                className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 px-4 rounded-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isWithdrawing ? "Processing..." : "Withdraw USDC"}
                            </button>
                        )}
                    </div>
                )}

                {/* SWAP TAB */}
                {activeTab === "swap" && (
                    <div className="space-y-6 text-center py-4">
                        <div className="w-16 h-16 bg-surface-2 rounded-pill flex items-center justify-center mx-auto mb-4">
                            <ArrowRightLeft className="text-primary w-8 h-8" />
                        </div>

                        <h3 className="text-xl font-bold text-white">Swap Tokens on Polymarket</h3>
                        <p className="text-sm text-text-secondary">
                            For the best rates when swapping to or from USDC.e, we recommend using the official Polymarket swap interface.
                        </p>

                        <a
                            href="https://polymarket.com/wallet"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-card transition-colors mt-6"
                        >
                            Go to PolySwap <ExternalLink size={16} />
                        </a>
                    </div>
                )}
            </div>
        </Modal>
    );
}
