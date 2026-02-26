"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Comment {
  id: string;
  user_address?: string;
  address?: string;
  text?: string;
  comment?: string;
  created_at?: string;
  timestamp?: string;
  side?: "YES" | "NO";
  positionValue?: number;
}

interface CommentsSectionProps {
  marketId: string;
  yesToken?: string;
  noToken?: string;
  yesPrice?: number;
}

function Avatar({ address }: { address: string }) {
  const color = `hsl(${parseInt(address.slice(2, 6), 16) % 360}, 60%, 45%)`;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: '10px', fontWeight: 700, color: '#fff',
    }}>
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
}

export default function CommentsSection({ marketId, yesToken, noToken, yesPrice = 0.5 }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [holders, setHolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"holders" | "comments">("holders");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      // Fetch Supabase comments
      const commRes = await fetch(`/api/comments?market_id=${marketId}`);
      const commData = await commRes.json();
      if (commData.success) setComments(commData.comments || []);

      // Fetch top position holders from Polymarket Data API (by YES token)
      if (yesToken) {
        const holdRes = await fetch(`https://data-api.polymarket.com/holders?token=${yesToken}&limit=20`);
        if (holdRes.ok) {
          const holdData = await holdRes.json();
          setHolders(Array.isArray(holdData) ? holdData.slice(0, 20) : []);
        }
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [marketId, yesToken]);

  const fmtAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "?";
  const fmtUsd = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tab header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px',
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['holders', 'comments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === tab ? 'var(--text-primary)' : 'transparent',
                color: activeTab === tab ? 'var(--text-inverse)' : 'var(--text-muted)',
                transition: 'all 150ms',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'holders' ? `Top Holders` : `Comments${comments.length > 0 ? ` (${comments.length})` : ''}`}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
        >
          <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* HOLDERS TAB */}
      {activeTab === 'holders' && (
        <div>
          {/* Explanation */}
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '10px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            💡 <strong style={{ color: 'var(--text-secondary)' }}>Top YES Holders</strong> — wallets with the largest YES token positions in this market. Large concentrated holders may signal directional conviction.
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="shimmer" style={{ height: '44px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : holders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              <User size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div>No holder data available for this market</div>
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>Market may be too new or have low liquidity</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {holders.map((h: any, i: number) => {
                const addr = h.proxyWallet || h.user || h.address || '0x???';
                const shares = parseFloat(h.size || h.amount || '0');
                const value = shares * yesPrice;
                const pct = holders[0] ? (shares / parseFloat(holders[0].size || holders[0].amount || '1')) * 100 : 0;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', width: '16px', textAlign: 'right' }}>#{i + 1}</span>
                    <Avatar address={addr} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {fmtAddr(addr)}
                      </div>
                      {/* Progress bar showing relative position size */}
                      <div style={{ height: '3px', backgroundColor: 'var(--bg-elevated)', borderRadius: '2px', marginTop: '4px' }}>
                        <div style={{ height: '100%', width: `${Math.max(4, pct)}%`, backgroundColor: 'var(--accent-green)', borderRadius: '2px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                        {shares.toFixed(0)} YES
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈{fmtUsd(value)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMMENTS TAB */}
      {activeTab === 'comments' && (
        <div>
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '10px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            💬 <strong style={{ color: 'var(--text-secondary)' }}>Community Comments</strong> — connect your wallet to post a comment about this market.
          </div>

          {isLoading ? (
            <div className="shimmer" style={{ height: '80px', borderRadius: '8px' }} />
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div>No comments yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>Be the first to comment on this market</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comments.map((c, i) => {
                const addr = c.user_address || c.address || '0x000';
                const text = c.text || c.comment || '';
                const ts = c.created_at || c.timestamp;
                return (
                  <div key={c.id || i} style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}>
                    <Avatar address={addr} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {fmtAddr(addr)}
                        </span>
                        {ts && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(new Date(ts))}</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
