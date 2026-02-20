"use client";
import { useAuth } from "@/providers/AuthProvider";
import { useAppKit } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useTokenSwap } from "@/hooks/useTokenSwap";
import { formatUnits } from "viem";
import { ChevronDown, RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConnectButton() {
  const { isConnected, isConnecting, shortAddress, disconnect, address } = useAuth();
  const { open } = useAppKit();
  const { checkBalances, swapNativeToBridged, isSwapping } = useTokenSwap();
  const [balances, setBalances] = useState({ native: BigInt(0), bridged: BigInt(0) });

  // Fetch balances on mount and when connected
  useEffect(() => {
    if (isConnected && address) {
      checkBalances(address as `0x${string}`).then(setBalances);
      // Poll every 10s
      const interval = setInterval(() => {
        checkBalances(address as `0x${string}`).then(setBalances);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address, checkBalances]);

  const handleConnect = async () => {
    try {
      if (open) await open({ view: 'Connect' });
    } catch (e) {
    }
  };

  const handleBridge = async () => {
    if (!address) return;
    // Swap 100% of native USDC to bridged
    if (balances.native > BigInt(0)) {
      const confirmed = window.confirm(`Swap ${formatUnits(balances.native, 6)} Native USDC to USDC.e?`);
      if (confirmed) {
        await swapNativeToBridged(address as `0x${string}`, balances.native);
        checkBalances(address as `0x${string}`).then(setBalances);
      }
    } else {
      alert("You have no Native USDC to bridge.");
    }
  };

  if (isConnecting) {
    return (
      <button disabled className="px-3 py-1.5 border border-border-default text-[10px] text-text-muted uppercase tracking-wider opacity-70" style={{ borderRadius: '2px' }}>
        <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-pill animate-spin inline-block mr-1.5" />
        Connecting...
      </button>
    );
  }

  if (isConnected && shortAddress) {
    const nativeVal = parseFloat(formatUnits(balances.native, 6));
    const bridgedVal = parseFloat(formatUnits(balances.bridged, 6));

    return (
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Balances Display - Re-styled */}
        <div className="hidden md:flex flex-col items-end text-[10px] leading-tight group">

          {/* Primary: USDC.e */}
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-surface-2 border border-transparent hover:border-border-default transition-all">
            <span className={cn("font-mono font-bold text-sm", bridgedVal === 0 ? "text-text-muted" : "text-text-primary")}>
              {bridgedVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="font-bold text-primary text-[10px] tracking-wide">USDC.e</span>
          </div>

          {/* Secondary: Bridge Option (Native USDC) */}
          {/* Show always if connected to avoid "missing button" confusion, but subtle if 0 */}
          <div className="flex items-center gap-1.5 mt-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-[44px] bg-white border border-border-default p-1.5 rounded-lg shadow-lg z-50">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-text-muted uppercase tracking-wider font-bold">Native USDC</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{nativeVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                {nativeVal > 0 ? (
                  <button onClick={handleBridge} disabled={isSwapping}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded uppercase hover:bg-primary-hover transition-colors">
                    {isSwapping ? <RefreshCw size={10} className="animate-spin" /> : "Bridge"}
                  </button>
                ) : (
                  <span className="text-[9px] text-text-disabled">0.00</span>
                )}
              </div>
            </div>
          </div>

          {/* Bridge Prompt (only if native balance > 0 and using old display) ... actually let's just make a simple row below main balance */}
          {nativeVal > 0 && (
            <div className="flex items-center gap-1 mt-0.5 animate-fade-in">
              <span className="text-[9px] text-text-muted">{nativeVal.toFixed(1)} NATIVE</span>
              <button onClick={handleBridge} disabled={isSwapping} className="text-[9px] font-bold text-primary hover:underline uppercase">
                {isSwapping ? "..." : "BRIDGE"}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Balance Component */}
        <div className="md:hidden flex flex-col items-end mr-1">
          <span className="text-xs font-bold text-text-primary">{bridgedVal.toFixed(1)}</span>
          <span className="text-[8px] text-primary font-bold">USDC.e</span>
        </div>

        {/* Wallet Pill */}
        <button
          onClick={() => open({ view: 'Account' })}
          className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-surface-1 border border-border-default hover:border-primary/30 hover:bg-surface-2 transition-all rounded-button group"
        >
          <div className="w-2 h-2 rounded-pill bg-success shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <span className="font-mono text-xs font-medium text-text-primary group-hover:text-primary transition-colors">
            {shortAddress}
          </span>
          <ChevronDown size={14} className="text-text-muted group-hover:text-text-secondary" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-button hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 active:translate-y-0.5 transition-all text-xs font-bold uppercase tracking-wider"
    >
      <Wallet size={16} />
      <span>Connect Wallet</span>
    </button>
  );
}
