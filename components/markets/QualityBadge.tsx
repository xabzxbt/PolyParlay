"use client";
import type { QualityResult } from "@/lib/quality-score";
import { ShieldCheck, AlertCircle, Skull } from "lucide-react";

interface QualityBadgeProps {
  quality: QualityResult;
  showScore?: boolean;
}

const TIER_CONFIG = {
  high: {
    label: "High Quality",
    Icon: ShieldCheck,
    bg: 'rgba(184,150,90,0.1)',
    border: 'rgba(184,150,90,0.25)',
    color: 'var(--accent-gold)',
  },
  mid: {
    label: "Medium",
    Icon: AlertCircle,
    bg: 'rgba(184,150,90,0.06)',
    border: 'rgba(184,150,90,0.15)',
    color: 'var(--accent-gold)',
  },
  low: {
    label: "Low",
    Icon: AlertCircle,
    bg: 'rgba(139,74,74,0.06)',
    border: 'rgba(139,74,74,0.15)',
    color: 'var(--accent-red)',
  },
  dead: {
    label: "Dead",
    Icon: Skull,
    bg: 'var(--bg-elevated)',
    border: 'var(--border-subtle)',
    color: 'var(--text-muted)',
  },
};

export default function QualityBadge({ quality, showScore = false }: QualityBadgeProps) {
  const cfg = TIER_CONFIG[quality.tier] || TIER_CONFIG.mid;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        color: cfg.color,
      }}
      title={`Quality: ${quality.score}/100`}
    >
      <cfg.Icon size={11} strokeWidth={2} />
      {showScore ? quality.score : cfg.label}
    </span>
  );
}
