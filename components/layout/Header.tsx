"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useParlay } from "@/providers/ParlayProvider";
import ConnectButton from "@/components/auth/ConnectButton";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X, Ticket, ShoppingBag, TrendingUp, HelpCircle, LayoutDashboard, Star, Settings, RefreshCw } from "lucide-react";
import FundsModal from "@/components/wallet/FundsModal";
import SettingsModal from "@/components/settings/SettingsModal";

const NAV = [
  { href: "/", label: "Markets", icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
  { href: "/portfolio", label: "Portfolio", icon: <TrendingUp size={16} strokeWidth={1.5} /> },
  { href: "/my-parlays", label: "My Bets", icon: <Ticket size={16} strokeWidth={1.5} /> },
  { href: "/popular", label: "Popular", icon: <Star size={16} strokeWidth={1.5} /> },
  { href: "/faq", label: "Faq", icon: <HelpCircle size={16} strokeWidth={1.5} /> },
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
    <header
      className="sticky top-0 z-50 h-14"
      style={{
        backgroundColor: 'var(--bg-dark)',
        borderBottom: '1px solid rgba(245,242,238,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-container mx-auto px-4 h-full flex items-center gap-4">

        {/* Logo — DM Serif Display wordmark */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ backgroundColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }}
          >
            <Ticket size={16} strokeWidth={2} />
          </div>
          <span
            className="hidden sm:inline text-lg tracking-tight transition-colors"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-inverse)' }}
          >
            PolyParlay
          </span>
        </Link>

        {/* Desktop nav — Title Case, subtle underline on hover */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map((l) => {
            const isActive = l.href === "/"
              ? pathname === "/"
              : pathname.startsWith(l.href);

            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn("nav-cat flex items-center gap-1.5", isActive && "nav-cat-active")}
              >
                {l.icon}
                <span className={cn("hidden lg:inline", isActive && "inline")}>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">

          {/* Parlay slip badge */}
          {count > 0 && (
            <button
              onClick={toggleSlip}
              className="relative flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all active:scale-98"
              style={{
                backgroundColor: 'var(--accent-mocha)',
                color: 'var(--text-inverse)',
                boxShadow: 'var(--shadow-mocha)',
              }}
            >
              <ShoppingBag size={15} strokeWidth={2} />
              <span className="font-tabular">{count}</span>
            </button>
          )}

          {/* Manage Funds */}
          <button
            onClick={() => setBridgeOpen(true)}
            className={cn(
              "nav-cat flex items-center gap-1.5",
              isBridgeOpen && "nav-cat-active"
            )}
            title="Deposit / Withdraw"
          >
            <RefreshCw size={15} strokeWidth={1.5} />
            <span className="hidden lg:inline">Funds</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="hidden sm:flex nav-cat items-center justify-center p-2"
            title="Settings"
          >
            <Settings size={17} strokeWidth={1.5} />
          </button>

          <ConnectButton />

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden nav-cat p-2"
          >
            {mobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {isBridgeOpen && <FundsModal isOpen={isBridgeOpen} onClose={() => setBridgeOpen(false)} />}

      {/* Mobile menu */}
      {mobileMenu && (
        <div
          className="md:hidden absolute top-14 left-0 right-0 border-b animate-slide-down"
          style={{
            backgroundColor: 'var(--bg-dark)',
            borderColor: 'rgba(245,242,238,0.08)',
          }}
        >
          <div className="p-4 space-y-1">
            {NAV.map((l) => {
              const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenu(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    isActive
                      ? "text-text-inverse"
                      : "text-text-inverse opacity-60 hover:opacity-100"
                  )}
                  style={isActive ? { backgroundColor: 'rgba(156,123,94,0.2)', opacity: 1 } : {}}
                >
                  {l.icon}
                  <span className="text-sm font-medium">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
