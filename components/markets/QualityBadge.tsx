"use client";
import { cn } from "@/lib/utils";
import type { QualityResult } from "@/lib/quality-score";

interface QualityBadgeProps {
  quality: QualityResult;
  showScore?: boolean;
}

import { ShieldCheck, AlertCircle, Skull } from "lucide-react";

const TIER_CONFIG = {
  high: { label: "High Quality", Icon: ShieldCheck, color: "text-[#2E5CFF] bg-[#2E5CFF]/10 border-[#2E5CFF]/20" },
  mid: { label: "Medium", Icon: AlertCircle, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  low: { label: "Low", Icon: AlertCircle, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  dead: { label: "Dead", Icon: Skull, color: "text-text-muted bg-surface-3 border-border-default" },
};

export default function QualityBadge({ quality, showScore = false }: QualityBadgeProps) {
  const cfg = TIER_CONFIG[quality.tier] || TIER_CONFIG.mid;

  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-bold uppercase tracking-wide", cfg.color)}
      title={`Quality: ${quality.score}/100`}
    >
      <cfg.Icon size={12} strokeWidth={2.5} />
      {showScore ? quality.score : cfg.label}
    </span>
  );
}
