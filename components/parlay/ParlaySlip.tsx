"use client";
import { useParlay } from "@/providers/ParlayProvider";
import { cn, formatPrice, formatUSD, formatOdds, formatROI, formatPercent } from "@/lib/utils";
import { getCorrelationWarnings, checkLiquidity } from "@/lib/parlay/calculator";
import ConfirmModal from "@/components/parlay/ConfirmModal";
import BridgeModal from "@/components/wallet/BridgeModal";
import { useShareParlay } from "@/hooks/useShare";
import { useToast } from "@/providers/ToastProvider";
import { useState } from "react";
import { Ticket, Trash2, X, AlertTriangle, Share2, Info, ArrowRight } from "lucide-react";

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
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--accent-mocha)', color: 'var(--text-inverse)', boxShadow: 'var(--shadow-mocha)' }}
        >
          <Ticket size={28} strokeWidth={1.5} />
        </div>
        <h3
          className="font-medium text-lg mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Build Your Parlay
        </h3>
        <p className="text-sm mb-6 max-w-[220px]" style={{ color: 'var(--text-secondary)' }}>
          Combine 2+ predictions. Every correct pick multiplies your payout.
        </p>

        {/* Example calculation — monospace, clean table */}
        <div
          className="p-4 rounded-xl w-full max-w-[260px]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p
            className="text-[11px] font-medium mb-3 text-left"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px' }}
          >
            Example calculation
          </p>
          <div className="space-y-2">
            {[
              { label: 'Stake', value: '$10.00' },
              { label: '3 picks × 50¢', value: '÷ 0.125' },
              { label: 'Payout', value: '$80.00', highlight: true },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: row.highlight ? 'var(--accent-green)' : 'var(--text-primary)' }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-2 pt-2 text-right text-[10px] font-semibold"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}
          >
            8× return
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }}
          >
            <Ticket size={15} strokeWidth={2} />
          </div>
          <span
            className="font-medium text-sm"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '15px' }}
          >
            Parlay Slip
          </span>
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold font-tabular"
            style={{ backgroundColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }}
          >
            {legs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isCompact && (
            <span
              className="text-[10px] mr-2 font-bold px-2 py-0.5 rounded-md"
              style={{
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {formatOdds(calculation.combinedOdds)}
            </span>
          )}
          <button
            onClick={clearAll}
            className="p-1.5 rounded-lg transition-colors"
            title="Clear all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-red)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139,74,74,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <Trash2 size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Legs — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {legs.map((leg, i) => (
          <div
            key={leg.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border group animate-scale-in transition-colors",
              isCompact ? "p-2" : "p-3"
            )}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              className={cn(
                "rounded-full font-bold flex items-center justify-center shrink-0 font-tabular",
                isCompact ? "w-5 h-5 text-[10px] mt-0.5" : "w-6 h-6 text-xs mt-0.5"
              )}
              style={{ backgroundColor: 'rgba(156,123,94,0.12)', color: 'var(--accent-mocha)' }}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn("font-medium leading-snug", isCompact ? "text-[11px] line-clamp-1" : "text-sm line-clamp-2 mb-1.5")}
                style={{ color: 'var(--text-primary)' }}
              >
                {leg.question}
              </p>
              {!isCompact && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: leg.side === "YES" ? 'rgba(74,124,89,0.1)' : 'rgba(139,74,74,0.1)',
                      color: leg.side === "YES" ? 'var(--accent-green)' : 'var(--accent-red)',
                      borderColor: leg.side === "YES" ? 'rgba(74,124,89,0.25)' : 'rgba(139,74,74,0.25)',
                    }}
                  >
                    {leg.side}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                  >
                    {formatPrice(leg.price)}
                  </span>
                </div>
              )}
            </div>
            {isCompact && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 border"
                style={{
                  backgroundColor: leg.side === "YES" ? 'rgba(74,124,89,0.1)' : 'rgba(139,74,74,0.1)',
                  color: leg.side === "YES" ? 'var(--accent-green)' : 'var(--accent-red)',
                  borderColor: leg.side === "YES" ? 'rgba(74,124,89,0.25)' : 'rgba(139,74,74,0.25)',
                }}
              >
                {leg.side} {Math.round(leg.price * 100)}¢
              </span>
            )}
            <button
              onClick={() => removeLeg(leg.id)}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-full transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-red)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139,74,74,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {unifiedWarnings.length > 0 && (
        <div className="px-3 pb-2 space-y-2 shrink-0">
          {unifiedWarnings.slice(0, 2).map((w, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-xl"
              style={{
                backgroundColor: w.level === "HIGH" ? 'rgba(139,74,74,0.08)' : 'rgba(184,150,90,0.08)',
                border: `1px solid ${w.level === "HIGH" ? 'rgba(139,74,74,0.2)' : 'rgba(184,150,90,0.2)'}`,
              }}
            >
              <AlertTriangle
                size={13}
                strokeWidth={2}
                className="shrink-0 mt-0.5"
                style={{ color: w.level === "HIGH" ? 'var(--accent-red)' : 'var(--accent-gold)' }}
              />
              <p
                className="text-[11px] font-medium leading-snug"
                style={{ color: w.level === "HIGH" ? 'var(--accent-red)' : 'var(--accent-gold)' }}
              >
                {w.message}
              </p>
            </div>
          ))}
          {unifiedWarnings.length > 2 && (
            <p
              className="text-[10px] text-center font-medium"
              style={{ color: 'var(--accent-gold)' }}
            >
              +{unifiedWarnings.length - 2} more warnings
            </p>
          )}
        </div>
      )}

      {/* Calculator — sticky bottom */}
      <div
        className="px-4 py-4 space-y-4 shrink-0"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Odds — monospace display */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Combined Odds</span>
            <span
              className="text-2xl font-extrabold font-tabular"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-mocha)' }}
            >
              {formatOdds(calculation.combinedOdds)}
            </span>
          </div>
          {/* Probability bar — mocha gradient fill */}
          <div className="prob-bar">
            <div
              className="prob-fill"
              style={{ width: `${Math.min(calculation.impliedProbability * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>Implied Prob</span>
            <span className="text-xs font-semibold font-tabular" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {formatPercent(calculation.impliedProbability)}
            </span>
          </div>
        </div>

        {/* Stake input */}
        <div className="space-y-2">
          <label
            htmlFor="parlay-stake"
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Stake Amount
          </label>
          <div className="relative group">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              $
            </span>
            <input
              id="parlay-stake"
              type="number"
              value={stake || ""}
              onChange={e => setStake(Number(e.target.value))}
              placeholder="0"
              min="5"
              step="1"
              className="w-full py-3 pl-7 pr-3 text-sm font-bold rounded-xl outline-none transition-all"
              style={{
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-mocha)'; }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
            />
          </div>
          <div className="flex gap-2">
            {QUICK_STAKES.map(a => (
              <button
                key={a}
                onClick={() => setStake(a)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                style={{
                  backgroundColor: stake === a ? 'var(--accent-mocha)' : 'var(--bg-base)',
                  borderColor: stake === a ? 'var(--accent-mocha)' : 'var(--border-default)',
                  color: stake === a ? 'var(--text-inverse)' : 'var(--text-secondary)',
                }}
              >
                ${a}
              </button>
            ))}
          </div>
        </div>

        {/* Payout */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px dashed var(--border-default)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Potential Payout</span>
          <div className="text-right">
            <span
              className="text-2xl font-extrabold font-tabular block"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}
            >
              {formatUSD(calculation.potentialPayout)}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--accent-green)', opacity: 0.8 }}
            >
              {formatROI(calculation.roi)} ROI
            </span>
          </div>
        </div>

        {/* Info */}
        <div
          className="flex items-start gap-2 p-2.5 rounded-xl"
          style={{
            backgroundColor: 'rgba(156,123,94,0.06)',
            border: '1px solid rgba(156,123,94,0.15)',
          }}
        >
          <Info size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--accent-mocha)' }} />
          <p className="text-[10px] font-medium leading-snug" style={{ color: 'var(--accent-mocha)' }}>
            Partial wins enabled — you keep winnings from resolved legs even if others are still pending.
          </p>
        </div>

        {/* CTA — accent-mocha fill */}
        <button
          disabled={legs.length < 2 || stake < 5 || isExecuting}
          onClick={() => setShowConfirm(true)}
          className="w-full px-4 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          style={{
            backgroundColor: (legs.length < 2 || stake < 5) ? 'var(--border-default)' : 'var(--accent-mocha)',
            color: (legs.length < 2 || stake < 5) ? 'var(--text-muted)' : 'var(--text-inverse)',
            boxShadow: (legs.length < 2 || stake < 5) ? 'none' : 'var(--shadow-mocha)',
            cursor: (legs.length < 2 || stake < 5) ? 'not-allowed' : 'pointer',
          }}
        >
          {isExecuting
            ? "Placing Order..."
            : legs.length < 2
              ? "Add at least 2 legs"
              : stake < 5
                ? "Min Stake $5"
                : <><Ticket size={17} strokeWidth={2} /> Place Parlay — {formatUSD(stake)}</>
          }
        </button>

        {legs.length >= 2 && (
          <button
            onClick={() => share(legs, stake, calculation.combinedOdds)}
            disabled={isSharing}
            className="w-full px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            {isSharing ? "Copying..." : <><Share2 size={13} /> Share Strategy</>}
          </button>
        )}
      </div>

      {showBridge && <BridgeModal isOpen={showBridge} onClose={() => setShowBridge(false)} defaultTab="deposit" />}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        legs={legs}
        stake={stake}
        combinedOdds={calculation.combinedOdds}
        potentialPayout={calculation.potentialPayout}
        onSuccess={clearAll}
        onInsufficientFunds={handleInsufficientFunds}
      />
    </div>
  );
}
