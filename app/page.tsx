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
import { Search, ArrowRight, Rocket } from "lucide-react";

export default function HomePage() {
  const { state, setSlipOpen } = useParlay();

  // === EXISTING filter state (unchanged) ===
  const [category, setCategory] = useState("trending");
  const [activeSubTagId, setActiveSubTagId] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("volume24hr");
  const [activeOnly, setActiveOnly] = useState(true);

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
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Main content — shift left when slip is open */}
      <div className={cn("flex-1 transition-all duration-300 min-w-0", hasLegs && "lg:pr-[340px]")}>

        {/* Hero section: betting-focused */}
        <section className="border-b border-border-default bg-surface-1 shadow-sm z-10 relative">
          <div className="max-w-container mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {/* Badge removed */}
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
                <PlatformStats stats={stats} />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Markets — high volume, high liquidity highlights */}
        {!search && category === "trending" && activeFlatMarkets.length > 0 && (
          <section className="border-b border-border-default bg-surface-1/50 py-4">
            <div className="max-w-container mx-auto px-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
                  🔥 Hot Right Now
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {activeFlatMarkets
                  .sort((a: any, b: any) => (b.volume24hr || 0) - (a.volume24hr || 0))
                  .slice(0, 6)
                  .map((m: any) => {
                    const yp = Math.round((m.yesPrice || 0.5) * 100);
                    // Shorten title
                    const title = m.groupItemTitle || m.question || "Unknown Market";
                    const shortTitle = title.length > 25 ? title.substring(0, 25) + "..." : title;

                    return (
                      <a key={m.id} href={`/market/${m.id}`}
                        className="shrink-0 w-[140px] flex flex-col items-center justify-center p-3 rounded-card bg-surface-2 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group border border-border-default/50">

                        {/* Big Percentage */}
                        <span className={cn(
                          "text-3xl font-black mb-1 leading-none",
                          yp >= 50 ? "text-success" : "text-error"
                        )}>
                          {yp}%
                        </span>

                        {/* Short Title */}
                        <p className="text-[11px] font-bold text-center leading-tight text-text-primary mb-1 line-clamp-2 h-[2.5em] flex items-center justify-center">
                          {shortTitle}
                        </p>

                        {/* Volume */}
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider bg-white/50 px-1.5 py-0.5 rounded-pill">
                          ${formatVolume(m.volume24hr)} Vol
                        </span>
                      </a>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* Content */}
        <section className="max-w-container mx-auto px-4 py-4">
          {/* Movers bar — price movers */}
          {!search && activeFlatMarkets.length > 0 && (
            <div className="mb-6 p-6 rounded-card relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary-hover opacity-100 shadow-xl shadow-primary/20" />
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-pill -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-pill translate-y-1/2 -translate-x-1/2 blur-xl" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-white flex-1">
                  <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                    <Rocket size={24} className="text-white" />
                    Welcome to PolyParlay
                  </h3>
                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    The advanced precision trading interface for Polymarket.
                    Built for serious traders, featuring real-time &quot;Smart Money&quot; analytics, whale watching, and Multi-Leg Parlay betting.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded border border-white/20">DeFi Architecture</span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded border border-white/20">Bayesian Models</span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded border border-white/20">Non-Custodial</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <a href="https://polymarket.com/?via=xabzxbt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white text-primary text-sm font-bold uppercase tracking-wider rounded-lg shadow-lg hover:bg-surface-1 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 group/btn">
                    Trade & Support Devs
                    <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                  <span className="text-[10px] text-white/70">Support free tools by trading</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters — EXTENDED with new props */}
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
            // NEW Phase 1 props
            advancedFilters={fullFilters}
            onAdvancedFilterChange={handleAdvancedFilterChange}
            onAdvancedFilterReset={handleAdvancedFilterReset}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Content grid — UPDATED with view toggle */}
          <div className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="shimmer h-[220px]" />
                ))}
              </div>
            ) : viewMode === "grouped" ? (
              // === GROUPED VIEW (default, existing EventCard) ===
              filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredEvents.map((ev: any) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              ) : (
                <EmptyState search={search} activeOnly={activeOnly} onShowSettled={() => setActiveOnly(false)} />
              )
            ) : (
              // === FLAT VIEW (new, MarketCard grid) ===
              filteredFlatMarkets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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

      {/* Desktop parlay slip — EXISTING */}
      <aside className={cn(
        "hidden lg:flex fixed right-0 top-14 bottom-0 w-[340px] flex-col border-l border-border-default bg-surface-1 z-40 transition-transform duration-300",
        !hasLegs && "translate-x-full"
      )}>
        <ParlaySlip />
      </aside>

      {/* Mobile FAB — EXISTING */}
      {hasLegs && (
        <button onClick={() => setSlipOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-50 flex items-center gap-2 px-5 py-3  bg-primary text-white font-bold text-sm shadow-glow active:scale-95 transition-all">
          {state.legs.length} Leg{state.legs.length !== 1 && "s"}
        </button>
      )}

      {/* Mobile slip overlay — EXISTING */}
      {state.isOpen && hasLegs && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <div role="presentation" className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSlipOpen(false)} />
          <div className="bg-surface-1 border-t border-border-default rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
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
      <div className="w-12 h-12  bg-surface-2 border border-border-default mx-auto flex items-center justify-center mb-3">
        <Search className="text-text-muted" size={24} />
      </div>
      <p className="text-sm text-text-muted mb-1">
        {search ? "No markets match your search." : "No active markets found."}
      </p>
      <p className="text-xs text-text-muted mb-2">Try adjusting your filters or search query.</p>
      {activeOnly && (
        <button onClick={onShowSettled}
          className="text-xs text-primary hover:underline">
          Show settled markets →
        </button>
      )}
    </div>
  );
}
