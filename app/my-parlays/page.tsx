"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { cn, formatUSD, formatOdds, formatPrice, timeAgo, shortenAddress } from "@/lib/utils";
import { Target, Link2 } from "lucide-react";

type Status = "all" | "active" | "won" | "lost" | "partial";
type SortBy = "newest" | "payout" | "stake" | "odds";

interface ParlayData {
  id: string;
  status: "active" | "won" | "lost" | "partial";
  stake: number;
  combinedOdds: number;
  potentialPayout: number;
  actualPayout?: number;
  createdAt: string;
  legs: {
    id: string;
    question: string;
    side: "YES" | "NO";
    price: number;
    status: "pending" | "won" | "lost";
    marketId: string;
  }[];
}

interface ParlayStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  totalStaked: number;
  totalWon: number;
  winRate: number;
  bestPayout: number;
  avgOdds: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  active: { color: "text-primary", bg: "bg-primary-dim border-primary/20", label: "Active", icon: "⏳" },
  won: { color: "text-success", bg: "bg-success-dim border-success/20", label: "Won", icon: "✅" },
  lost: { color: "text-error", bg: "bg-error-dim border-error/20", label: "Lost", icon: "❌" },
  partial: { color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", label: "Partial", icon: "🔸" },
  pending: { color: "text-text-muted", bg: "bg-surface-3 border-border-default", label: "Pending", icon: "⏳" },
};

// Demo data removed — real data comes from /api/user/parlays

