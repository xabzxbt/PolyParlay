"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { cn, formatVolume, getLiquidityLevel, timeUntil } from "@/lib/utils";
import { useMarket } from "@/hooks/useMarketData";
import { useParlay } from "@/providers/ParlayProvider";
import CommentsSection from "@/components/markets/CommentsSection";
import MarketDepthAnalysis from "@/components/analytics/arkham/MarketDepth";
import PriceProbability from "@/components/analytics/arkham/PriceProbability";
import WhaleFeed from "@/components/analytics/WhaleFeed";
import EdgeScoreCard from "@/components/analytics/EdgeScoreCard";
import OnChainAnalytics from "@/components/analytics/arkham/OnChainAnalytics";
import { useWhaleActivity } from "@/hooks/useWhaleActivity";
import { useEdgeScore } from "@/hooks/useEdgeScore";
import { ChevronLeft, BarChart2, Activity, MessageSquare, Waves } from "lucide-react";

type Tab = "analytics" | "onchain" | "whales" | "comments";

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { market, isLoading } = useMarket(id);
  const { addLeg, removeLeg, getMarketSide } = useParlay();
  const side = market ? getMarketSide(market.id) : null;
  const [activeTab, setActiveTab] = useState<Tab>("analytics");

  const { trades: allWhaleTrades, isLoading: whalesLoading } = useWhaleActivity({ period: "24h", minSize: 1000 });
  // Match whale trades by ALL possible market IDs (conditionId, yesTokenId, or numeric id)
  const marketWhaleTrades = useMemo(() => {
    if (!market) return [];
    const ids = new Set([
      market.id,
      market.conditionId,
      market.yesTokenId,
      market.noTokenId,
    ].filter(Boolean));
    const specific = allWhaleTrades.filter(t => ids.has(t.marketId));
    // If no market-specific trades, show recent global trades
    return specific.length > 0 ? specific : allWhaleTrades.slice(0, 20);
  }, [allWhaleTrades, market]);
  const isMarketSpecific = useMemo(() => {
    if (!market) return false;
    const ids = new Set([market.id, market.conditionId, market.yesTokenId, market.noTokenId].filter(Boolean));
    return allWhaleTrades.some(t => ids.has(t.marketId));
  }, [allWhaleTrades, market]);

  const { marketsWithEdge, isLoading: edgeLoading } = useEdgeScore();
  const marketEdge = useMemo(() => {
    if (!market) return null;
    return marketsWithEdge.find(m => m.id === market.id);
  }, [marketsWithEdge, market]);

  const handleAdd = (s: "YES" | "NO") => {
    if (!market) return;
    const legId = `${market.id}-${s}`;
    if (side === s) { removeLeg(legId); return; }
    addLeg({
      id: legId, marketId: market.id,
      tokenId: s === "YES" ? market.yesTokenId : market.noTokenId,
      question: market.question, outcome: s,
      price: s === "YES" ? market.yesPrice : market.noPrice,
      side: s, category: market.category || "other",
      endDate: market.endDate, liquidity: market.liquidity,
    });
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        <div className="shimmer" style={{ height: '20px', width: '160px', marginBottom: '16px', borderRadius: '6px' }} />
        <div className="shimmer" style={{ height: '56px', width: '100%', marginBottom: '12px', borderRadius: '10px' }} />
        <div className="shimmer" style={{ height: '36px', width: '100%', marginBottom: '16px', borderRadius: '8px' }} />
        <div className="shimmer" style={{ height: '280px', width: '100%', borderRadius: '12px' }} />
      </div>
    );
  }

  if (!market) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Market not found</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>This market doesn&apos;t exist or has been closed.</p>
        <button onClick={() => router.push("/")} className="btn-primary" style={{ fontSize: '13px', padding: '8px 20px' }}>Back to Markets</button>
      </div>
    );
  }

  const yesPrice = market.yesPrice || 0.5;
  const noPrice = market.noPrice || 0.5;
  const yp = Math.round(yesPrice * 100);
  const np = 100 - yp;
  const liq = getLiquidityLevel(market.liquidity);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Charts", icon: <BarChart2 size={13} /> },
    { id: "onchain", label: "On-Chain", icon: <Activity size={13} /> },
    { id: "whales", label: "Whales", icon: <Waves size={13} /> },
    { id: "comments", label: "Comments", icon: <MessageSquare size={13} /> },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>

      {/* Breadcrumb */}
      <button
        onClick={() => router.push("/")}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <ChevronLeft size={13} />
        Markets
      </button>

      {/* Market Header Card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          marginBottom: '10px',
        }}>
          {market.question}
        </h1>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: liq === 'high' ? 'var(--accent-green)' : liq === 'mid' ? 'var(--accent-gold)' : 'var(--accent-red)',
              display: 'inline-block',
            }} />
            {formatVolume(market.liquidity)} Liq
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vol: {formatVolume(market.volume)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeUntil(new Date(market.endDate))}</span>
          {market.category && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {market.category}
            </span>
          )}
        </div>

        {/* YES / NO buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleAdd("YES")}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 200ms',
              backgroundColor: side === "YES" ? '#166534' : 'var(--accent-green)',
              color: '#fff',
              boxShadow: side === "YES" ? '0 0 0 2px #166534, 0 2px 8px rgba(21,128,61,0.3)' : '0 1px 4px rgba(21,128,61,0.25)',
            }}
          >
            <span>YES</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800 }}>{yp}¢</span>
          </button>
          <button
            onClick={() => handleAdd("NO")}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 200ms',
              backgroundColor: side === "NO" ? '#991b1b' : 'var(--accent-red)',
              color: '#fff',
              boxShadow: side === "NO" ? '0 0 0 2px #991b1b, 0 2px 8px rgba(185,28,28,0.3)' : '0 1px 4px rgba(185,28,28,0.25)',
            }}
          >
            <span>NO</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800 }}>{np}¢</span>
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '12px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '7px 8px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 200ms',
              backgroundColor: activeTab === tab.id ? 'var(--text-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-inverse)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>

        {/* ── CHARTS TAB ── */}
        {activeTab === "analytics" && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            <div style={{ minHeight: '260px' }}>
              {/* CLOB API needs YES token ID for price history */}
              <PriceProbability tokenId={market.yesTokenId} marketId={market.conditionId || market.id} />
            </div>
            <div style={{ minHeight: '260px' }}>
              <MarketDepthAnalysis tokenId={market.yesTokenId} marketId={market.conditionId || market.id} />
            </div>
            {/* Edge Score inline if available */}
            {!edgeLoading && marketEdge && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Opportunity Score
                </div>
                <EdgeScoreCard market={marketEdge as any} showDetails />
              </div>
            )}
          </div>
        )}

        {/* ── ON-CHAIN TAB ── */}
        {activeTab === "onchain" && (
          <OnChainAnalytics market={market} />
        )}

        {/* ── WHALES TAB ── */}
        {activeTab === "whales" && (
          <div>
            {!isMarketSpecific && !whalesLoading && marketWhaleTrades.length > 0 && (
              <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 14px',
                marginBottom: '10px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>
                🌊 No whale trades specific to this market in 24h — showing <strong>global whale feed</strong> instead
              </div>
            )}
            <WhaleFeed trades={marketWhaleTrades} isLoading={whalesLoading} />
          </div>
        )}

        {/* ── COMMENTS TAB ── */}
        {activeTab === "comments" && (
          <CommentsSection
            marketId={market.id}
            yesToken={market.yesTokenId}
            noToken={market.noTokenId}
            yesPrice={yesPrice}
          />
        )}
      </div>
    </div>
  );
}
