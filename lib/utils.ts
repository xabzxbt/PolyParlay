import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price as cents
export function formatPrice(price: number): string {
  if (price >= 1) return "$1.00";
  if (price <= 0) return "0¢";
  return `${Math.round(price * 100)}¢`;
}

// Format price change with sign
function formatPriceChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${(change * 100).toFixed(1)}¢`;
}

// Format USD
export function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

// Format volume
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

// Format percentage
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Format odds multiplier
export function formatOdds(odds: number): string {
  return `×${odds.toFixed(2)}`;
}

// Format ROI
export function formatROI(roi: number): string {
  const sign = roi >= 0 ? "+" : "";
  return `${sign}${(roi * 100).toFixed(0)}%`;
}

// Shorten wallet address
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Time ago
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Time until resolution
export function timeUntil(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return `${Math.floor(ms / 60000)}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

// Price color
function getPriceColor(price: number): string {
  if (price >= 0.7) return "text-success";
  if (price >= 0.3) return "text-warning";
  return "text-error";
}

// Liquidity level
export function getLiquidityLevel(liquidity: number): "high" | "mid" | "low" {
  if (liquidity >= 50_000) return "high";
  if (liquidity >= 10_000) return "mid";
  return "low";
}

// Category config
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  politics: { icon: "🏛", color: "#60A5FA", label: "Politics" },
  sports: { icon: "⚽", color: "#34D399", label: "Sports" },
  crypto: { icon: "₿", color: "#FBBF24", label: "Crypto" },
  finance: { icon: "📈", color: "#A78BFA", label: "Finance" },
  economy: { icon: "💵", color: "#10B981", label: "Economy" },
  tech: { icon: "⚡", color: "#38BDF8", label: "Tech" },
  culture: { icon: "🎬", color: "#FB923C", label: "Culture" },
  world: { icon: "🌍", color: "#F472B6", label: "World" },
  science: { icon: "🔬", color: "#818CF8", label: "Science" },
  other: { icon: "🔮", color: "#9CA3AF", label: "Other" },
};

export function getCategoryIcon(cat: string): string {
  return CATEGORY_CONFIG[cat]?.icon ?? "🔮";
}

export function getCategoryColor(cat: string): string {
  return CATEGORY_CONFIG[cat]?.color ?? "#9CA3AF";
}
