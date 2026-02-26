"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/providers/AuthProvider";
import { useWalletClient, usePublicClient } from "wagmi";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useDeposit } from "@/hooks/useDeposit";
import { useTokenSwap } from "@/hooks/useTokenSwap";
import {
    withdrawUSDCFlow,
    directSendToProxy,
    CHAIN_INFO,
} from "@/lib/polymarket/bridge";
import { formatUnits, erc20Abi } from "viem";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ArrowRightLeft,
    Send,
    Loader2,
    Check,
    Copy,
    ExternalLink,
    Wallet,
    Info,
    AlertTriangle,
    RefreshCw,
    ArrowRight,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_NATIVE = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

type FundsTab = "deposit" | "direct" | "swap" | "withdraw";

interface FundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: FundsTab;
}

// ─── Supported chains for deposit display ─────────────────────────────────────
const DEPOSIT_CHAINS = [
    { id: "137", name: "Polygon", icon: "⬡", color: "#8247E5", min: "$2" },
    { id: "1", name: "Ethereum", icon: "⟠", color: "#627EEA", min: "$7" },
    { id: "8453", name: "Base", icon: "🔵", color: "#0052FF", min: "$2" },
    { id: "42161", name: "Arbitrum", icon: "◆", color: "#28A0F0", min: "$2" },
    { id: "10", name: "Optimism", icon: "🔴", color: "#FF0420", min: "$2" },
    { id: "56", name: "BNB", icon: "◈", color: "#F3BA2F", min: "$2" },
    { id: "sol", name: "Solana", icon: "◎", color: "#9945FF", min: "$2" },
    { id: "btc", name: "Bitcoin", icon: "₿", color: "#F7931A", min: "$9" },
];

