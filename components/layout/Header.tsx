"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useParlay } from "@/providers/ParlayProvider";
import ConnectButton from "@/components/auth/ConnectButton";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X, Ticket, ShoppingBag, TrendingUp, HelpCircle, LayoutDashboard, Star, Settings, RefreshCw } from "lucide-react";
import BridgeModal from "@/components/wallet/BridgeModal";
import SettingsModal from "@/components/settings/SettingsModal";

const NAV = [
  { href: "/", label: "Markets", icon: <LayoutDashboard size={18} strokeWidth={2} /> },
  { href: "/portfolio", label: "Portfolio", icon: <TrendingUp size={18} strokeWidth={2} /> },
  { href: "/my-parlays", label: "My Bets", icon: <Ticket size={18} strokeWidth={2} /> },
  { href: "/popular", label: "Popular", icon: <Star size={18} strokeWidth={2} /> },
  { href: "/faq", label: "FAQ", icon: <HelpCircle size={18} strokeWidth={2} /> },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, toggleSlip } = useParlay();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isBridgeOpen, setBridgeOpen] = useState(false);
  const count = state.legs.length;

  return (
    <header className="sticky top-0 z-50 glass border-b border-border-default bg-surface-1/80 backdrop-blur-md supports-[backdrop-filter]:bg-surface-1/60 h-14">
      <div className="max-w-container mx-auto px-4 h-full flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <Ticket size={18} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight text-text-primary hidden sm:inline group-hover:text-primary transition-colors">
            PolyParlay
          </span>
        </Link>

        {/* Desktop nav - Compact */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map((l) => {
            const isActive = l.href ? (pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))) : false;

            return (
              <Link key={l.href} href={l.href!}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-button flex items-center gap-2",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-text-secondary hover:text-primary hover:bg-surface-2"
                )}>
                {l.icon}
                <span className={cn("hidden lg:inline", isActive && "inline")}>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer to push right side content */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          {/* Trade Now button removed */}
          {count > 0 && (
            <button onClick={toggleSlip}
              className="relative flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-button text-xs font-bold uppercase tracking-wider transition-all hover:bg-primary-hover shadow-lg shadow-primary/20 active:translate-y-px h-9">
              <ShoppingBag size={16} strokeWidth={2.5} />
              <span className="font-tabular text-sm">{count}</span>
            </button>
          )}
          <button onClick={() => setBridgeOpen(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-button mr-1",
              isBridgeOpen
                ? "text-primary bg-primary/10"
                : "text-text-secondary hover:text-primary hover:bg-surface-2"
            )}
            title="Deposit / Withdraw">
            <RefreshCw size={18} strokeWidth={2} />
            <span className="hidden lg:inline">Manage Funds</span>
          </button>

          <button onClick={() => setSettingsOpen(true)}
            className="hidden sm:flex items-center gap-2 p-2 text-text-secondary hover:text-primary hover:bg-surface-2 rounded-button transition-all mr-1"
            title="Settings">
            <Settings size={20} />
          </button>

          <ConnectButton />

          <button onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 rounded-button text-text-secondary hover:text-primary hover:bg-surface-1 transition-all">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {isBridgeOpen && <BridgeModal isOpen={isBridgeOpen} onClose={() => setBridgeOpen(false)} />}

      {mobileMenu && (
        <div className="md:hidden absolute top-14 left-0 right-0 border-b border-border-default bg-white shadow-elevated animate-slide-down">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((l) => (
                <Link key={l.href} href={l.href!} onClick={() => setMobileMenu(false)}
                  className={cn("flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-card border border-border-default transition-all",
                    pathname === l.href
                      ? "bg-primary/5 border-primary text-primary shadow-sm"
                      : "bg-white text-text-secondary hover:bg-surface-1 hover:border-primary/30 hover:text-primary"
                  )}>
                  <div className={cn("p-2 rounded-pill", pathname === l.href ? "bg-primary text-white" : "bg-surface-2")}>
                    {l.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
