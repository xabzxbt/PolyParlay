"use client";
import { useParlay } from "@/providers/ParlayProvider";
import { cn, formatPrice, formatUSD, formatOdds, formatROI, formatPercent } from "@/lib/utils";
import { getCorrelationWarnings, checkLiquidity } from "@/lib/parlay/calculator";
import ConfirmModal from "@/components/parlay/ConfirmModal";
import BridgeModal from "@/components/wallet/BridgeModal";
import { useShareParlay } from "@/hooks/useShare";
import { useToast } from "@/providers/ToastProvider";
import { useState } from "react";
import { Ticket, Trash2, X, AlertTriangle, Share2, Info, ArrowRight, CheckCircle2 } from "lucide-react";

const QUICK_STAKES = [10, 25, 50, 100];

export default function ParlaySlip() {
  const { state, removeLeg, clearAll, setStake } = useParlay();
  const { legs, stake, calculation, isExecuting } = state;
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const { share, isSharing } = useShareParlay();
  const { toast } = useToast();

  const handleInsufficientFunds = (required: number, available: number) => {
    toast("warning", `You need $${required.toFixed(2)} USDC.e to place this order (Have: $${available.toFixed(2)})`);
    setShowBridge(true);
  };

  const unifiedWarnings = [
    ...getCorrelationWarnings(legs).map(w => ({ message: w.message, type: "correlation", level: w.level })),
    ...legs.map(l => checkLiquidity(l, calculation.stakePerLeg)).filter(r => r.warning).map(r => ({ message: r.warning!, type: "liquidity", level: "MEDIUM" })),
  ];

  const isCompact = legs.length > 4;

  if (legs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
        <div className="w-14 h-14 rounded-modal bg-gradient-primary flex items-center justify-center text-white mb-3 shadow-glow">
          <Ticket size={28} strokeWidth={1.5} />
        </div>
        <h3 className="font-bold text-text-primary text-base mb-1">Build Your Parlay</h3>
        <p className="text-xs text-text-secondary max-w-[240px] mb-4">Combine 2+ predictions. Every correct pick multiplies your payout.</p>
        <div className="p-3 bg-surface-2 rounded-card border border-border-default w-full max-w-[260px] shadow-sm">
          <p className="text-[11px] text-text-secondary mb-2">Example: 3 picks at 50¢ each</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary font-medium">$10 bet</span>
            <span className="text-sm font-mono font-bold text-success">→ $80 win</span>
          </div>
          <div className="text-[10px] text-success/80 text-right font-medium">8x return</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-1/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm">
            <Ticket size={16} className="text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-sm text-text-primary">Parlay Slip</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-pill bg-primary text-white text-[10px] font-bold font-tabular shadow-sm">{legs.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {isCompact && (
            <span className="text-[10px] text-text-secondary mr-2 font-mono font-bold bg-surface-2 px-1.5 py-0.5 rounded-md border border-border-default">
              {formatOdds(calculation.combinedOdds)}
            </span>
          )}
          <button onClick={clearAll} className="text-text-muted hover:text-error transition-colors p-1.5 hover:bg-error-dim rounded-md" title="Clear all">
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Legs — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {legs.map((leg, i) => (
          <div key={leg.id} className={cn(
            "flex items-start gap-3 bg-surface-1 border border-border-default rounded-card group animate-scale-in shadow-sm hover:border-primary/30 transition-colors",
            isCompact ? "p-2" : "p-3"
          )}>
            <span className={cn(
              "rounded-pill bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 font-tabular",
              isCompact ? "w-5 h-5 text-[10px] mt-0.5" : "w-6 h-6 text-xs mt-0.5"
            )}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-text-primary font-medium leading-snug", isCompact ? "text-[11px] line-clamp-1" : "text-sm line-clamp-2 mb-1.5")}>{leg.question}</p>
              {!isCompact && (
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-pill border",
                    leg.side === "YES" ? "bg-success-dim text-success border-success/20" : "bg-error-dim text-error border-error/20"
                  )}>{leg.side}</span>
                  <span className="text-xs font-mono font-bold text-text-secondary">{formatPrice(leg.price)}</span>
                </div>
              )}
            </div>
            {isCompact && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-pill shrink-0 mt-0.5 border",
                leg.side === "YES" ? "bg-success-dim text-success border-success/20" : "bg-error-dim text-error border-error/20"
              )}>{leg.side} {Math.round(leg.price * 100)}¢</span>
            )}
            <button onClick={() => removeLeg(leg.id)} className="text-text-muted hover:text-error transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-1 hover:bg-error-dim rounded-pill">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {unifiedWarnings.length > 0 && (
        <div className="px-3 pb-2 space-y-2 shrink-0">
          {unifiedWarnings.slice(0, 2).map((w, idx) => (
            <div key={idx} className={cn(
              "flex items-start gap-2 p-2.5 border rounded-card",
              w.level === "HIGH" ? "bg-red-500/10 border-red-500/20" : "bg-warning-dim border-warn/20"
            )}>
              <AlertTriangle size={14} className={w.level === "HIGH" ? "text-red-500 shrink-0 mt-0.5" : "text-warning shrink-0 mt-0.5"} strokeWidth={2} />
              <p className={cn(
                "text-[11px] font-medium leading-snug",
                w.level === "HIGH" ? "text-red-700" : "text-[#9A6300]"
              )}>{w.message}</p>
            </div>
          ))}
          {unifiedWarnings.length > 2 && (
            <p className="text-[10px] text-warning/80 text-center font-medium">+{unifiedWarnings.length - 2} more warnings</p>
          )}
        </div>
      )}

      {/* Calculator — sticky bottom */}
      <div className="border-t border-border-default px-4 py-4 space-y-4 bg-surface-1 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        {/* Odds */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Combined Odds</span>
          <span className="text-xl font-mono font-extrabold text-primary font-tabular">{formatOdds(calculation.combinedOdds)}</span>
        </div>
        <div className="flex items-center justify-between -mt-2">
          <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Implied Prob</span>
          <span className="text-xs font-mono text-text-secondary font-tabular">{formatPercent(calculation.impliedProbability)}</span>
        </div>

        {/* Stake input */}
        <div className="space-y-2">
          <label htmlFor="parlay-stake" className="text-xs text-text-secondary font-bold uppercase tracking-wider">Stake Amount</label>
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-mono text-sm group-focus-within:text-primary transition-colors">$</span>
            <input id="parlay-stake" type="number" value={stake || ""} onChange={e => setStake(Number(e.target.value))} placeholder="0"
              min="5" step="1"
              className="w-full bg-white border border-border-default rounded-input py-3 pl-7 pr-3 text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted shadow-sm" />
          </div>
          <div className="flex gap-2">
            {QUICK_STAKES.map(a => (
              <button key={a} onClick={() => setStake(a)}
                className={cn("flex-1 py-1.5 rounded-button text-xs font-semibold transition-all border",
                  stake === a
                    ? "bg-primary text-white border-primary shadow-sm scale-105"
                    : "bg-surface-1 border-border-default text-text-secondary hover:border-primary/50 hover:text-primary"
                )}>${a}</button>
            ))}
          </div>
        </div>

        {/* Payout */}
        <div className="flex items-center justify-between pt-3 border-t border-border-default border-dashed">
          <span className="text-sm font-bold text-text-primary">Potential Payout</span>
          <div className="text-right">
            <span className="text-xl font-mono font-extrabold text-success font-tabular block">{formatUSD(calculation.potentialPayout)}</span>
            <span className="text-[10px] font-bold text-success/80 uppercase tracking-wider">{formatROI(calculation.roi)} ROI</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/10 rounded-card">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-primary font-medium leading-snug">Partial wins enabled — you keep winnings from resolved legs even if others are still pending.</p>
        </div>

        {/* CTA */}
        <button disabled={legs.length < 2 || stake < 5 || isExecuting}
          onClick={() => setShowConfirm(true)}
          className={cn("w-full bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-sm py-3.5 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all",
            (legs.length < 2 || stake < 5) && "opacity-50 cursor-not-allowed shadow-none grayscale"
          )}>
          {isExecuting ? "Placing Order..." : legs.length < 2 ? "Add at least 2 legs" : stake < 5 ? "Min Stake $5" : <><Ticket size={18} strokeWidth={2.5} /> Place Parlay — {formatUSD(stake)}</>}
        </button>

        {legs.length >= 2 && (
          <button onClick={() => share(legs, stake, calculation.combinedOdds)} disabled={isSharing}
            className="w-full bg-surface-3 text-text-primary px-4 py-2 rounded-button font-medium hover:bg-surface-3/80 shadow-sm transition-colors text-xs py-2.5 flex items-center justify-center gap-2">
            {isSharing ? "Copying..." : <><Share2 size={14} /> Share Strategy</>}
          </button>
        )}
      </div>

      {showBridge && <BridgeModal isOpen={showBridge} onClose={() => setShowBridge(false)} defaultTab="deposit" />}

      <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)}
        legs={legs} stake={stake} combinedOdds={calculation.combinedOdds}
        potentialPayout={calculation.potentialPayout} onSuccess={clearAll} onInsufficientFunds={handleInsufficientFunds} />
    </div>
  );
}