export default function FundsModal({
    isOpen,
    onClose,
    defaultTab = "deposit",
}: FundsModalProps) {
    const [activeTab, setActiveTab] = useState<FundsTab>(defaultTab);
    const { address, isConnected } = useAuth();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient({ chainId: 137 });
    const { proxyWallet, loadProxyWallet } = usePolymarketAuth();
    const { checkBalances, swapNativeToBridged, isSwapping } = useTokenSwap();

    // Deposit hook
    const {
        depositAddresses,
        activeDeposits,
        phase: depositPhase,
        generateDepositAddresses,
        startMonitoring,
        stopMonitoring,
        reset: resetDeposit,
    } = useDeposit();

    // ─── Balance state ────────────────────────────────────────────────────────
    const [tradingBalance, setTradingBalance] = useState(0);
    const [eoaBridgedBalance, setEoaBridgedBalance] = useState(0);
    const [eoaNativeBalance, setEoaNativeBalance] = useState(0);
    const [initialTradingBalance, setInitialTradingBalance] = useState<number | null>(null);
    const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

    // ─── UI states ────────────────────────────────────────────────────────────
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [selectedChain, setSelectedChain] = useState(DEPOSIT_CHAINS[0]);

    // Direct Send state
    const [directAmount, setDirectAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendTx, setSendTx] = useState("");
    const [sendError, setSendError] = useState("");

    // Swap state
    const [swapAmount, setSwapAmount] = useState("");
    const [swapSuccess, setSwapSuccess] = useState(false);
    const [swapError, setSwapError] = useState("");

    // Withdraw state
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawTo, setWithdrawTo] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawTx, setWithdrawTx] = useState("");
    const [withdrawError, setWithdrawError] = useState("");

    // Helper: safely get proxy wallet as a display string
    const safeProxyDisplay = (full = false): string => {
        if (typeof proxyWallet === "string" && proxyWallet.startsWith("0x") && proxyWallet.length >= 10) {
            return full ? proxyWallet : `${proxyWallet.slice(0, 10)}...${proxyWallet.slice(-6)}`;
        }
        return "Not available";
    };
    const isProxyValid = typeof proxyWallet === "string" && proxyWallet.startsWith("0x") && proxyWallet.length >= 10;

    // ─── Load proxy wallet ────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && address && !isProxyValid) {
            loadProxyWallet(address);
        }
    }, [isOpen, address, isProxyValid, loadProxyWallet]);

    const activeAddress = (isProxyValid ? proxyWallet : address) || address;

    // ─── Fetch balances ───────────────────────────────────────────────────────
    const fetchBalances = useCallback(async (setInitial = false) => {
        if (!publicClient) return;

        try {
            // Trading balance (proxy wallet)
            if (activeAddress) {
                const bal = await publicClient.readContract({
                    address: USDC_BRIDGED as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [activeAddress as `0x${string}`],
                });
                const parsed = parseFloat(formatUnits(bal as bigint, 6));
                setTradingBalance(parsed);
                if (setInitial) setInitialTradingBalance(parsed);
            }

            // EOA balances (for direct send + swap)
            if (address) {
                const [bridged, native] = await Promise.all([
                    publicClient.readContract({
                        address: USDC_BRIDGED as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address as `0x${string}`],
                    }).catch(() => BigInt(0)),
                    publicClient.readContract({
                        address: USDC_NATIVE as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address as `0x${string}`],
                    }).catch(() => BigInt(0)),
                ]);
                setEoaBridgedBalance(parseFloat(formatUnits(bridged as bigint, 6)));
                setEoaNativeBalance(parseFloat(formatUnits(native as bigint, 6)));
            }
        } catch {
            // silently fail
        }
    }, [publicClient, activeAddress, address]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            resetFields();
            fetchBalances(true);
        }
        return () => {
            stopMonitoring();
        };
    }, [isOpen]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchBalances(false); }, [balanceRefreshKey]);

    // Poll balance every 10s when on deposit tab
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => fetchBalances(false), 10000);
        return () => clearInterval(interval);
    }, [isOpen, fetchBalances]);

    // Detect balance increase
    useEffect(() => {
        if (initialTradingBalance !== null && tradingBalance > initialTradingBalance + 0.01) {
            setInitialTradingBalance(tradingBalance);
        }
    }, [tradingBalance, initialTradingBalance]);

    function resetFields() {
        setDirectAmount("");
        setSendTx("");
        setSendError("");
        setSwapAmount("");
        setSwapSuccess(false);
        setSwapError("");
        setWithdrawAmount("");
        setWithdrawTo(address || "");
        setWithdrawTx("");
        setWithdrawError("");
        setCopiedAddress(false);
        resetDeposit();
    }

    // ─── Copy helper ──────────────────────────────────────────────────────────
    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
    }

    // ─── Get deposit address for selected chain ───────────────────────────────
    const getDepositAddressForChain = () => {
        if (!depositAddresses) return null;
        const chain = CHAIN_INFO[selectedChain.id];
        if (!chain) return null;

        const addrType = chain.addressType;
        if (addrType === "evm" && depositAddresses.evm) return depositAddresses.evm.address || depositAddresses.evm;
        if (addrType === "svm" && depositAddresses.svm) return depositAddresses.svm.address || depositAddresses.svm;
        if (addrType === "btc" && depositAddresses.btc) return depositAddresses.btc.address || depositAddresses.btc;

        // Try string fallback
        if (typeof depositAddresses === "object") {
            const key = selectedChain.name.toLowerCase();
            if (depositAddresses[key]) return depositAddresses[key];
        }
        return null;
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleGenerateAddresses = async () => {
        const addrs = await generateDepositAddresses();
        if (addrs) {
            // Auto-start monitoring for the deposit address
            const addr = getDepositAddressForChain();
            if (addr && typeof addr === "string") {
                startMonitoring(addr, () => {
                    setBalanceRefreshKey((k) => k + 1);
                });
            }
        }
    };

    const handleDirectSend = async () => {
        if (!walletClient || !isProxyValid) {
            setSendError("Proxy wallet not available. Enable Trading first.");
            return;
        }
        const amt = parseFloat(directAmount);
        if (isNaN(amt) || amt <= 0) {
            setSendError("Enter a valid amount");
            return;
        }
        if (amt > eoaBridgedBalance) {
            setSendError(`Insufficient balance. You have ${eoaBridgedBalance.toFixed(2)} USDC.e`);
            return;
        }

        setIsSending(true);
        setSendError("");
        try {
            const tx = await directSendToProxy(
                walletClient,
                proxyWallet as `0x${string}`,
                amt
            );
            setSendTx(tx);
            setBalanceRefreshKey((k) => k + 1);
        } catch (e: any) {
            if (e?.code === 4001 || e?.message?.includes("rejected") || e?.message?.includes("denied")) {
                setSendError("Transaction rejected");
            } else {
                setSendError(e.message || "Transfer failed");
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleSwap = async () => {
        if (!address || !walletClient) {
            setSwapError("Wallet not connected");
            return;
        }
        const val = parseFloat(swapAmount);
        if (isNaN(val) || val <= 0) {
            setSwapError("Enter a valid amount");
            return;
        }
        if (val > eoaNativeBalance) {
            setSwapError(`Insufficient balance. You have ${eoaNativeBalance.toFixed(2)} Native USDC`);
            return;
        }

        setSwapError("");
        try {
            const { parseUnits } = await import("viem");
            await swapNativeToBridged(
                address as `0x${string}`,
                parseUnits(swapAmount, 6)
            );
            setSwapSuccess(true);
            setSwapAmount("");
            setBalanceRefreshKey((k) => k + 1);
        } catch (e: any) {
            setSwapError(e.message || "Swap failed");
        }
    };

    const handleWithdraw = async () => {
        if (!walletClient || !withdrawTo) {
            setWithdrawError("Please connect wallet and enter recipient");
            return;
        }
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt <= 0 || amt > tradingBalance) {
            setWithdrawError("Invalid amount");
            return;
        }

        setIsWithdrawing(true);
        setWithdrawError("");
        try {
            const tx = await withdrawUSDCFlow(
                walletClient,
                withdrawTo as `0x${string}`,
                amt
            );
            setWithdrawTx(tx);
            setBalanceRefreshKey((k) => k + 1);
        } catch (e: any) {
            setWithdrawError(e.message || "Withdraw failed");
        } finally {
            setIsWithdrawing(false);
        }
    };

    // ─── Tab config ───────────────────────────────────────────────────────────
    const TABS: { id: FundsTab; label: string; icon: React.ReactNode }[] = [
        { id: "deposit", label: "Deposit", icon: <ArrowDownToLine size={14} /> },
        { id: "direct", label: "Send", icon: <Send size={14} /> },
        { id: "swap", label: "Swap", icon: <ArrowRightLeft size={14} /> },
        { id: "withdraw", label: "Withdraw", icon: <ArrowUpFromLine size={14} /> },
    ];

    if (!isConnected) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Connect Wallet">
                <div className="p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <Wallet size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Connect your wallet to manage funds.
                    </p>
                    <button
                        onClick={onClose}
                        className="btn-primary w-full"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><Wallet size={16} style={{ color: 'var(--accent-mocha)' }} /> Funds</>}
            className="max-w-[480px]"
        >
            {/* ── Balance Header ─────────────────────────────────────────────── */}
            <div
                className="px-5 py-4 text-center"
                style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
                <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Trading Balance
                </p>
                <div
                    className="text-3xl font-extrabold font-tabular"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}
                >
                    ${tradingBalance.toFixed(2)}
                </div>

                {typeof proxyWallet === "string" && proxyWallet.startsWith("0x") && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Proxy:</span>
                        <button
                            onClick={() => copyToClipboard(proxyWallet)}
                            className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md transition-all"
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            {proxyWallet.slice(0, 6)}...{proxyWallet.slice(-4)}
                            {copiedAddress ? <Check size={10} style={{ color: 'var(--accent-green)' }} /> : <Copy size={10} />}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Tab Navigation ─────────────────────────────────────────────── */}
            <div
                className="px-3 py-2 flex gap-1"
                style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-base)' }}
            >
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all"
                        )}
                        style={{
                            backgroundColor: activeTab === tab.id ? 'var(--accent-mocha)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--text-inverse)' : 'var(--text-muted)',
                            boxShadow: activeTab === tab.id ? 'var(--shadow-card)' : 'none',
                        }}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Tab Content ────────────────────────────────────────────────── */}
            <div className="p-5">

                {/* ═══════════════ DEPOSIT TAB ═══════════════ */}
                {activeTab === "deposit" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Info banner */}
                        <div
                            className="flex gap-3 p-3 rounded-xl"
                            style={{
                                backgroundColor: 'rgba(130, 71, 229, 0.06)',
                                border: '1px solid rgba(130, 71, 229, 0.15)',
                            }}
                        >
                            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#8247E5' }} />
                            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: '#8247E5' }}>Cross-chain Deposit</strong>
                                <br />
                                Send crypto from any supported chain. It will be automatically converted to USDC.e on Polygon for trading.
                            </div>
                        </div>

                        {/* Chain selector */}
                        <div>
                            <label
                                className="text-[10px] font-bold uppercase tracking-widest mb-2 block"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Select Source Chain
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {DEPOSIT_CHAINS.map((chain) => (
                                    <button
                                        key={chain.id}
                                        onClick={() => setSelectedChain(chain)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all border"
                                        )}
                                        style={{
                                            borderColor: selectedChain.id === chain.id ? chain.color : 'var(--border-subtle)',
                                            backgroundColor: selectedChain.id === chain.id ? `${chain.color}10` : 'var(--bg-surface)',
                                            boxShadow: selectedChain.id === chain.id ? `0 0 0 1px ${chain.color}40` : 'none',
                                        }}
                                    >
                                        <span className="text-lg leading-none">{chain.icon}</span>
                                        <span
                                            className="text-[9px] font-bold"
                                            style={{ color: selectedChain.id === chain.id ? chain.color : 'var(--text-muted)' }}
                                        >
                                            {chain.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Deposit address or generate button */}
                        {!depositAddresses ? (
                            <button
                                onClick={handleGenerateAddresses}
                                disabled={depositPhase === "generating"}
                                className="w-full btn-primary flex items-center justify-center gap-2"
                            >
                                {depositPhase === "generating" ? (
                                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                                ) : (
                                    <><Zap size={14} /> Get Deposit Address</>
                                )}
                            </button>
                        ) : (
                            <div className="space-y-3">
                                {/* Deposit address display */}
                                <div
                                    className="p-4 rounded-xl"
                                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span
                                            className="text-[10px] font-bold uppercase tracking-widest"
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            Send {selectedChain.name} assets here
                                        </span>
                                        <span
                                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: `${selectedChain.color}15`,
                                                color: selectedChain.color,
                                                border: `1px solid ${selectedChain.color}30`,
                                            }}
                                        >
                                            Min: {selectedChain.min}
                                        </span>
                                    </div>

                                    {(() => {
                                        const addr = getDepositAddressForChain();
                                        const displayAddr = typeof addr === "string" ? addr : typeof addr === "object" && addr ? JSON.stringify(addr) : "Loading...";
                                        return (
                                            <button
                                                onClick={() => typeof addr === "string" && copyToClipboard(addr)}
                                                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all group"
                                                style={{
                                                    backgroundColor: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border-default)',
                                                }}
                                            >
                                                <span
                                                    className="text-[11px] font-mono font-semibold truncate"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {typeof addr === "string" && addr.length > 20
                                                        ? `${addr.slice(0, 10)}...${addr.slice(-8)}`
                                                        : displayAddr
                                                    }
                                                </span>
                                                {copiedAddress ? (
                                                    <Check size={14} style={{ color: 'var(--accent-green)' }} />
                                                ) : (
                                                    <Copy size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>

                                {/* Monitoring status */}
                                {depositPhase === "monitoring" && (
                                    <div
                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg"
                                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                                    >
                                        <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            Monitoring for incoming deposits...
                                        </span>
                                    </div>
                                )}

                                {depositPhase === "completed" && (
                                    <div
                                        className="flex items-center gap-2 py-2.5 px-3 rounded-xl"
                                        style={{
                                            backgroundColor: 'rgba(21, 128, 61, 0.08)',
                                            border: '1px solid rgba(21, 128, 61, 0.2)',
                                        }}
                                    >
                                        <Check size={14} style={{ color: 'var(--accent-green)' }} />
                                        <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-green)' }}>
                                            Deposit detected! Balance updated.
                                        </span>
                                    </div>
                                )}

                                {/* Active deposits */}
                                {activeDeposits.length > 0 && (
                                    <div className="space-y-1.5">
                                        {activeDeposits.map((d, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg"
                                                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                            >
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {CHAIN_INFO[d.fromChainId]?.name || `Chain ${d.fromChainId}`}
                                                </span>
                                                <span
                                                    className="font-bold"
                                                    style={{
                                                        color: d.status === "COMPLETED"
                                                            ? 'var(--accent-green)'
                                                            : d.status === "FAILED"
                                                                ? 'var(--accent-red)'
                                                                : 'var(--text-muted)',
                                                    }}
                                                >
                                                    {d.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Divider + external link */}
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                or
                            </span>
                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        </div>

                        <a
                            href={proxyWallet ? `https://polymarket.com/profile/${proxyWallet}` : "https://polymarket.com/deposit"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-default)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            Open Polymarket Bridge <ExternalLink size={12} />
                        </a>
                    </div>
                )}

                {/* ═══════════════ DIRECT SEND TAB ═══════════════ */}
                {activeTab === "direct" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Info */}
                        <div
                            className="flex gap-3 p-3 rounded-xl"
                            style={{
                                backgroundColor: 'rgba(21, 128, 61, 0.06)',
                                border: '1px solid rgba(21, 128, 61, 0.15)',
                            }}
                        >
                            <Zap className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-green)' }} />
                            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--accent-green)' }}>Fastest Way to Fund</strong>
                                <br />
                                Transfer USDC.e directly from your connected wallet to your Polymarket trading wallet. Instant on Polygon.
                            </div>
                        </div>

                        {!isProxyValid ? (
                            <div
                                className="flex items-center gap-3 p-4 rounded-xl"
                                style={{
                                    backgroundColor: 'rgba(185, 28, 28, 0.06)',
                                    border: '1px solid rgba(185, 28, 28, 0.15)',
                                }}
                            >
                                <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
                                <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--accent-red)' }}>No Proxy Wallet</strong>
                                    <br />
                                    Enable Trading first to create your proxy wallet, or use the Deposit tab.
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* From → To */}
                                <div className="space-y-3">
                                    {/* From */}
                                    <div
                                        className="p-3 rounded-xl"
                                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-widest"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                From (Your Wallet)
                                            </span>
                                            <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                                                {eoaBridgedBalance.toFixed(2)} USDC.e
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <span
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                                                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                                            >$</span>
                                            <input
                                                type="number"
                                                value={directAmount}
                                                onChange={(e) => { setDirectAmount(e.target.value); setSendError(""); setSendTx(""); }}
                                                placeholder="0.00"
                                                className="w-full py-2.5 pl-7 pr-16 text-sm font-bold rounded-lg outline-none transition-all"
                                                style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    backgroundColor: 'var(--bg-base)',
                                                    border: '1px solid var(--border-default)',
                                                    color: 'var(--text-primary)',
                                                }}
                                            />
                                            <button
                                                onClick={() => setDirectAmount(eoaBridgedBalance.toString())}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors"
                                                style={{
                                                    backgroundColor: 'rgba(21, 128, 61, 0.1)',
                                                    color: 'var(--accent-green)',
                                                }}
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex justify-center -my-1 relative z-10">
                                        <div
                                            className="p-1.5 rounded-full"
                                            style={{
                                                backgroundColor: 'var(--bg-base)',
                                                border: '1px solid var(--border-default)',
                                                boxShadow: 'var(--shadow-card)',
                                            }}
                                        >
                                            <ArrowDownToLine size={14} style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </div>

                                    {/* To */}
                                    <div
                                        className="p-3 rounded-xl"
                                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-widest"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                To (Trading Wallet)
                                            </span>
                                        </div>
                                        <div
                                            className="text-[11px] font-mono py-2 px-3 rounded-lg"
                                            style={{
                                                backgroundColor: 'var(--bg-elevated)',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-subtle)',
                                            }}
                                        >
                                            {safeProxyDisplay()}
                                        </div>
                                    </div>
                                </div>

                                {sendError && (
                                    <div className="text-[11px] font-semibold text-center" style={{ color: 'var(--accent-red)' }}>
                                        {sendError}
                                    </div>
                                )}

                                {sendTx ? (
                                    <div
                                        className="p-3 rounded-xl space-y-2"
                                        style={{
                                            backgroundColor: 'rgba(21, 128, 61, 0.06)',
                                            border: '1px solid rgba(21, 128, 61, 0.2)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--accent-green)' }}>
                                            <Check size={16} /> Transfer Sent!
                                        </div>
                                        <a
                                            href={`https://polygonscan.com/tx/${sendTx}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] flex items-center gap-1 break-all"
                                            style={{ color: 'var(--accent-mocha)' }}
                                        >
                                            View on Polygonscan <ExternalLink size={12} />
                                        </a>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleDirectSend}
                                        disabled={isSending || !directAmount || parseFloat(directAmount) <= 0}
                                        className={cn(
                                            "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                        )}
                                        style={{
                                            backgroundColor: (isSending || !directAmount || parseFloat(directAmount) <= 0) ? 'var(--border-default)' : 'var(--accent-mocha)',
                                            color: (isSending || !directAmount || parseFloat(directAmount) <= 0) ? 'var(--text-muted)' : 'var(--text-inverse)',
                                            boxShadow: (isSending || !directAmount || parseFloat(directAmount) <= 0) ? 'none' : 'var(--shadow-mocha)',
                                            cursor: (isSending || !directAmount || parseFloat(directAmount) <= 0) ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isSending ? (
                                            <><Loader2 size={14} className="animate-spin" /> Sending...</>
                                        ) : (
                                            <><Send size={14} /> Send to Trading Wallet</>
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════ SWAP TAB ═══════════════ */}
                {activeTab === "swap" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Info */}
                        <div
                            className="flex gap-3 p-3 rounded-xl"
                            style={{
                                backgroundColor: 'rgba(10, 10, 10, 0.04)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Native USDC → USDC.e</strong>
                                <br />
                                Swap Polygon Native USDC to Bridged USDC.e via Uniswap V3 (0.05% fee). Then use the &quot;Send&quot; tab to fund your trading wallet.
                            </div>
                        </div>

                        {/* From (Native USDC) */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>
                                <span>From</span>
                                <span>Bal: {eoaNativeBalance.toFixed(2)} USDC</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={swapAmount}
                                    onChange={(e) => { setSwapAmount(e.target.value); setSwapSuccess(false); setSwapError(""); }}
                                    placeholder="0.00"
                                    className="w-full py-3 px-3 pr-20 font-mono font-bold text-lg rounded-xl outline-none transition-all"
                                    style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        border: '1px solid var(--border-default)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <button
                                        onClick={() => setSwapAmount(eoaNativeBalance.toString())}
                                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded transition-colors"
                                        style={{
                                            backgroundColor: 'rgba(10, 10, 10, 0.06)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        MAX
                                    </button>
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>USDC</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center -my-1 relative z-10">
                            <div
                                className="p-1.5 rounded-full"
                                style={{
                                    backgroundColor: 'var(--bg-base)',
                                    border: '1px solid var(--border-default)',
                                    boxShadow: 'var(--shadow-card)',
                                }}
                            >
                                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        {/* To (Bridged USDC.e) */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>
                                <span>To</span>
                                <span>Bal: {eoaBridgedBalance.toFixed(2)} USDC.e</span>
                            </div>
                            <div
                                className="py-3 px-3 font-mono font-bold text-lg rounded-xl flex items-center justify-between opacity-75"
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <span>{swapAmount || "0.00"}</span>
                                <span className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>USDC.e</span>
                            </div>
                        </div>

                        {/* Fee info */}
                        {parseFloat(swapAmount) > 0 && (
                            <div
                                className="text-[10px] p-2.5 rounded-lg space-y-1"
                                style={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <div className="flex justify-between">
                                    <span>Uniswap fee (0.05%):</span>
                                    <span className="font-mono">~${(parseFloat(swapAmount) * 0.0005).toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Est. output:</span>
                                    <span className="font-mono font-bold" style={{ color: 'var(--accent-green)' }}>
                                        {(parseFloat(swapAmount) * 0.9995).toFixed(2)} USDC.e
                                    </span>
                                </div>
                            </div>
                        )}

                        {swapError && (
                            <div className="text-[11px] font-semibold text-center" style={{ color: 'var(--accent-red)' }}>
                                {swapError}
                            </div>
                        )}

                        {swapSuccess ? (
                            <div
                                className="flex items-center justify-center gap-2 py-3 rounded-xl"
                                style={{
                                    backgroundColor: 'rgba(21, 128, 61, 0.08)',
                                    border: '1px solid rgba(21, 128, 61, 0.2)',
                                }}
                            >
                                <Check size={14} style={{ color: 'var(--accent-green)' }} />
                                <span className="text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>
                                    Swap Successful!
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={handleSwap}
                                disabled={isSwapping || !swapAmount || parseFloat(swapAmount) <= 0}
                                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                style={{
                                    backgroundColor: (isSwapping || !swapAmount || parseFloat(swapAmount) <= 0) ? 'var(--border-default)' : 'var(--accent-mocha)',
                                    color: (isSwapping || !swapAmount || parseFloat(swapAmount) <= 0) ? 'var(--text-muted)' : 'var(--text-inverse)',
                                    boxShadow: (isSwapping || !swapAmount || parseFloat(swapAmount) <= 0) ? 'none' : 'var(--shadow-mocha)',
                                    cursor: (isSwapping || !swapAmount || parseFloat(swapAmount) <= 0) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isSwapping ? (
                                    <><RefreshCw size={14} className="animate-spin" /> Swapping...</>
                                ) : (
                                    <><ArrowRightLeft size={14} /> Swap to USDC.e</>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* ═══════════════ WITHDRAW TAB ═══════════════ */}
                {activeTab === "withdraw" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Available Balance</span>
                            <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                                ${tradingBalance.toFixed(2)}
                            </span>
                        </div>

                        <div>
                            <label
                                className="text-[10px] font-bold uppercase tracking-widest mb-2 block"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Recipient Address (Polygon)
                            </label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={withdrawTo}
                                onChange={(e) => setWithdrawTo(e.target.value)}
                                className="w-full py-2.5 px-3 text-sm rounded-xl outline-none transition-all"
                                style={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>

                        <div>
                            <label
                                className="text-[10px] font-bold uppercase tracking-widest mb-2 block"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Amount to Withdraw
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full py-2.5 pl-3 pr-16 text-sm rounded-xl outline-none transition-all"
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        backgroundColor: 'var(--bg-surface)',
                                        border: '1px solid var(--border-default)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <button
                                    onClick={() => setWithdrawAmount(tradingBalance.toString())}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors"
                                    style={{
                                        backgroundColor: 'rgba(10, 10, 10, 0.06)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    MAX
                                </button>
                            </div>
                        </div>

                        {withdrawError && (
                            <div className="text-[11px] font-semibold" style={{ color: 'var(--accent-red)' }}>
                                {withdrawError}
                            </div>
                        )}

                        {withdrawTx ? (
                            <div
                                className="p-3 rounded-xl space-y-2"
                                style={{
                                    backgroundColor: 'rgba(21, 128, 61, 0.06)',
                                    border: '1px solid rgba(21, 128, 61, 0.2)',
                                }}
                            >
                                <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--accent-green)' }}>
                                    <Check size={16} /> Withdrawal Sent!
                                </div>
                                <a
                                    href={`https://polygonscan.com/tx/${withdrawTx}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] flex items-center gap-1 break-all"
                                    style={{ color: 'var(--accent-mocha)' }}
                                >
                                    View on Polygonscan <ExternalLink size={12} />
                                </a>
                            </div>
                        ) : (
                            <button
                                onClick={handleWithdraw}
                                disabled={isWithdrawing || !withdrawAmount || !withdrawTo}
                                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                style={{
                                    backgroundColor: (isWithdrawing || !withdrawAmount || !withdrawTo) ? 'var(--border-default)' : 'var(--accent-mocha)',
                                    color: (isWithdrawing || !withdrawAmount || !withdrawTo) ? 'var(--text-muted)' : 'var(--text-inverse)',
                                    boxShadow: (isWithdrawing || !withdrawAmount || !withdrawTo) ? 'none' : 'var(--shadow-mocha)',
                                    cursor: (isWithdrawing || !withdrawAmount || !withdrawTo) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isWithdrawing ? (
                                    <><Loader2 size={14} className="animate-spin" /> Processing...</>
                                ) : (
                                    "Withdraw USDC.e"
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <div
                className="px-5 py-3 text-center"
                style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    Polymarket uses USDC.e (Bridged USDC) on Polygon for all trading activity.
                </p>
            </div>
        </Modal>
    );
}
