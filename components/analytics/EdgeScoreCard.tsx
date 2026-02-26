"use client";

import React, { memo, useState } from "react";
import { Zap, TrendingUp, TrendingDown, Clock, DollarSign, Info } from "lucide-react";
import { EdgeScoreResult } from "@/lib/analytics/edge-score";
import { formatUSD, timeUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface EdgeScoreCardProps {
  market: {
    id: string;
    question: string;
    slug?: string;
    yesPrice: number;
    volume24hr: number;
    endDate: string;
    edgeScore: EdgeScoreResult;
  };
  showDetails?: boolean;
  onClick?: () => void;
}

const ratingConfig = {
  LOW: { bg: "bg-slate-500/10", text: "text-text-muted", border: "#e5e7eb", label: "Low", accent: "#94a3b8" },
  MEDIUM: { bg: "bg-yellow-500/10", text: "text-yellow-600", border: "#fef08a", label: "Medium", accent: "#ca8a04" },
  HIGH: { bg: "bg-orange-500/10", text: "text-orange-600", border: "#fed7aa", label: "High", accent: "#ea580c" },
  HOT: { bg: "bg-red-500/10", text: "text-red-600", border: "#fecaca", label: "HOT 🔥", accent: "#dc2626" },
};

const breakdownMeta = [
  {
    key: "priceEdge" as const,
    label: "Edge",
    max: 25,
    color: "#3b82f6",
    tooltip: "Price Edge (0-25) — How far the true probability deviates from market price. Higher = potential mispricing = more opportunity.",
  },
  {
    key: "liquidity" as const,
    label: "Liq",
    max: 20,
    color: "#8b5cf6",
    tooltip: "Liquidity Score (0-20) — Based on available trading liquidity. More liquidity = easier to enter/exit positions without slippage.",
  },
  {
    key: "whaleSignal" as const,
    label: "Whale",
    max: 20,
    color: "#10b981",
    tooltip: "Whale Signal (0-20) — Confidence based on large trader positioning. High smart money on one side = stronger signal.",
  },
  {
    key: "timing" as const,
    label: "Time",
    max: 20,
    color: "#f59e0b",
    tooltip: "Timing Score (0-20) — Optimal time-to-expiry window. Markets too far or too close to expiry have lower timing scores.",
  },
  {
    key: "volumeMomentum" as const,
    label: "Vol",
    max: 15,
    color: "#ec4899",
    tooltip: "Volume Momentum (0-15) — Recent trading activity relative to average. High momentum = strong market interest.",
  },
];

function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Info
        size={11}
        style={{ cursor: 'help', color: 'var(--text-muted)', flexShrink: 0 }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: '120%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#111',
          color: '#f8fafc',
          fontSize: '10px',
          lineHeight: 1.4,
          padding: '6px 10px',
          borderRadius: '6px',
          width: '200px',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          textAlign: 'left',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

export const EdgeScoreCard = memo(function EdgeScoreCard({
  market,
  showDetails = false,
  onClick,
}: EdgeScoreCardProps) {
  const { edgeScore, question, yesPrice, volume24hr, endDate } = market;
  const config = ratingConfig[edgeScore.rating.toUpperCase() as keyof typeof ratingConfig] || ratingConfig.LOW;

  const truncatedQuestion = question.length > 70 ? question.substring(0, 70) + "…" : question;
  const timeRemaining = endDate ? timeUntil(new Date(endDate)) : "N/A";

  return (
    <div
      style={{
        position: 'relative',
        padding: '16px',
        borderRadius: '10px',
        border: `1px solid ${config.border}`,
        backgroundColor: '#fff',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>{truncatedQuestion}</h4>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '3px 8px', borderRadius: '6px',
          backgroundColor: config.accent + '18',
          flexShrink: 0,
        }}>
          {edgeScore.rating === "HOT" && <Zap size={11} style={{ color: config.accent }} />}
          <span style={{ fontSize: '15px', fontWeight: 800, color: config.accent, fontFamily: 'var(--font-mono)' }}>
            {edgeScore.total}
          </span>
        </div>
      </div>

      {/* Direction + Rating */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {edgeScore.recommendedDirection === "YES"
            ? <TrendingUp size={16} style={{ color: '#16a34a' }} />
            : <TrendingDown size={16} style={{ color: '#dc2626' }} />
          }
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: edgeScore.recommendedDirection === "YES" ? '#16a34a' : '#dc2626',
          }}>
            {edgeScore.recommendedDirection}
          </span>
          <Tooltip text={`Recommended direction based on edge analysis. ${edgeScore.recommendedDirection === 'YES' ? 'Market may be underpriced' : 'Market may be overpriced'} relative to true probability.`} />
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px',
          borderRadius: '4px', backgroundColor: config.accent + '18',
          color: config.accent, letterSpacing: '0.04em',
        }}>
          {config.label}
        </span>
      </div>

      {/* Details */}
      {showDetails && (
        <>
          {/* Key stats grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px', marginBottom: '14px',
            padding: '10px', borderRadius: '8px',
            backgroundColor: 'var(--bg-elevated)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>YES Price</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{(yesPrice * 100).toFixed(1)}%</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>24h Vol</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatUSD(volume24hr)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Closes</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{timeRemaining}</div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: '10px',
            }}>
              SCORE BREAKDOWN
              <Tooltip text="Each component contributes to the total Opportunity Score (max 100). Higher scores identify markets with better risk-adjusted trade opportunities." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {breakdownMeta.map(({ key, label, max, color, tooltip }) => {
                const val = edgeScore.breakdown[key] ?? 0;
                const pct = Math.min(100, Math.round((val / max) * 100));
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span>{label}</span>
                        <Tooltip text={tooltip} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                        {val.toFixed(0)}/{max}
                      </span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: color,
                        borderRadius: '3px',
                        transition: 'width 600ms ease-out',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total score ring */}
            <div style={{
              marginTop: '12px',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: config.accent + '0d',
              border: `1px solid ${config.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>TOTAL SCORE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: config.accent, fontFamily: 'var(--font-mono)' }}>{edgeScore.total}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              {edgeScore.kellyOptimal > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>KELLY SIZE</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#d97706' }}>{formatUSD(edgeScore.kellyOptimal)}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Optimal bet size</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default EdgeScoreCard;
