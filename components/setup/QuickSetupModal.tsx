"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useUsdcApproval } from "@/hooks/useUsdcApproval";
import { useTokenSwap } from "@/hooks/useTokenSwap";
import { formatUnits } from "viem";

type Step = "checking" | "deploying_safe" | "creating_api" | "approving_usdc" | "done";

interface StepInfo {
    step: Step;
    label: string;
    icon: string;
}

const STEPS: StepInfo[] = [
    { step: "checking", label: "Checking account status", icon: "🔍" },
    { step: "deploying_safe", label: "Verifying Safe wallet", icon: "🛡️" },
    { step: "creating_api", label: "Creating API credentials", icon: "🔑" },
    { step: "approving_usdc", label: "Approving USDC for trading", icon: "💰" },
    { step: "done", label: "Setup complete", icon: "✅" },
];

interface InfoMessage {
    title: string;
    message: string;
    action: string;
    onAction: () => Promise<void>;
    secondaryAction?: string;
    onSecondary?: () => void;
}

export default function QuickSetupModal() {
    const { address, isConnected } = useAuth();
    const { hasCredentials, deriveAPIKey, isDerivingKey, error: authError } = usePolymarketAuth();
    const { checkAllowances, approveAll } = useUsdcApproval();
    const { checkBalances, swapNativeToBridged, isSwapping } = useTokenSwap();

    const [isOpen, setIsOpen] = useState(false);
    const [infoMessage, setInfoMessage] = useState<InfoMessage | null>(null);
    const [currentStep, setCurrentStep] = useState<Step>("checking");
    const [stepDetails, setStepDetails] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [safeWallet, setSafeWallet] = useState<string | null>(null);
    const [hasRun, setHasRun] = useState(false);
    const [usdcApproved, setUsdcApproved] = useState(false);
    const runningRef = useRef(false);

    // Auto-open when wallet connects and no credentials
    // Check localStorage SYNCHRONOUSLY to avoid race with usePolymarketAuth's async useEffect
    useEffect(() => {
        if (isConnected && address && !hasRun) {
            const storedCreds = localStorage.getItem(`polymarket_creds_${address.toLowerCase()}`);
            if (storedCreds) {
                return;
            }
            if (!hasCredentials) {
                setIsOpen(true);
            }
        }
    }, [isConnected, address, hasCredentials, hasRun]);

    // Auto-close when credentials are obtained (at any step)
    useEffect(() => {
        if (hasCredentials && isOpen) {
            if (currentStep === "done") {
                const timer = setTimeout(() => {
                    setIsOpen(false);
                }, 2500);
                return () => clearTimeout(timer);
            } else if (currentStep === "checking") {
                // Credentials appeared before setup even started — just close
                setIsOpen(false);
                setHasRun(true);
            }
        }
    }, [hasCredentials, currentStep, isOpen]);

    const runSetup = useCallback(async () => {

        if (runningRef.current) {
            return;
        }

        if (!address) {
            return;
        }

        runningRef.current = true;
        setError(null);

        try {
            // Step 1: Checking
            setCurrentStep("checking");
            setStepDetails((prev: Record<string, string>) => ({
                ...prev,
                checking: "Scanning your account on Polymarket...",
            }));
            await new Promise((r) => setTimeout(r, 1000));



            let finalMaker = address;

            try {
                const res = await fetch(`/api/proxy-wallet?address=${address}`);
                const data = await res.json();
                if (data.success && data.proxyWallet) {
                    setSafeWallet(data.proxyWallet);
                    finalMaker = data.proxyWallet;
                    setStepDetails(prev => ({
                        ...prev,
                        deploying_safe: `Safe wallet found: ${data.proxyWallet.slice(0, 6)}...${data.proxyWallet.slice(-4)}`
                    }));
                } else {
                    setStepDetails(prev => ({ ...prev, deploying_safe: "No proxy wallet — will use EOA mode" }));
                }
            } catch (e) {
                setStepDetails(prev => ({ ...prev, deploying_safe: "Proxy check skipped — using EOA mode" }));
            }



            // NEW: Check USDC balances and offer swap if needed
            const { native, bridged } = await checkBalances(address as `0x${string}`);

            // If user has Native USDC (> 1) but Low Bridged USDC (< 1), prompt swap
            if (native > BigInt(1000000) && bridged < BigInt(1000000)) {
                // Wait for user interaction
                await new Promise<void>((resolve) => {
                    setInfoMessage({
                        title: "Action Required: Swap USDC",
                        message: `You have ${formatUnits(native, 6)} Native USDC but need Bridged USDC.e to trade on Polymarket.`,
                        action: "Swap Now",
                        onAction: async () => {
                            setInfoMessage(null);
                            setStepDetails(prev => ({ ...prev, deploying_safe: "Swapping USDC... Please sign transaction." }));
                            const success = await swapNativeToBridged(address as `0x${string}`, native);
                            if (success) {
                                setStepDetails(prev => ({ ...prev, deploying_safe: "Swap complete! Continuing setup..." }));
                                resolve();
                            } else {
                                setStepDetails(prev => ({ ...prev, deploying_safe: "Swap failed (or rejected). Continuing..." }));
                                resolve();
                            }
                        },
                        secondaryAction: "Skip for now",
                        onSecondary: () => {
                            setInfoMessage(null);
                            setStepDetails(prev => ({ ...prev, deploying_safe: "Swap skipped. You will need USDC.e later." }));
                            resolve();
                        }
                    });
                });
            }

            await new Promise((r) => setTimeout(r, 600));

            // Step 3: Create API key
            setCurrentStep("creating_api");
            setStepDetails((prev: Record<string, string>) => ({
                ...prev,
                creating_api: "📝 Please sign the message in your wallet...",
            }));

            const success = await deriveAPIKey(0);

            if (!success) {
                throw new Error(authError || "Failed to create API credentials. Please try again.");
            }

            setStepDetails((prev: Record<string, string>) => ({
                ...prev,
                creating_api: "API credentials created successfully",
            }));

            await new Promise((r) => setTimeout(r, 400));

            // Step 4: Approve USDC for exchange contracts
            setCurrentStep("approving_usdc");
            setStepDetails((prev: Record<string, string>) => ({
                ...prev,
                approving_usdc: "Checking USDC allowances... (Requires 3 signatures + Gas)",
            }));

            try {
                const approvalStatus = await checkAllowances(finalMaker as `0x${string}`);

                if (approvalStatus.allApproved) {
                    setStepDetails((prev: Record<string, string>) => ({
                        ...prev,
                        approving_usdc: "USDC already approved for all exchange contracts ✅",
                    }));
                    setUsdcApproved(true);
                } else {
                    setStepDetails((prev: Record<string, string>) => ({
                        ...prev,
                        approving_usdc: "🔐 Approve USDC spending in your wallet (one-time)...",
                    }));

                    const approved = await approveAll(
                        finalMaker as `0x${string}`,
                        0,
                        (step) => {
                            setStepDetails((prev: Record<string, string>) => ({
                                ...prev,
                                approving_usdc: step,
                            }));
                        },
                    );

                    if (!approved) {
                        // Approval rejected — mark as warning but don't block setup
                        setStepDetails((prev: Record<string, string>) => ({
                            ...prev,
                            approving_usdc: "⚠️ Approval skipped — you can approve later when placing an order",
                        }));
                        setUsdcApproved(false);
                    } else {
                        setStepDetails((prev: Record<string, string>) => ({
                            ...prev,
                            approving_usdc: "USDC approved for all exchange contracts ✅",
                        }));
                        setUsdcApproved(true);
                    }
                }
            } catch (approvalErr) {
                setStepDetails((prev: Record<string, string>) => ({
                    ...prev,
                    approving_usdc: "⚠️ Couldn't check approvals — will retry when placing order",
                }));
                setUsdcApproved(false);
            }

            await new Promise((r) => setTimeout(r, 400));

            // Step 5: Done
            setCurrentStep("done");
            setHasRun(true);
        } catch (err: any) {
            setError(err.message || "Setup failed");
        } finally {
            runningRef.current = false;
        }
    }, [address, deriveAPIKey, authError, hasCredentials, checkAllowances, approveAll, checkBalances, swapNativeToBridged]);

    // Auto-run setup when modal opens AND address is available
    useEffect(() => {
        if (isOpen && address && !hasCredentials && !runningRef.current && !hasRun) {
            // Small delay to ensure all state is settled
            const timer = setTimeout(() => {
                runSetup();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, address, hasCredentials, runSetup, hasRun]);

    const retry = () => {
        setError(null);
        setCurrentStep("checking");
        setStepDetails({});
        setSafeWallet(null);
        setUsdcApproved(false);
        runningRef.current = false;
        // Small delay then run
        setTimeout(() => runSetup(), 200);
    };

    if (!isOpen) return null;

    const stepIdx = STEPS.findIndex((s) => s.step === currentStep);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                role="presentation" className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={() => {
                    if (currentStep === "done" || error) setIsOpen(false);
                }}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-md mx-4 border border-border-default bg-surface-1 shadow-elevated animate-scale-in"
                style={{ borderRadius: "2px" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-7 h-7 border border-neon/40 flex items-center justify-center bg-primary/10"
                            style={{ borderRadius: "2px" }}
                        >
                            <span className="text-primary text-xs font-bold">⚡</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                                Quick Setup
                            </h2>
                            <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">
                                One-time configuration
                            </p>
                        </div>
                    </div>

                    {/* Always show close button */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setHasRun(true); // Don't reopen
                        }}
                        className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 transition-all"
                        style={{ borderRadius: "2px" }}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                                d="M3 3L11 11M11 3L3 11"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* Steps */}
                <div className="px-5 py-5 space-y-3">
                    {STEPS.map((step, idx) => {
                        const isActive = step.step === currentStep;
                        const isCompleted = idx < stepIdx || currentStep === "done";
                        const hasErr = isActive && !!error;
                        // For approving_usdc step, show warning style if skipped
                        const isWarning = step.step === "approving_usdc" && isCompleted && !usdcApproved && currentStep === "done";

                        return (
                            <div
                                key={step.step}
                                className={`flex items-start gap-3 px-3 py-3 border transition-all duration-300 ${isActive && !hasErr
                                    ? "border-neon/30 bg-primary/5"
                                    : hasErr
                                        ? "border-error/30 bg-error/5"
                                        : isWarning
                                            ? "border-yellow-500/30 bg-yellow-500/5"
                                            : isCompleted
                                                ? "border-success/20 bg-success/5"
                                                : "border-border-default/50 bg-surface-2/50 opacity-50"
                                    }`}
                                style={{ borderRadius: "2px" }}
                            >
                                {/* Status indicator */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {hasErr ? (
                                        <div
                                            className="w-5 h-5 flex items-center justify-center border border-error/40 bg-error/10 text-error text-xs"
                                            style={{ borderRadius: "2px" }}
                                        >
                                            ✕
                                        </div>
                                    ) : isWarning ? (
                                        <div
                                            className="w-5 h-5 flex items-center justify-center border border-yellow-500/40 bg-yellow-500/10 text-yellow-500 text-xs"
                                            style={{ borderRadius: "2px" }}
                                        >
                                            ⚠
                                        </div>
                                    ) : isCompleted ? (
                                        <div
                                            className="w-5 h-5 flex items-center justify-center border border-success/40 bg-success/10 text-success text-xs"
                                            style={{ borderRadius: "2px" }}
                                        >
                                            ✓
                                        </div>
                                    ) : isActive ? (
                                        <div
                                            className="w-5 h-5 flex items-center justify-center border border-neon/40 bg-primary/10"
                                            style={{ borderRadius: "2px" }}
                                        >
                                            <span className="w-2.5 h-2.5 border-2 border-neon border-t-transparent rounded-pill animate-spin" />
                                        </div>
                                    ) : (
                                        <div
                                            className="w-5 h-5 flex items-center justify-center border border-border-default/40 bg-surface-3 text-text-muted text-[10px]"
                                            style={{ borderRadius: "2px" }}
                                        >
                                            {idx + 1}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">{step.icon}</span>
                                        <span
                                            className={`text-xs font-bold uppercase tracking-wider ${hasErr
                                                ? "text-error"
                                                : isWarning
                                                    ? "text-yellow-500"
                                                    : isCompleted
                                                        ? "text-success"
                                                        : isActive
                                                            ? "text-primary"
                                                            : "text-text-muted"
                                                }`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>

                                    {/* Detail line */}
                                    {(stepDetails[step.step] || (isActive && isDerivingKey)) && (
                                        <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                                            {stepDetails[step.step]}
                                            {isActive && isDerivingKey && step.step === "creating_api" && (
                                                <span className="inline-block ml-1 animate-blink text-primary">▮</span>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Required Overlay (Swap) */}
                {infoMessage && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center animate-fade-in" style={{ borderRadius: "2px" }}>
                        <div className="max-w-xs space-y-4">
                            <div className="w-10 h-10 mx-auto border border-neon/50 rounded-pill flex items-center justify-center bg-primary/20 animate-pulse">
                                <span className="text-primary text-xl">⇄</span>
                            </div>
                            <h3 className="text-primary font-bold uppercase tracking-wider">{infoMessage.title}</h3>
                            <p className="text-xs text-text-secondary leading-relaxed">{infoMessage.message}</p>
                            <button
                                onClick={infoMessage.onAction}
                                disabled={isSwapping}
                                className="w-full py-2.5 bg-primary text-black text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50"
                                style={{ borderRadius: "2px" }}
                            >
                                {isSwapping ? "Swapping..." : infoMessage.action}
                            </button>

                            {infoMessage.secondaryAction && (
                                <button
                                    onClick={infoMessage.onSecondary}
                                    disabled={isSwapping}
                                    className="w-full py-1.5 bg-transparent text-text-muted text-[10px] hover:text-text-primary transition-colors uppercase tracking-wider"
                                >
                                    {infoMessage.secondaryAction}
                                </button>
                            )}

                            {isSwapping && <p className="text-[10px] text-text-muted animate-pulse">Confirm transaction in wallet... (Gas: ~0.005 MATIC)</p>}
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="px-5 pb-4">
                        <div
                            className="px-3 py-2.5 border border-error/30 bg-error/5"
                            style={{ borderRadius: "2px" }}
                        >
                            <p className="text-[10px] text-error font-mono mb-2">
                                <span className="text-error font-bold">ERROR:</span> {error}
                            </p>
                            <button
                                onClick={retry}
                                className="px-4 py-1.5 bg-surface-3 border border-border-default text-[10px] text-text-primary uppercase tracking-wider font-bold hover:border-neon/30 hover:text-primary transition-all"
                                style={{ borderRadius: "2px" }}
                            >
                                ↻ Retry Setup
                            </button>
                        </div>
                    </div>
                )}

                {/* Done state */}
                {currentStep === "done" && !error && (
                    <div className="px-5 pb-5">
                        <div
                            className="px-4 py-3 border border-neon/20 bg-primary/5 space-y-2"
                            style={{ borderRadius: "2px" }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-success text-xs">✓</span>
                                <span className="text-xs text-success font-bold uppercase tracking-wider">
                                    Wallet Connected
                                </span>
                            </div>
                            {safeWallet && (
                                <div className="flex items-center gap-2">
                                    <span className="text-success text-xs">✓</span>
                                    <span className="text-xs text-success font-bold uppercase tracking-wider">
                                        Safe Wallet Linked
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-success text-xs">✓</span>
                                <span className="text-xs text-success font-bold uppercase tracking-wider">
                                    API Credentials Active
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs ${usdcApproved ? "text-success" : "text-yellow-500"}`}>
                                    {usdcApproved ? "✓" : "⚠"}
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-wider ${usdcApproved ? "text-success" : "text-yellow-500"}`}>
                                    {usdcApproved ? "USDC Approved" : "USDC Approval Pending"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-success text-xs">✓</span>
                                <span className="text-xs text-success font-bold uppercase tracking-wider">
                                    Ready to Trade
                                </span>
                            </div>
                        </div>

                        <p className="text-[10px] text-text-muted mt-3 text-center uppercase tracking-wider">
                            Auto-closing in 2s...
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border-default flex items-center justify-between">
                    <p className="text-[9px] text-text-muted uppercase tracking-widest">
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
                    </p>
                    <div className="flex items-center gap-1.5">
                        {STEPS.map((step, idx) => {
                            const isCompleted = idx < stepIdx || currentStep === "done";
                            const isActive = idx === stepIdx && currentStep !== "done";
                            return (
                                <div
                                    key={step.step}
                                    className={`h-1 transition-all duration-500 ${isCompleted
                                        ? "bg-primary w-4"
                                        : isActive
                                            ? "bg-primary/40 w-3 animate-pulse-slow"
                                            : "bg-surface-3 w-2"
                                        }`}
                                    style={{ borderRadius: "1px" }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
