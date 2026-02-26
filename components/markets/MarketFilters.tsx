"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MAIN_CATEGORIES } from "@/lib/polymarket/categories";
import AdvancedFilters from "@/components/markets/AdvancedFilters";
import ViewToggle from "@/components/markets/ViewToggle";
import type { FilterState } from "@/lib/filters";
import {
  Search, ChevronDown, CheckCircle2, SlidersHorizontal,
  TrendingUp, Sparkles, Landmark, Trophy, Coins, LineChart, Globe, Cpu, Clapperboard, LayoutGrid
} from "lucide-react";

const CAT_ICONS: Record<string, any> = {
  trending: TrendingUp,
  new: Sparkles,
  politics: Landmark,
  sports: Trophy,
  crypto: Coins,
  finance: LineChart,
  geopolitics: Globe,
  tech: Cpu,
  culture: Clapperboard,
};

interface SubTag { id: string; label: string; slug: string; }

const SORTS = [
  { id: "volume24hr", label: "24h Volume" },
  { id: "volume", label: "Total Volume" },
  { id: "startDate", label: "Recently Created" },
  { id: "endDate", label: "Ending Soon" },
];

interface Props {
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  subTags: SubTag[];
  subTagsLoading: boolean;
  activeSubTagId: string;
  onSubTagClick: (tagId: string) => void;
  sortBy?: string;
  onSortChange?: (s: string) => void;
  activeOnly?: boolean;
  onActiveOnlyChange?: (v: boolean) => void;
  resultCount?: number;
  advancedFilters?: FilterState;
  onAdvancedFilterChange?: (key: keyof FilterState, value: any) => void;
  onAdvancedFilterReset?: () => void;
  viewMode?: "grouped" | "flat";
  onViewModeChange?: (v: "grouped" | "flat") => void;
}

export default function MarketFilters({
  activeCategory, onCategoryChange,
  searchQuery, onSearchChange,
  subTags, subTagsLoading,
  activeSubTagId, onSubTagClick,
  sortBy = "volume24hr", onSortChange,
  activeOnly = true, onActiveOnlyChange,
  resultCount,
  advancedFilters,
  onAdvancedFilterChange,
  onAdvancedFilterReset,
  viewMode,
  onViewModeChange,
}: Props) {
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="space-y-4">
      {/* Row 1: Main categories — outlined by default, mocha-filled when active */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {MAIN_CATEGORIES.map((cat) => {
          const Icon = CAT_ICONS[cat.id] || LayoutGrid;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-all rounded-lg border"
              style={{
                backgroundColor: isActive ? 'var(--accent-mocha)' : 'transparent',
                color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                borderColor: isActive ? 'var(--accent-mocha)' : 'var(--border-default)',
                boxShadow: isActive ? '0 2px 8px rgba(156,123,94,0.2)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-mocha)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--accent-mocha)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={15} strokeWidth={1.75} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Row 2: Sub-tags */}
      {(subTags.length > 0 || subTagsLoading) && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSubTagClick("")}
            className="pill"
            style={
              !activeSubTagId
                ? { backgroundColor: 'var(--accent-mocha)', borderColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }
                : {}
            }
          >
            All
          </button>

          {subTags.slice(0, 6).map((tag) => (
            <button
              key={tag.id}
              onClick={() => onSubTagClick(tag.id === activeSubTagId ? "" : tag.id)}
              className="pill"
              style={
                activeSubTagId === tag.id
                  ? { backgroundColor: 'var(--accent-mocha)', borderColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }
                  : {}
              }
            >
              {tag.label}
            </button>
          ))}

          {subTags.length > 6 && (
            <div className="relative group/more">
              <button
                className="pill flex items-center gap-1"
              >
                More <ChevronDown size={11} />
              </button>
              <div
                className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-xl p-2 z-50 hidden group-hover/more:block animate-fade-in"
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {subTags.slice(6).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => onSubTagClick(tag.id === activeSubTagId ? "" : tag.id)}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                      style={{
                        color: activeSubTagId === tag.id ? 'var(--accent-mocha)' : 'var(--text-secondary)',
                        backgroundColor: activeSubTagId === tag.id ? 'rgba(156,123,94,0.1)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (activeSubTagId !== tag.id)
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
                      }}
                      onMouseLeave={e => {
                        if (activeSubTagId !== tag.id)
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Search + Controls */}
      <div className="flex items-center gap-3">
        {/* Search — borderless with bottom border only (underline style) */}
        <div className="flex-1 relative group">
          <Search
            size={15}
            className="absolute left-0 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-transparent pl-6 pr-3 py-2.5 text-sm transition-all outline-none"
            style={{
              color: 'var(--text-primary)',
              borderBottom: '1px solid var(--border-default)',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={e => {
              (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--accent-mocha)';
              (e.currentTarget.previousElementSibling as HTMLElement)!.style.color = 'var(--accent-mocha)';
            }}
            onBlur={e => {
              (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--border-default)';
              (e.currentTarget.previousElementSibling as HTMLElement)!.style.color = 'var(--text-muted)';
            }}
          />
        </div>

        {/* View toggle */}
        {viewMode && onViewModeChange && (
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        )}

        {/* Hide Expired toggle */}
        <button
          onClick={() => onActiveOnlyChange?.(!activeOnly)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all whitespace-nowrap"
          title="Hide markets past their end date"
          style={{
            backgroundColor: activeOnly ? 'rgba(74,124,89,0.08)' : 'transparent',
            borderColor: activeOnly ? 'rgba(74,124,89,0.3)' : 'var(--border-default)',
            color: activeOnly ? 'var(--accent-green)' : 'var(--text-muted)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: activeOnly ? 'var(--accent-green)' : 'var(--border-default)' }}
          />
          Hide Expired
        </button>

        {/* Advanced filters */}
        {advancedFilters && onAdvancedFilterChange && onAdvancedFilterReset && (
          <AdvancedFilters
            filters={advancedFilters}
            onChange={onAdvancedFilterChange}
            onReset={onAdvancedFilterReset}
          />
        )}

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <SlidersHorizontal size={13} />
            {SORTS.find(s => s.id === sortBy)?.label || "Sort"}
            <ChevronDown size={13} className={cn("transition-transform duration-200", showSort ? "rotate-180" : "")} />
          </button>

          {showSort && (
            <div
              className="absolute right-0 top-full mt-2 rounded-xl shadow-elevated z-50 min-w-[190px] py-1.5 animate-scale-in origin-top-right overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                Sort by
              </div>
              {SORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onSortChange?.(s.id); setShowSort(false); }}
                  className="w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between"
                  style={{
                    color: sortBy === s.id ? 'var(--accent-mocha)' : 'var(--text-secondary)',
                    backgroundColor: sortBy === s.id ? 'rgba(156,123,94,0.08)' : 'transparent',
                    fontWeight: sortBy === s.id ? '600' : '400',
                  }}
                  onMouseEnter={e => {
                    if (sortBy !== s.id)
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = sortBy === s.id ? 'rgba(156,123,94,0.08)' : 'transparent';
                  }}
                >
                  {s.label}
                  {sortBy === s.id && <CheckCircle2 size={13} style={{ color: 'var(--accent-mocha)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result count */}
      {typeof resultCount === "number" && (
        <div className="w-full text-right px-1">
          <span
            className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {resultCount} market{resultCount !== 1 ? "s" : ""} found
          </span>
        </div>
      )}
    </div>
  );
}
