"use client";

interface SmartMoneyBadgeProps {
  count: number;
  sentiment?: "bullish" | "bearish" | "mixed" | "none";
  compact?: boolean;
}

const DOT_COLORS = {
  bullish: 'var(--accent-green)',
  bearish: 'var(--accent-red)',
  mixed: 'var(--accent-gold)',
  none: 'var(--accent-mocha)',
};

const BG_COLORS = {
  bullish: { bg: 'rgba(74,124,89,0.08)', border: 'rgba(74,124,89,0.2)', color: 'var(--accent-green)' },
  bearish: { bg: 'rgba(139,74,74,0.08)', border: 'rgba(139,74,74,0.2)', color: 'var(--accent-red)' },
  mixed: { bg: 'rgba(184,150,90,0.08)', border: 'rgba(184,150,90,0.2)', color: 'var(--accent-gold)' },
  none: { bg: 'rgba(156,123,94,0.08)', border: 'rgba(156,123,94,0.2)', color: 'var(--accent-mocha)' },
};

const LABELS = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  mixed: 'Mixed',
  none: '',
};

export default function SmartMoneyBadge({ count, sentiment = "none", compact = false }: SmartMoneyBadgeProps) {
  if (count <= 0) return null;

  const cfg = BG_COLORS[sentiment];
  const label = LABELS[sentiment];
  const dotColor = DOT_COLORS[sentiment];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold"
        style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.color }}
        title={`${count} smart money trader${count !== 1 ? "s" : ""} ${label ? "— " + label : ""}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        {count}
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <span>{count} Smart</span>
      {label && <span style={{ opacity: 0.7 }}>· {label}</span>}
    </div>
  );
}