export default function MyParlaysPage() {
  const router = useRouter();
  const { address, isConnected } = useAuth();
  const [filter, setFilter] = useState<Status>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [parlays, setParlays] = useState<ParlayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadParlays = useCallback(async () => {
    setIsLoading(true);
    if (!isConnected || !address) {
      setParlays([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/user/parlays?address=${address}`);
      const data = await res.json();
      if (data.success && data.parlays.length > 0) {
        setParlays(data.parlays);
      } else {
        setParlays([]);
      }
    } catch {
      setParlays([]);
    }
    setIsLoading(false);
  }, [address, isConnected]);

  useEffect(() => { loadParlays(); }, [loadParlays]);

  // Stats calculation
  const stats: ParlayStats = useMemo(() => {
    const totalStaked = parlays.reduce((s: number, p: ParlayData) => s + p.stake, 0);
    const totalWon = parlays.reduce((s: number, p: ParlayData) => s + (p.actualPayout || 0), 0);
    const wonCount = parlays.filter((p: ParlayData) => p.status === "won").length;
    const resolved = parlays.filter((p: ParlayData) => p.status === "won" || p.status === "lost").length;
    const payouts = parlays.filter((p: ParlayData) => p.actualPayout).map((p: ParlayData) => p.actualPayout!);
    const odds = parlays.map((p: ParlayData) => p.combinedOdds);
    return {
      total: parlays.length, active: parlays.filter(p => p.status === "active").length,
      won: wonCount, lost: parlays.filter(p => p.status === "lost").length,
      totalStaked, totalWon,
      winRate: resolved > 0 ? wonCount / resolved : 0,
      bestPayout: payouts.length > 0 ? Math.max(...payouts) : 0,
      avgOdds: odds.length > 0 ? odds.reduce((a, b) => a + b, 0) / odds.length : 0,
    };
  }, [parlays]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = filter === "all" ? parlays : parlays.filter(p => p.status === filter);
    switch (sortBy) {
      case "payout": list = [...list].sort((a: ParlayData, b: ParlayData) => (b.potentialPayout) - (a.potentialPayout)); break;
      case "stake": list = [...list].sort((a: ParlayData, b: ParlayData) => b.stake - a.stake); break;
      case "odds": list = [...list].sort((a: ParlayData, b: ParlayData) => b.combinedOdds - a.combinedOdds); break;
      default: list = [...list].sort((a: ParlayData, b: ParlayData) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [parlays, filter, sortBy]);

  const pnl = stats.totalWon - stats.totalStaked;

  return (
    <div className="max-w-container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Parlays</h1>
          <p className="text-sm text-text-muted">
            {isConnected ? `Portfolio for ${shortenAddress(address || "")}` : "Connect wallet to track your real parlays"}
          </p>
        </div>
        <button onClick={() => router.push("/")} className="bg-surface-3 text-text-primary px-4 py-2 rounded-button font-medium hover:bg-surface-3/80 shadow-sm transition-colors text-xs py-2 px-3">
          + New Parlay
        </button>
      </div>

      {/* Stats Cards — only when there's data */}
      {parlays.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Staked", value: formatUSD(stats.totalStaked), sub: `${stats.total} parlays` },
            { label: "Total Won", value: formatUSD(stats.totalWon), accent: "bull", sub: `${stats.won} wins` },
            { label: "P&L", value: `${pnl >= 0 ? "+" : ""}${formatUSD(pnl)}`, accent: pnl >= 0 ? "bull" : "bear" },
            { label: "Win Rate", value: `${(stats.winRate * 100).toFixed(0)}%`, sub: `${stats.won}/${stats.won + stats.lost}` },
            { label: "Best Payout", value: formatUSD(stats.bestPayout), accent: "bull" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <span className="text-xs text-text-muted block mb-1">{s.label}</span>
              <span className={cn("text-lg font-bold font-mono font-tabular",
                s.accent === "bull" ? "text-success" : s.accent === "bear" ? "text-error" : "text-white"
              )}>{s.value}</span>
              {s.sub && <span className="text-[9px] text-text-disabled block mt-0.5">{s.sub}</span>}
            </div>
          ))}
        </div>
      )}

      {/* P&L Progress Bar */}
      {stats.totalStaked > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-text-muted">Staked vs Returns</span>
            <span className={cn("font-mono font-bold font-tabular", pnl >= 0 ? "text-success" : "text-error")}>
              {pnl >= 0 ? "+" : ""}{formatUSD(pnl)} ({((pnl / stats.totalStaked) * 100).toFixed(1)}% ROI)
            </span>
          </div>
          <div className="h-3 rounded-pill bg-surface-3 overflow-hidden flex">
            <div className="h-full bg-error/40 rounded-l-full" style={{ width: `${Math.min(100, (stats.totalStaked / (stats.totalStaked + Math.max(stats.totalWon, stats.totalStaked))) * 100)}%` }} />
            <div className="h-full bg-success rounded-r-full" style={{ width: `${Math.min(100, (stats.totalWon / (stats.totalStaked + Math.max(stats.totalWon, stats.totalStaked))) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-text-muted mt-1">
            <span>Staked: {formatUSD(stats.totalStaked)}</span>
            <span>Returned: {formatUSD(stats.totalWon)}</span>
          </div>
        </div>
      )}

      {/* Filter + Sort Row */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            { id: "all" as const, label: "All", count: parlays.length },
            { id: "active" as const, label: "Active", count: stats.active },
            { id: "won" as const, label: "Won", count: stats.won },
            { id: "lost" as const, label: "Lost", count: stats.lost },
            { id: "partial" as const, label: "Partial", count: parlays.filter((p: ParlayData) => p.status === "partial").length },
          ]).map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              className={cn("px-3 py-1.5 rounded-button text-xs font-medium transition-all whitespace-nowrap",
                filter === s.id ? "bg-primary text-white" : "bg-surface-2 border border-border-default text-text-muted hover:text-white"
              )}>
              {s.label}
              {s.count > 0 && <span className="ml-1 opacity-60">{s.count}</span>}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortBy)}
          className="bg-surface-2 border border-border-default text-xs text-text-secondary rounded-button px-3 py-1.5 focus:outline-none">
          <option value="newest">Newest</option>
          <option value="payout">Highest Payout</option>
          <option value="stake">Highest Stake</option>
          <option value="odds">Best Odds</option>
        </select>
      </div>

      {/* Parlays List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-20 rounded-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-card bg-surface-2 border border-border-default mx-auto flex items-center justify-center text-primary mb-4">
            <Target size={28} />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {filter === "all" ? "No parlays yet" : `No ${filter} parlays`}
          </h3>
          <p className="text-xs text-text-muted mb-4">
            {filter === "all" ? "Place your first parlay to start tracking." : "Try a different filter."}
          </p>
          {filter === "all" && (
            <button onClick={() => router.push("/")} className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-xs py-2 px-4">Browse Markets</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const style = STATUS_CONFIG[p.status];
            const isOpen = expanded === p.id;
            const legWins = p.legs.filter(l => l.status === "won").length;
            const legLosses = p.legs.filter(l => l.status === "lost").length;

            return (
              <div key={p.id} className="card overflow-hidden">
                {/* Parlay header — clickable */}
                <button onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-surface-3/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-button border whitespace-nowrap", style.bg, style.color)}>
                      {style.icon} {style.label}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white">{p.legs.length}-Leg Parlay</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-muted">{timeAgo(new Date(p.createdAt))}</span>
                        {legWins > 0 && <span className="text-[10px] text-success">{legWins}✓</span>}
                        {legLosses > 0 && <span className="text-[10px] text-error">{legLosses}✗</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="text-[9px] text-text-muted block">Stake</span>
                      <span className="text-xs font-mono font-bold text-white font-tabular">{formatUSD(p.stake)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-muted block">Odds</span>
                      <span className="text-xs font-mono font-bold text-primary font-tabular">{formatOdds(p.combinedOdds)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-muted block">Payout</span>
                      <span className={cn("text-xs font-mono font-bold font-tabular",
                        p.actualPayout ? "text-success" : "text-text-secondary"
                      )}>
                        {formatUSD(p.actualPayout || p.potentialPayout)}
                      </span>
                    </div>
                    <span className={cn("text-text-muted text-xs transition-transform", isOpen && "rotate-180")}>▼</span>
                  </div>
                </button>

                {/* Expanded legs */}
                {isOpen && (
                  <div className="border-t border-border-default px-4 py-3 space-y-1.5 animate-fade-in bg-surface-1/30">
                    {p.legs.map((leg, i) => {
                      const ls = STATUS_CONFIG[leg.status];
                      return (
                        <div key={leg.id} role="button" tabIndex={0} onClick={() => router.push(`/market/${leg.marketId}`)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/market/${leg.marketId}`); } }}
                          className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-button border border-border-default hover:border-border-default-hover cursor-pointer transition-all">
                          <span className="w-5 h-5 rounded-pill bg-primary-dim text-primary text-[10px] font-bold flex items-center justify-center shrink-0 font-tabular">{i + 1}</span>
                          <p className="flex-1 text-xs text-text-secondary truncate">{leg.question}</p>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                            leg.side === "YES" ? "bg-success-dim text-success" : "bg-error-dim text-error"
                          )}>{leg.side} {formatPrice(leg.price)}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-button border", ls.bg, ls.color)}>{ls.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Connect wallet CTA */}
      {!isConnected && parlays.length === 0 && (
        <div className="mt-8 card p-6 text-center">
          <div className="w-14 h-14 rounded-card bg-primary-dim border border-primary/20 mx-auto flex items-center justify-center text-primary mb-3">
            <Link2 size={28} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Connect Your Wallet</h3>
          <p className="text-xs text-text-muted mb-4">Connect your Polymarket wallet to place parlays and track your history here.</p>
          <button onClick={() => router.push("/")} className="bg-primary text-text-primary px-4 py-2 rounded-button font-medium hover:bg-primary-hover shadow-sm transition-colors text-xs py-2 px-5">Browse Markets</button>
        </div>
      )}
    </div>
  );
}
