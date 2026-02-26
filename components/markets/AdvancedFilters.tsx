"use client";
import { useState, useRef, useEffect } from "react";
import { countActiveFilters, type FilterState } from "@/lib/filters";

const LIQUIDITY_TIERS = [
  { id: "all" as const, label: "All", dot: null },
  { id: "high" as const, label: "High", dot: 'var(--accent-green)' },
  { id: "mid" as const, label: "Medium", dot: 'var(--accent-gold)' },
  { id: "low" as const, label: "Low", dot: 'var(--accent-red)' },
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
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all whitespace-nowrap"
        style={{
          backgroundColor: (open || activeCount > 0) ? 'rgba(156,123,94,0.1)' : 'var(--bg-surface)',
          borderColor: (open || activeCount > 0) ? 'rgba(156,123,94,0.3)' : 'var(--border-default)',
          color: (open || activeCount > 0) ? 'var(--accent-mocha)' : 'var(--text-muted)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 3H11M3 6H9M5 9H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span
            className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 rounded-xl shadow-elevated z-50 w-[280px] animate-scale-in overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Advanced Filters
            </span>
            {activeCount > 0 && (
              <button
                onClick={onReset}
                className="text-[10px] font-medium transition-colors"
                style={{ color: 'var(--accent-mocha)' }}
              >
                Reset all
              </button>
            )}
          </div>

          <div className="p-3 space-y-3.5">
            <ToggleRow
              label="Hide low liquidity"
              description="< $1,000"
              checked={filters.hideLowLiquidity}
              onChange={(v) => onChange("hideLowLiquidity", v)}
            />
            <ToggleRow
              label="Hide low volume"
              description="< $100 24h"
              checked={filters.hideLowVolume}
              onChange={(v) => onChange("hideLowVolume", v)}
            />
            <ToggleRow
              label="Multi-market only"
              description="Events with 2+ markets"
              checked={filters.onlyMultiMarket}
              onChange={(v) => onChange("onlyMultiMarket", v)}
            />
            <ToggleRow
              label="Smart Money active"
              description="Only events with whale traders"
              checked={filters.smartMoneyOnly}
              onChange={(v) => onChange("smartMoneyOnly", v)}
            />

            {/* Liquidity tier */}
            <div>
              <span
                className="text-[10px] font-medium block mb-1.5 uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                Liquidity tier
              </span>
              <div className="flex gap-1">
                {LIQUIDITY_TIERS.map((tier) => {
                  const isActive = filters.liquidityTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => onChange("liquidityTier", tier.id)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all text-center flex items-center justify-center gap-1"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-mocha)' : 'var(--bg-elevated)',
                        border: isActive ? 'none' : '1px solid var(--border-default)',
                        color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                      }}
                    >
                      {tier.dot && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isActive ? 'var(--text-inverse)' : tier.dot }}
                        />
                      )}
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Min quality score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[10px] font-medium uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Min quality score
                </span>
                <span
                  className="text-[10px] font-bold font-tabular"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  {filters.minQualityScore > 0 ? filters.minQualityScore : "Off"}
                </span>
              </div>
              <div className="flex gap-1">
                {QUALITY_LEVELS.map((lvl) => {
                  const isActive = filters.minQualityScore === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      onClick={() => onChange("minQualityScore", lvl.value)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all text-center"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-mocha)' : 'var(--bg-elevated)',
                        border: isActive ? 'none' : '1px solid var(--border-default)',
                        color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                      }}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full group"
    >
      <div>
        <span className="text-xs block transition-colors" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
          {description}
        </span>
      </div>
      {/* Toggle pill */}
      <div
        className="w-8 h-[18px] rounded-full relative transition-all"
        style={{ backgroundColor: checked ? 'var(--accent-mocha)' : 'var(--bg-elevated)', border: `1px solid ${checked ? 'var(--accent-mocha)' : 'var(--border-default)'}` }}
      >
        <div
          className="absolute top-[2px] w-3 h-3 rounded-full bg-white shadow-sm transition-all"
          style={{ left: checked ? '14px' : '2px' }}
        />
      </div>
    </button>
  );
}
