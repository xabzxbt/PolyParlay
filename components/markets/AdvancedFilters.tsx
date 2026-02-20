"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { countActiveFilters, type FilterState } from "@/lib/filters";

const LIQUIDITY_TIERS = [
  { id: "all" as const, label: "All" },
  { id: "high" as const, label: "High", color: "bg-success" },
  { id: "mid" as const, label: "Medium", color: "bg-yellow-400" },
  { id: "low" as const, label: "Low", color: "bg-error" },
];

const QUALITY_LEVELS = [
  { value: 0, label: "Off" },
  { value: 40, label: "40+" },
  { value: 60, label: "60+" },
  { value: 80, label: "80+" },
];

interface Props {
  filters: FilterState;
  onChange: (key: keyof FilterState, value: any) => void;
  onReset: () => void;
}

export default function AdvancedFilters({ filters, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = countActiveFilters(filters);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-button border text-xs font-medium transition-all whitespace-nowrap",
          open || activeCount > 0
            ? "bg-primary-dim border-primary/20 text-primary"
            : "bg-surface-2 border-border-default text-text-muted hover:border-border-default-hover"
        )}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 3H11M3 6H9M5 9H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-pill bg-primary text-white text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-border-default rounded-button shadow-elevated z-50 w-[280px] animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
            <span className="text-xs font-semibold text-text-primary">Advanced Filters</span>
            {activeCount > 0 && (
              <button onClick={onReset} className="text-[10px] text-primary hover:underline">
                Reset all
              </button>
            )}
          </div>

          <div className="p-3 space-y-3">
            {/* Toggle: Hide Low Liquidity */}
            <ToggleRow
              label="Hide low liquidity"
              description="< $1,000"
              checked={filters.hideLowLiquidity}
              onChange={(v) => onChange("hideLowLiquidity", v)}
            />

            {/* Toggle: Hide Low Volume */}
            <ToggleRow
              label="Hide low volume"
              description="< $100 24h"
              checked={filters.hideLowVolume}
              onChange={(v) => onChange("hideLowVolume", v)}
            />

            {/* Toggle: Multi-market events only */}
            <ToggleRow
              label="Multi-market only"
              description="Events with 2+ markets"
              checked={filters.onlyMultiMarket}
              onChange={(v) => onChange("onlyMultiMarket", v)}
            />

            {/* Phase 3: Smart Money toggle */}
            <ToggleRow
              label="Smart Money active"
              description="Only events with whale traders"
              checked={filters.smartMoneyOnly}
              onChange={(v) => onChange("smartMoneyOnly", v)}
            />

            {/* Liquidity tier selector */}
            <div>
              <span className="text-[10px] text-text-muted font-medium block mb-1.5">Liquidity tier</span>
              <div className="flex gap-1">
                {LIQUIDITY_TIERS.map((tier) => (
                  <button key={tier.id}
                    onClick={() => onChange("liquidityTier", tier.id)}
                    className={cn(
                      "flex-1 py-1.5 rounded-button text-[10px] font-semibold transition-all text-center flex items-center justify-center gap-1",
                      filters.liquidityTier === tier.id
                        ? "bg-primary text-white"
                        : "bg-surface-1 border border-border-default text-text-muted hover:text-text-secondary"
                    )}>
                    {tier.color && <span className={cn("w-1.5 h-1.5 rounded-pill", tier.color)} />}
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 3: Quality score minimum */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-text-muted font-medium">Min quality score</span>
                <span className="text-[10px] font-bold text-text-primary font-tabular">
                  {filters.minQualityScore > 0 ? filters.minQualityScore : "Off"}
                </span>
              </div>
              <div className="flex gap-1">
                {QUALITY_LEVELS.map((lvl) => (
                  <button key={lvl.value}
                    onClick={() => onChange("minQualityScore", lvl.value)}
                    className={cn(
                      "flex-1 py-1.5 rounded-button text-[10px] font-semibold transition-all text-center",
                      filters.minQualityScore === lvl.value
                        ? "bg-primary text-white"
                        : "bg-surface-1 border border-border-default text-text-muted hover:text-text-secondary"
                    )}>
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable toggle row
function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full group">
      <div>
        <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
        <span className="text-[10px] text-text-muted block">{description}</span>
      </div>
      <div className={cn(
        "w-8 h-[18px] rounded-pill transition-all relative",
        checked ? "bg-primary" : "bg-surface-2"
      )}>
        <div className={cn(
          "absolute top-[2px] w-[14px] h-[14px] rounded-pill bg-white transition-all shadow-sm",
          checked ? "left-[15px]" : "left-[2px]"
        )} />
      </div>
    </button>
  );
}
