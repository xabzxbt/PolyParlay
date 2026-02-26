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
      <button disabled className="px-3 py-1.5 text-[10px] font-medium opacity-70 flex items-center gap-1.5" style={{ borderRadius: '8px', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
        <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin inline-block" style={{ borderColor: 'var(--accent-mocha)', borderTopColor: 'transparent' }} />
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
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <span className="font-mono font-bold text-sm" style={{ color: bridgedVal === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {bridgedVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="font-bold text-[10px] tracking-wide" style={{ color: 'var(--accent-mocha)' }}>USDC.e</span>
          </div>

          {/* Secondary: Bridge Option (Native USDC) */}
          {/* Show always if connected to avoid "missing button" confusion, but subtle if 0 */}
          <div className="flex items-center gap-1.5 mt-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-[44px] p-1.5 rounded-xl shadow-xl z-50" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-default)' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Native USDC</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{nativeVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                {nativeVal > 0 ? (
                  <button onClick={handleBridge} disabled={isSwapping}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase transition-colors"
                    style={{ backgroundColor: 'var(--accent-mocha)', color: 'var(--text-inverse)' }}>
                    {isSwapping ? <RefreshCw size={10} className="animate-spin" /> : "Bridge"}
                  </button>
                ) : (
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>0.00</span>
                )}
              </div>
            </div>
          </div>

          {/* Bridge Prompt (only if native balance > 0 and using old display) ... actually let's just make a simple row below main balance */}
          {nativeVal > 0 && (
            <div className="flex items-center gap-1 mt-0.5 animate-fade-in">
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{nativeVal.toFixed(1)} NATIVE</span>
              <button onClick={handleBridge} disabled={isSwapping} className="text-[9px] font-semibold hover:underline uppercase" style={{ color: 'var(--accent-mocha)' }}>
                {isSwapping ? "..." : "BRIDGE"}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Balance Component */}
        <div className="md:hidden flex flex-col items-end mr-1">
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{bridgedVal.toFixed(1)}</span>
          <span className="text-[8px] font-bold" style={{ color: 'var(--accent-mocha)' }}>USDC.e</span>
        </div>

        {/* Wallet Pill */}
        <button
          onClick={() => open({ view: 'Account' })}
          className="flex items-center gap-2 pl-3 pr-2 py-1.5 transition-all rounded-lg group"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)', boxShadow: '0 0 6px rgba(74,124,89,0.4)' }} />
          <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {shortAddress}
          </span>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-semibold active:scale-98"
      style={{
        backgroundColor: 'var(--accent-mocha)',
        color: 'var(--text-inverse)',
        boxShadow: 'var(--shadow-mocha)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-mocha-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-mocha)'; }}
    >
      <Wallet size={15} strokeWidth={1.75} />
      <span>Connect Wallet</span>
    </button>
  );
}
