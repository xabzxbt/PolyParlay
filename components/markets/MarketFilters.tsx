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
    <div className="space-y-4 font-sans">
      {/* Row 1: Main categories */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {MAIN_CATEGORIES.map((cat) => {
          const Icon = CAT_ICONS[cat.id] || LayoutGrid;
          return (
            <button key={cat.id} onClick={() => onCategoryChange(cat.id)}
              className={cn("px-4 py-2.5 text-sm font-semibold transition-all rounded-lg border flex items-center gap-2",
                activeCategory === cat.id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-transparent text-text-secondary border-border-default hover:text-primary hover:border-primary/30 hover:bg-white"
              )}>
              <Icon size={16} strokeWidth={2} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Row 2: Sub-tags (related tags with counts) */}
      {(subTags.length > 0 || subTagsLoading) && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onSubTagClick("")}
            className={cn("px-3 py-1.5 rounded-pill text-[11px] font-bold border transition-all whitespace-nowrap",
              !activeSubTagId
                ? "bg-primary text-white border-primary"
                : "bg-transparent text-text-secondary border-border-default hover:bg-surface-1"
            )}>
            All
          </button>

          {/* First 6 tags */}
          {subTags.slice(0, 6).map((tag) => (
            <button key={tag.id}
              onClick={() => onSubTagClick(tag.id === activeSubTagId ? "" : tag.id)}
              className={cn("px-3 py-1.5 rounded-pill text-[11px] font-bold border transition-all whitespace-nowrap",
                activeSubTagId === tag.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-transparent text-text-secondary border-border-default hover:bg-surface-1"
              )}>
              {tag.label}
            </button>
          ))}

          {/* More Dropdown */}
          {subTags.length > 6 && (
            <div className="relative group/more">
              <button className="px-3 py-1.5 rounded-pill text-[11px] font-bold bg-transparent border border-border-default text-text-secondary hover:bg-surface-1 flex items-center gap-1 transition-all">
                More <ChevronDown size={12} />
              </button>
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-border-default rounded-card shadow-xl p-2 z-50 hidden group-hover/more:block animate-fade-in">
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                  {subTags.slice(6).map((tag) => (
                    <button key={tag.id}
                      onClick={() => onSubTagClick(tag.id === activeSubTagId ? "" : tag.id)}
                      className={cn("w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                        activeSubTagId === tag.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-surface-1 text-text-secondary"
                      )}>
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
        {/* Search */}
        <div className="flex-1 relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
          <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-white border border-border-default rounded-input py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm" />
        </div>

        {/* View toggle (grouped/flat) */}
        {viewMode && onViewModeChange && (
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        )}

        {/* Active only toggle */}
        <button onClick={() => onActiveOnlyChange?.(!activeOnly)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 rounded-button border text-xs font-bold transition-all whitespace-nowrap shadow-sm",
            activeOnly
              ? "bg-white border-success/30 text-success ring-1 ring-bull/10"
              : "bg-transparent border-border-default text-text-muted hover:text-text-secondary"
          )}>
          <span className={cn("w-2 h-2 rounded-pill", activeOnly ? "bg-success" : "bg-text-disabled")} />
          Active
        </button>

        {/* Advanced filters dropdown */}
        {advancedFilters && onAdvancedFilterChange && onAdvancedFilterReset && (
          <AdvancedFilters
            filters={advancedFilters}
            onChange={onAdvancedFilterChange}
            onReset={onAdvancedFilterReset}
          />
        )}

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-border-default rounded-button text-xs font-medium text-text-secondary hover:text-primary hover:border-primary/30 transition-all whitespace-nowrap shadow-sm active:translate-y-px">
            <SlidersHorizontal size={14} />
            {SORTS.find(s => s.id === sortBy)?.label || "Sort"}
            <ChevronDown size={14} className={cn("transition-transform duration-200", showSort ? "rotate-180" : "")} />
          </button>

          {showSort && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-border-default rounded-card shadow-elevated z-50 min-w-[180px] py-1 animate-scale-in origin-top-right overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-1 border-b border-border-default">Sort by</div>
              {SORTS.map(s => (
                <button key={s.id} onClick={() => { onSortChange?.(s.id); setShowSort(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between",
                    sortBy === s.id
                      ? "text-primary bg-primary/5 font-bold"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
                  )}>
                  {s.label}
                  {sortBy === s.id && <CheckCircle2 size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result count badge */}
      {typeof resultCount === "number" && (
        <div className="w-full text-right px-1">
          <span className="inline-flex items-center text-[10px] font-medium text-text-muted bg-surface-1 px-2 py-0.5 rounded-pill border border-border-default">
            {resultCount} market{resultCount !== 1 ? "s" : ""} found
          </span>
        </div>
      )}
    </div>
  );
}
