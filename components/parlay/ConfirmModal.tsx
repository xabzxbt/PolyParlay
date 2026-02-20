"use client";
import { cn, formatPrice, formatUSD, formatOdds } from "@/lib/utils";
import { useOrderSigning, type LegSigningStatus } from "@/hooks/useOrderSigning";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { ParlayLeg } from "@/lib/parlay/calculator";
import { CheckCircle2, AlertTriangle, Loader2, X, Clock, FileSignature, Ticket, ArrowRight } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  legs: ParlayLeg[];
  stake: number;
  combinedOdds: number;
  potentialPayout: number;
  onSuccess?: () => void;
  onInsufficientFunds?: (required: number, available: number) => void;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "pending": return <Clock size={14} className="text-text-muted" />;
    case "signing": return <FileSignature size={14} className="text-primary" />;
    case "signed": return <CheckCircle2 size={14} className="text-success" />;
    case "error": return <AlertTriangle size={14} className="text-error" />;
    default: return <Clock size={14} />;
  }
};

export default function ConfirmModal({ isOpen, onClose, legs, stake, combinedOdds, potentialPayout, onSuccess, onInsufficientFunds }: Props) {
  const { address, isConnected } = useAuth();
  const { signAndSubmit, phase, legStatuses, error, balanceInfo, reset, proxyWallet, approvalStep } = useOrderSigning();
  const { hasCredentials, isDerivingKey, deriveAPIKey, error: authError } = usePolymarketAuth();
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isConnected || !address) {
      toast("warning", "Connect your wallet first");
      onClose();
      return;
    }

    if (!hasCredentials) {
      toast("warning", "Enable trading first");
      return;
    }

    const result: any = await signAndSubmit(legs, stake, combinedOdds, potentialPayout);

    if (result.success) {
      toast("success", `Parlay placed! ${legs.length} legs for ${formatUSD(stake)}`);
      onSuccess?.();
      setTimeout(() => { reset(); onClose(); }, 1500);
    } else if (result.error === "insufficient_funds") {
      onClose();
      onInsufficientFunds?.(result.required, result.available);
    }
  };

  const handleEnableTrading = async () => {
    const success = await deriveAPIKey();
    if (success) {
      toast("success", "Trading enabled! You can now place parlays.");
    } else {
      toast("error", authError || "Failed to enable trading. Try again.");
    }
  };

  const handleRetry = () => { reset(); handleConfirm(); };
  const handleClose = () => { reset(); onClose(); };

  const isWorking = phase === "signing" || phase === "submitting" || phase === "checking" || phase === "approving" || isDerivingKey;
  const isDone = phase === "done";
  const isError = phase === "error";
  const signedCount = legStatuses.filter(l => l.status === "signed").length;
  const isCompact = legs.length > 5;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans">
      <div role="presentation" className="absolute inset-0 bg-surface-1/60 backdrop-blur-sm" onClick={isWorking ? undefined : handleClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-modal w-[460px] max-w-[92vw] max-h-[88vh] flex flex-col animate-scale-in shadow-elevated overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default shrink-0 bg-surface-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Ticket size={18} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary leading-tight">
                {isDone ? "Parlay Placed!" :
                  isDerivingKey ? "Enabling Trading..." :
                    phase === "checking" ? "Checking Balance..." :
                      phase === "approving" ? "Approving USDC..." :
                        phase === "signing" ? `Signing Order ${signedCount + 1}/${legs.length}` :
                          phase === "submitting" ? "Submitting..." :
                            "Confirm Parlay"}
              </h3>
              <p className="text-[10px] text-text-secondary font-medium">
                {isDone ? "Good luck!" : `${legs.length} legs • ${formatUSD(stake)} stake`}
              </p>
            </div>
          </div>
          {!isWorking && (
            <button onClick={handleClose} className="text-text-muted hover:text-text-primary p-2 hover:bg-surface-2 rounded-pill transition-colors">
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isWorking && (
          <div className="px-4 py-3 border-b border-border-default bg-primary/5 shrink-0">
            <div className="flex items-center gap-2.5 mb-2">
              <Loader2 size={14} className="text-primary animate-spin" />
              <span className="text-xs text-primary font-bold">
                {isDerivingKey ? "Creating API key (sign message in wallet)..." :
                  phase === "checking" ? "Verifying USDC balance on Polygon..." :
                    phase === "approving" ? (approvalStep || "Checking USDC allowances...") :
                      phase === "signing" ? `Sign order ${signedCount + 1} of ${legs.length} in your wallet` :
                        "Submitting orders to Polymarket CLOB..."}
              </span>
            </div>
            {phase === "signing" && (
              <div className="h-1.5 bg-surface-2 rounded-pill overflow-hidden">
                <div className="h-full bg-primary rounded-pill transition-all duration-300 ease-out"
                  style={{ width: `${(signedCount / legs.length) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Balance info */}
        {balanceInfo && (
          <div className={cn(
            "px-4 py-2 border-b border-border-default text-xs shrink-0 transition-colors",
            balanceInfo.bridged >= balanceInfo.required ? "bg-success-dim/30" : "bg-error-dim/30"
          )}>
            <div className="flex items-center justify-between">
              <span className={cn(
                "font-bold flex items-center gap-1.5",
                balanceInfo.bridged >= balanceInfo.required ? "text-success" : "text-error"
              )}>
                {balanceInfo.bridged >= balanceInfo.required ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                USDC Balance: ${balanceInfo.bridged.toFixed(2)}
              </span>
              <span className="text-text-secondary font-medium">
                Required: ${balanceInfo.required.toFixed(2)}
              </span>
            </div>

            {/* Native USDC Warning */}
            {balanceInfo.bridged < balanceInfo.required && balanceInfo.native > 0.5 && (
              <div className="mt-2 p-2.5 bg-warning-dim border border-warn/20 rounded-card">
                <p className="text-[10px] text-[#9A6300] font-bold mb-0.5 flex items-center gap-1.5">
                  <AlertTriangle size={10} /> Wrong USDC Token Type
                </p>
                <p className="text-[10px] text-[#9A6300]/80 leading-relaxed">
                  You have <b>${balanceInfo.native.toFixed(2)} Native USDC</b>, but Polymarket requires <b>Bridged USDC.e</b> on Polygon.
                </p>
                <a href="https://app.uniswap.org/swap?chain=polygon" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:text-primary-hover underline mt-1.5 flex items-center gap-1 font-medium">
                  Swap USDC → USDC.e on Uniswap <ArrowRight size={10} />
                </a>
              </div>
            )}

            {proxyWallet && (
              <p className="text-[9px] text-text-disabled mt-1 text-right font-mono">
                Proxy: {proxyWallet.slice(0, 6)}…{proxyWallet.slice(-4)}
              </p>
            )}
            {balanceInfo.bridged < balanceInfo.required && balanceInfo.bridged < 0.01 && !balanceInfo.native && (
              <p className="text-[9px] text-text-secondary mt-1 ml-4 italic">
                Funds in Polymarket exchange may not show here. We&apos;ll try to place the order.
              </p>
            )}
          </div>
        )}

        {/* Legs — scrollable with compact mode */}
        <div className={cn("overflow-y-auto px-4 py-3 bg-surface-1", isCompact ? "max-h-[240px]" : "max-h-[320px]")}>
          <div className={cn("space-y-2", isCompact && "space-y-1")}>
            {legs.map((leg, i) => {
              const status = legStatuses.find(l => l.legId === leg.id);
              const st = status?.status || "pending";
              const showStatus = phase !== "idle";

              return (
                <div key={leg.id} className={cn(
                  "flex items-center gap-3 rounded-card border transition-all shadow-sm",
                  isCompact ? "p-2" : "p-3",
                  st === "signed" ? "bg-success-dim/10 border-success/20" :
                    st === "signing" ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10" :
                      st === "error" ? "bg-error-dim/10 border-error/20" :
                        "bg-white border-border-default hover:border-primary/20"
                )}>
                  <span className={cn(
                    "rounded-pill font-bold flex items-center justify-center shrink-0 w-6 h-6",
                    st === "signed" ? "bg-success-dim text-success" :
                      st === "signing" ? "bg-primary/10 text-primary" :
                        st === "error" ? "bg-error-dim text-error" : "bg-surface-2 text-text-secondary text-xs"
                  )}>
                    {showStatus ? <StatusIcon status={st} /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-text-primary font-medium truncate", isCompact ? "text-[11px]" : "text-sm")}>{leg.question}</p>
                    {!isCompact && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-pill border",
                          leg.side === "YES" ? "bg-success-dim text-success border-success/20" : "bg-error-dim text-error border-error/20"
                        )}>{leg.side}</span>
                        <span className="text-[11px] font-mono font-bold text-text-secondary font-tabular">{formatPrice(leg.price)}</span>
                      </div>
                    )}
                  </div>
                  {isCompact && (
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-pill shrink-0 border",
                      leg.side === "YES" ? "bg-success-dim text-success border-success/20" : "bg-error-dim text-error border-error/20"
                    )}>{leg.side} {Math.round(leg.price * 100)}¢</span>
                  )}
                  {status?.error && !isCompact && (
                    <span className="text-[10px] text-error truncate max-w-[100px] flex items-center gap-1">
                      <AlertTriangle size={10} /> {status.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary + Actions — fixed at bottom */}
        <div className="border-t border-border-default px-4 py-4 space-y-4 shrink-0 bg-surface-1 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
          {/* Summary */}
          <div className="bg-surface-2/50 border border-border-default rounded-card p-3.5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Legs Count</span>
              <span className="font-mono text-text-primary font-tabular">{legs.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Combined Odds</span>
              <span className="font-mono font-bold text-primary font-tabular">{formatOdds(combinedOdds)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Total Stake</span>
              <span className="font-mono font-bold text-text-primary font-tabular">{formatUSD(stake)}</span>
            </div>
            <div className="border-t border-border-default my-1 opacity-50" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-text-primary">Potential Payout</span>
              <span className="font-mono font-extrabold text-success text-lg font-tabular">{formatUSD(potentialPayout)}</span>
            </div>
          </div>

          {/* Error with retry */}
          {error && (
            <div className="p-3 bg-error-dim border border-error/20 rounded-card flex items-start gap-2">
              <AlertTriangle size={16} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-error font-bold mb-0.5">Execution Error</p>
                <p className="text-[11px] text-error/80 leading-relaxed">{error}</p>
                {isError && (
                  <button onClick={handleRetry}
                    className="mt-2 text-[10px] font-bold text-error hover:text-white bg-error/10 hover:bg-error/20 px-3 py-1.5 rounded-pill transition-all flex items-center gap-1">
                    <ArrowRight size={10} /> Retry — {formatUSD(stake)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Enable Trading banner if no credentials */}
          {!hasCredentials && !isDerivingKey && (
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-card">
              <div className="flex items-center gap-2 mb-1">
                <FileSignature size={14} className="text-primary" />
                <p className="text-xs text-primary font-bold">Trading Not Enabled</p>
              </div>
              <p className="text-[11px] text-primary/80 leading-relaxed mb-3 pl-5">
                One-time setup: Sign a message to create your Polymarket API credentials. This allows placing orders.
              </p>
              <button onClick={handleEnableTrading}
                className="w-full text-xs font-bold text-white bg-primary hover:bg-primary-hover px-3 py-2.5 rounded-button transition-all shadow-md hover:shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2">
                Enable Trading (Sign Message) <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* CTA */}
          {isDone ? (
            <button onClick={handleClose} className="w-full bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-sm py-3.5 flex items-center justify-center gap-2 shadow-glow">
              <CheckCircle2 size={16} /> Done — Close Window
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={isError ? handleRetry : handleConfirm}
                disabled={isWorking}
                className={cn(
                  "w-full bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-sm py-3.5 flex items-center justify-center gap-2 transition-all",
                  (isWorking || !hasCredentials) && "opacity-50 cursor-not-allowed shadow-none grayscale"
                )}>
                {isDerivingKey ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating API key...</>
                ) : phase === "checking" ? (
                  <><Loader2 size={16} className="animate-spin" /> Checking balance...</>
                ) : phase === "approving" ? (
                  <><Loader2 size={16} className="animate-spin" /> Approving USDC...</>
                ) : phase === "signing" ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing ({signedCount}/{legs.length})...</>
                ) : phase === "submitting" ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting to CLOB...</>
                ) : isError ? (
                  <><ArrowRight size={16} /> Retry — {formatUSD(stake)}</>
                ) : !hasCredentials ? (
                  <>🔒 Enable Trading First</>
                ) : (
                  <><FileSignature size={16} /> Sign & Place Parlay — {formatUSD(stake)}</>
                )}
              </button>

              {!isWorking && !isError && (
                <button onClick={handleClose} className="w-full py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-button transition-all">
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
