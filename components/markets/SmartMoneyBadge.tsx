"use client";
import { cn } from "@/lib/utils";

interface SmartMoneyBadgeProps {
  count: number;
  sentiment?: "bullish" | "bearish" | "mixed" | "none";
  compact?: boolean;
}

export default function SmartMoneyBadge({ count, sentiment = "none", compact = false }: SmartMoneyBadgeProps) {
  if (count <= 0) return null;

  const sentimentConfig = {
    bullish: { icon: "🟢", label: "Bullish", color: "text-success bg-success-dim border-success/20" },
    bearish: { icon: "🔴", label: "Bearish", color: "text-error bg-error-dim border-error/20" },
    mixed:   { icon: "🟡", label: "Mixed", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    none:    { icon: "💎", label: "", color: "text-primary bg-primary-dim border-primary/20" },
  };

  const cfg = sentimentConfig[sentiment];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-pill border text-[9px] font-bold", cfg.color)}
        title={`${count} smart money trader${count !== 1 ? "s" : ""} ${cfg.label ? "— " + cfg.label : ""}`}>
        {cfg.icon} {count}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-button border text-[10px] font-medium", cfg.color)}>
      <span>{cfg.icon}</span>
      <span>{count} Smart</span>
      {cfg.label && <span className="opacity-70">• {cfg.label}</span>}
    </div>
  );
}
