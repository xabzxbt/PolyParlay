"use client";
import { useState, useMemo, useCallback } from "react";
import EventCard from "@/components/markets/EventCard";
import MarketCard from "@/components/markets/MarketCard";
import MarketFilters from "@/components/markets/MarketFilters";
import PlatformStats from "@/components/markets/PlatformStats";
import MoversBar from "@/components/markets/MoversBar";
import ParlaySlip from "@/components/parlay/ParlaySlip";
import { useParlay } from "@/providers/ParlayProvider";
import { useEvents, useSubTags } from "@/hooks/useMarketData";
import { MAIN_CATEGORIES } from "@/lib/polymarket/categories";
import { filterEvents, filterFlatMarkets, isActiveMarket, DEFAULT_FILTERS, type FilterState } from "@/lib/filters";
import { cn, formatVolume } from "@/lib/utils";
import { Search, ArrowRight } from "lucide-react";

// Inline SVG flame icon (stroke-based, no fill) — replaces 🔥 emoji
function FlameIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z" />
    </svg>
  );
}

export default function HomePage() {
  const { state, setSlipOpen } = useParlay();

  // === EXISTING filter state (unchanged) ===
  const [category, setCategory] = useState("trending");
  const [activeSubTagId, setActiveSubTagId] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("volume24hr");
  const [activeOnly, setActiveOnly] = useState(false);

  // === NEW Phase 1 state ===
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Sync activeOnly / search into the unified FilterState
  const fullFilters = useMemo<FilterState>(() => ({
    ...advancedFilters,
    activeOnly,
    search,
  }), [advancedFilters, activeOnly, search]);

  // Handler for advanced filter changes
  const handleAdvancedFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setAdvancedFilters((prev: FilterState) => ({ ...prev, [key]: value }));
  }, []);

  const handleAdvancedFilterReset = useCallback(() => {
    setAdvancedFilters(DEFAULT_FILTERS);
  }, []);

  // === EXISTING API params logic (unchanged) ===
  const currentCat = MAIN_CATEGORIES.find(c => c.id === category);
  const mainTagId = currentCat?.tagId ?? null;
  const effectiveTagId = activeSubTagId ? parseInt(activeSubTagId) : mainTagId || undefined;
  const order = category === "new" ? "startDate" : sortBy;
  const ascending = category === "new" || sortBy === "endDate";

  // === EXISTING data fetching (unchanged) ===
  const { tags: subTags, isLoading: subTagsLoading } = useSubTags(mainTagId);
  const { events: apiEvents, stats, isLoading } = useEvents({ limit: 50, tagId: effectiveTagId, order, ascending });

  // === EXISTING category change handler (unchanged) ===
  const handleCategoryChange = useCallback((id: string) => {
    setCategory(id);
    setActiveSubTagId("");
    setSearch("");
    if (id === "new") setSortBy("startDate");
    else if (id === "trending") setSortBy("volume24hr");
  }, []);

  // === UPDATED: use filterEvents() utility instead of inline logic ===
  const filteredEvents = useMemo(() => {
    return filterEvents(apiEvents, fullFilters);
  }, [apiEvents, fullFilters]);

  // Flat markets for flat view + MoversBar
  const allFlatMarkets = useMemo(() => {
    if (!apiEvents || !Array.isArray(apiEvents)) return [];
    return apiEvents.flatMap((ev: any) => ev.markets.map((m: any) => ({ ...m, category: ev.category })));
  }, [apiEvents]);

  const activeFlatMarkets = useMemo(() => {
    const now = new Date();
    return allFlatMarkets.filter((m: any) => isActiveMarket(m, now));
  }, [allFlatMarkets]);

  // === NEW: filtered flat markets ===
  const filteredFlatMarkets = useMemo(() => {
    return filterFlatMarkets(allFlatMarkets, fullFilters);
  }, [allFlatMarkets, fullFilters]);

  const totalMarkets = viewMode === "grouped"
    ? filteredEvents.reduce((a: number, ev: any) => a + ev.marketCount, 0)
    : filteredFlatMarkets.length;

  const hasLegs = state.legs.length > 0;

  return (
    <div className="flex min-h-[calc(100vh-56px)]" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300 min-w-0", hasLegs && "lg:pr-[340px]")}>

        {/* Stats bar */}
        <section
          className="z-10 relative"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="max-w-container mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between">
              <PlatformStats stats={stats} />
            </div>
          </div>
        </section>

        {/* HOT RIGHT NOW strip (Phase 3.3) */}
        {!search && category === "trending" && activeFlatMarkets.length > 0 && (
          <section
            className="py-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="max-w-container mx-auto px-4">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--accent-mocha)' }}
                >
                  <FlameIcon size={13} />
                  Hot Right Now
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
              </div>

              {/* Horizontal scroll with shadow fade on edges */}
              <div className="relative">
                {/* Left shadow fade */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to right, var(--bg-surface), transparent)' }}
                />
                {/* Right shadow fade */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to left, var(--bg-surface), transparent)' }}
                />

                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {activeFlatMarkets
                    .sort((a: any, b: any) => (b.volume24hr || 0) - (a.volume24hr || 0))
                    .slice(0, 8)
                    .map((m: any) => {
                      const yp = Math.round((m.yesPrice || 0.5) * 100);
                      const title = m.groupItemTitle || m.question || "Unknown Market";
                      const shortTitle = title.length > 28 ? title.substring(0, 28) + "…" : title;

                      return (
                        <a
                          key={m.id}
                          href={`/market/${m.id}`}
                          className="shrink-0 w-[130px] flex flex-col items-center justify-center p-3 rounded-xl transition-all group"
                          style={{
                            backgroundColor: 'var(--bg-base)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-card)',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
                          }}
                        >
                          {/* Big percentage */}
                          <span
                            className="font-black mb-1.5 leading-none"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '28px',
                              color: yp >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}
                          >
                            {yp}%
                          </span>

                          {/* Short title */}
                          <p
                            className="text-[10px] font-medium text-center leading-tight line-clamp-2 mb-2"
                            style={{ color: 'var(--text-secondary)', height: '2.4em' }}
                          >
                            {shortTitle}
                          </p>

                          {/* Volume pill */}
                          <span
                            className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            ${formatVolume(m.volume24hr)} vol
                          </span>
                        </a>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main content section */}
        <section className="max-w-container mx-auto px-4 py-6">

          {/* Welcome hero — editorial style */}
          {!search && activeFlatMarkets.length > 0 && (
            <div
              className="mb-6 p-6 rounded-2xl relative overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-dark)',
                border: '1px solid rgba(245,242,238,0.08)',
              }}
            >
              {/* Subtle decorative texture */}
              <div
                className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(156,123,94,0.15) 0%, transparent 70%)',
                  transform: 'translate(40%, -40%)',
                }}
              />
              <div
                className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(184,150,90,0.1) 0%, transparent 70%)',
                  transform: 'translate(-40%, 40%)',
                }}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h3
                    className="text-2xl mb-2"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text-inverse)',
                      lineHeight: 1.3,
                    }}
                  >
                    Welcome to PolyParlay
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-4 max-w-md"
                    style={{ color: 'rgba(245,242,238,0.65)' }}
                  >
                    The precision trading interface for Polymarket. Featuring
                    real-time Smart Money analytics, whale watching, and Multi-Leg Parlay betting.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["DeFi Architecture", "Bayesian Models", "Non-Custodial"].map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-md"
                        style={{
                          backgroundColor: 'rgba(245,242,238,0.08)',
                          border: '1px solid rgba(245,242,238,0.12)',
                          color: 'rgba(245,242,238,0.6)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                  <a
                    href="https://polymarket.com/?via=xabzxbt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 group/btn transition-all"
                    style={{
                      backgroundColor: 'var(--accent-mocha)',
                      color: 'var(--text-inverse)',
                      boxShadow: 'var(--shadow-mocha)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-mocha-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-mocha)'; }}
                  >
                    Trade & Support Devs
                    <ArrowRight size={15} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                  <span
                    className="text-[10px]"
                    style={{ color: 'rgba(245,242,238,0.35)' }}
                  >
                    Support free tools by trading
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <MarketFilters
            activeCategory={category}
            onCategoryChange={handleCategoryChange}
            searchQuery={search}
            onSearchChange={setSearch}
            subTags={subTags}
            subTagsLoading={subTagsLoading}
            activeSubTagId={activeSubTagId}
            onSubTagClick={(id) => setActiveSubTagId(id === activeSubTagId ? "" : id)}
            sortBy={sortBy}
            onSortChange={setSortBy}
            activeOnly={activeOnly}
            onActiveOnlyChange={setActiveOnly}
            resultCount={totalMarkets}
            advancedFilters={fullFilters}
            onAdvancedFilterChange={handleAdvancedFilterChange}
            onAdvancedFilterReset={handleAdvancedFilterReset}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Staggered card grid */}
          <div className="mt-5">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="shimmer h-[220px]" />
                ))}
              </div>
            ) : viewMode === "grouped" ? (
              filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredEvents.map((ev: any) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              ) : (
                <EmptyState search={search} activeOnly={activeOnly} onShowSettled={() => setActiveOnly(false)} />
              )
            ) : (
              filteredFlatMarkets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFlatMarkets.map((m: any) => (
                    <MarketCard key={m.id} market={m} />
                  ))}
                </div>
              ) : (
                <EmptyState search={search} activeOnly={activeOnly} onShowSettled={() => setActiveOnly(false)} />
              )
            )}
          </div>
        </section>
      </div>

      {/* Desktop parlay slip */}
      <aside
        className={cn(
          "hidden lg:flex fixed right-0 top-14 bottom-0 w-[340px] flex-col z-40 transition-transform duration-300",
          !hasLegs && "translate-x-full"
        )}
        style={{
          backgroundColor: 'var(--bg-base)',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        <ParlaySlip />
      </aside>

      {/* Mobile FAB */}
      {hasLegs && (
        <button
          onClick={() => setSlipOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-50 flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--accent-mocha)',
            color: 'var(--text-inverse)',
            boxShadow: 'var(--shadow-mocha-lg)',
          }}
        >
          {state.legs.length} Leg{state.legs.length !== 1 && "s"}
        </button>
      )}

      {/* Mobile slip overlay */}
      {state.isOpen && hasLegs && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <div
            role="presentation"
            className="flex-1 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}
            onClick={() => setSlipOpen(false)}
          />
          <div
            className="max-h-[85vh] overflow-y-auto animate-slide-up rounded-t-2xl"
            style={{ backgroundColor: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)' }}
          >
            <ParlaySlip />
          </div>
        </div>
      )}
    </div>
  );
}

// Extracted empty state component
function EmptyState({ search, activeOnly, onShowSettled }: {
  search: string; activeOnly: boolean; onShowSettled: () => void;
}) {
  return (
    <div className="py-20 text-center">
      <div
        className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <Search style={{ color: 'var(--text-muted)' }} size={22} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {search ? "No markets match your search." : "No active markets found."}
      </p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Try adjusting your filters or search query.
      </p>
      {activeOnly && (
        <button
          onClick={onShowSettled}
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--accent-mocha)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
        >
          Show settled markets →
        </button>
      )}
    </div>
  );
}
