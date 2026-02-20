"use client";

import React, { useState, useMemo } from "react";
import { Grid, Globe, Activity, TrendingUp, DollarSign, Star, RefreshCw } from "lucide-react";
import { formatUSD, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MarketData {
  id: string;
  question: string;
  slug?: string;
  yesPrice: number;
  volume24h: number;
  category?: string;
}

interface MarketHeatmapProps {
  markets: MarketData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onMarketClick?: (market: MarketData) => void;
}

const categories = [
  { key: "all", label: "All", icon: Grid },
  { key: "politics", label: "Politics", icon: Globe },
  { key: "sports", label: "Sports", icon: Activity },
  { key: "crypto", label: "Crypto", icon: TrendingUp },
  { key: "finance", label: "Finance", icon: DollarSign },
  { key: "entertainment", label: "Entertainment", icon: Star },
];

function getTileSize(volume: number, minVol: number, maxVol: number): number {
  const normalized = (volume - minVol) / (maxVol - minVol);
  return 80 + normalized * 120; // 80-200px
}

function getTileColor(price: number): string {
  if (price > 0.6) {
    // Green intensity based on how much > 0.6
    const intensity = (price - 0.6) / 0.4;
    const green = Math.round(100 + intensity * 155);
    return `rgb(34, ${green}, 34)`;
  } else if (price < 0.4) {
    // Red intensity based on how much < 0.4
    const intensity = (0.4 - price) / 0.4;
    const red = Math.round(100 + intensity * 155);
    return `rgb(${red}, 34, 34)`;
  }
  // Neutral grey for 0.4-0.6
  return "rgb(71, 85, 105)";
}

function HeatmapTile({ 
  market, 
  size, 
  onClick 
}: { 
  market: MarketData; 
  size: number;
  onClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const truncatedQuestion = market.question.length > 40 
    ? market.question.substring(0, 40) + "..." 
    : market.question;
  
  const color = getTileColor(market.yesPrice);
  const fontSize = Math.max(10, Math.min(14, size / 10));

  return (
    <div
      className="relative rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        minWidth: "80px",
        minHeight: "80px",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white border border-border-default rounded-lg p-3 shadow-xl">
          <p className="text-xs text-text-primary font-medium mb-2">{market.question}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">YES Price</span>
              <span className="text-text-primary">{formatPercent(market.yesPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">24h Volume</span>
              <span className="text-text-primary">{formatUSD(market.volume24h)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-2 h-full flex flex-col justify-between">
        <p 
          className="text-text-primary font-medium leading-tight"
          style={{ fontSize: `${fontSize}px` }}
        >
          {truncatedQuestion}
        </p>
        <p 
          className="text-text-primary/80 font-bold"
          style={{ fontSize: `${fontSize + 2}px` }}
        >
          {formatPercent(market.yesPrice)}
        </p>
      </div>
    </div>
  );
}

export function MarketHeatmap({
  markets,
  isLoading = false,
  onRefresh,
  onMarketClick,
}: MarketHeatmapProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredMarkets = useMemo(() => {
    if (selectedCategory === "all") return markets;
    return markets.filter(m => 
      m.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [markets, selectedCategory]);

  const { minVol, maxVol } = useMemo(() => {
    if (filteredMarkets.length === 0) return { minVol: 0, maxVol: 1000000 };
    const volumes = filteredMarkets.map(m => m.volume24h || 0);
    return {
      minVol: Math.min(...volumes),
      maxVol: Math.max(...volumes),
    };
  }, [filteredMarkets]);

  return (
    <div className="bg-white border border-border-default rounded-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-text-primary">Market Heatmap</h3>
          <span className="text-xs text-text-disabled px-2 py-0.5 bg-surface-2 rounded">
            {filteredMarkets.length} markets
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors",
              isLoading && "animate-spin"
            )}
          >
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.key
                  ? "bg-blue-500 text-text-primary"
                  : "bg-surface-2 text-text-muted hover:text-text-primary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-text-muted">Bearish (less 40%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-300" />
          <span className="text-text-muted">Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-text-muted">Bullish (over 60%)</span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-pill h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Heatmap Grid */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2 justify-center items-start">
          {filteredMarkets.slice(0, 50).map((market) => (
            <HeatmapTile
              key={market.id}
              market={market}
              size={getTileSize(market.volume24h || 0, minVol, maxVol)}
              onClick={() => onMarketClick?.(market)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMarkets.length === 0 && (
        <div className="text-center py-8">
          <Grid className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-text-disabled">No markets in this category</p>
        </div>
      )}
    </div>
  );
}

export default MarketHeatmap;
