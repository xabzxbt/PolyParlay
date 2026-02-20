"use client";
import { useState, useCallback, useEffect } from "react";
import { useWalletClient, usePublicClient, useSwitchChain, useChainId } from "wagmi";
import { formatUnits, erc20Abi, type PublicClient } from "viem";
import { useAuth } from "@/providers/AuthProvider";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useUsdcApproval } from "@/hooks/useUsdcApproval";
import {
  buildOrder, getOrderTypedData, getNegRisk, getTickSize, Side,
  type OrderData, type SignedOrder,
} from "@/lib/polymarket/order-builder";
import type { ParlayLeg } from "@/lib/parlay/calculator";

export interface LegSigningStatus {
  legId: string;
  question: string;
  status: "pending" | "signing" | "signed" | "error" | "matched" | "filled" | "cancelled" | "expired";
  error?: string;
}

interface SignedLegOrder {
  legId: string;
  signedOrder: SignedOrder;
  tokenId: string;
  side: "BUY";
  pricePerShare: number;
  sizeUSD: number;
}

type Phase = "idle" | "checking" | "approving" | "signing" | "submitting" | "done" | "error";

const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as const;
const USDC_NATIVE = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const;
const USDC_DECIMALS = 6;
const POLYGON_CHAIN_ID = 137;

export function useOrderSigning() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: POLYGON_CHAIN_ID });
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { address, isConnected } = useAuth();
  const { credentials: userCredentials } = usePolymarketAuth();
  const { checkAllowances, approveAll } = useUsdcApproval();

  const [phase, setPhase] = useState<Phase>("idle");
  const [legStatuses, setLegStatuses] = useState<LegSigningStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<{ bridged: number; native: number; required: number } | null>(null);
  const [proxyWallet, setProxyWallet] = useState<string | null>(null);
  const [proxyLookupDone, setProxyLookupDone] = useState(false);
  const [approvalStep, setApprovalStep] = useState<string | null>(null);

  // Proxy lookup
  useEffect(() => {
    if (!address) { setProxyWallet(null); setProxyLookupDone(false); return; }

    setProxyLookupDone(false);
    fetch(`/api/proxy-wallet?address=${address}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.proxyWallet) {
          if (d.isProxyItself) {
            setProxyWallet(null);
          } else {
            setProxyWallet(d.proxyWallet);
          }
        } else {
          setProxyWallet(null);
        }
        setProxyLookupDone(true);
      })
      .catch(() => { setProxyLookupDone(true); });
  }, [address]);

  const updateLeg = (id: string, update: Partial<LegSigningStatus>) => {
    setLegStatuses((prev) => prev.map((l) => l.legId === id ? { ...l, ...update } : l));
  };

  const readUsdcBalance = useCallback(async (addr: `0x${string}`): Promise<{ bridged: number; native: number }> => {
    let client = publicClient as PublicClient | undefined;

    if (!client) {
      try {
        const { createPublicClient, http } = await import("viem");
        const { polygon } = await import("viem/chains");
        client = createPublicClient({
          chain: polygon,
          transport: http("https://polygon-rpc.com"),
        }) as PublicClient;
      } catch (e) {
        return { bridged: -1, native: -1 };
      }
    }

    try {
      const [bridgedRaw, nativeRaw] = await Promise.all([
        client.readContract({
          address: USDC_BRIDGED,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [addr],
        }).catch(() => BigInt(0)),
        client.readContract({
          address: USDC_NATIVE,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [addr],
        }).catch(() => BigInt(0)),
      ]);

      const bridged = parseFloat(formatUnits(bridgedRaw, USDC_DECIMALS));
      const native = parseFloat(formatUnits(nativeRaw, USDC_DECIMALS));
      return { bridged, native };
    } catch {
      return { bridged: -1, native: -1 };
    }
  }, [publicClient]);

  // Task 1: Order Polling
  const pollOrderState = useCallback(async (orderId: string, legId: string, credentials: any, finalMaker: string) => {
    let polling = true;
    while (polling) {
      try {
        const res = await fetch(`/api/order/${orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userCredentials: { ...credentials, address: finalMaker } })
        });
        const data = await res.json();

        if (data.success && data.order) {
          const { status, size_matched, original_size } = data.order;

          if (["FILLED", "CANCELLED", "EXPIRED"].includes(status)) {
            updateLeg(legId, { status: status.toLowerCase() });
            polling = false;
          } else if (parseFloat(size_matched) > 0) {
            updateLeg(legId, { status: "matched" });
            if (parseFloat(size_matched) >= parseFloat(original_size)) {
              updateLeg(legId, { status: "filled" });
              polling = false;
            }
          }
        }
      } catch (err) { }

      if (polling) await new Promise(r => setTimeout(r, 2000));
    }
  }, []);

  const signAndSubmit = useCallback(async (
    legs: ParlayLeg[],
    totalStake: number,
    totalOdds: number = 0,
    potentialPayout: number = 0
  ): Promise<{ success: boolean; result?: any; error?: string }> => {
    if (!isConnected || !address) {
      return { success: false, error: "Wallet not connected" };
    }

    if (!walletClient) {
      return { success: false, error: "Wallet signer not ready" };
    }

    // Перевірка user credentials
    if (!userCredentials) {
      return {
        success: false,
        error: "Trading not enabled. Click 'Enable Trading' button first."
      };
    }

    if (totalStake <= 0) {
      return { success: false, error: "Stake must be greater than 0" };
    }

    if (legs.length < 2) {
      return { success: false, error: "Need at least 2 legs for a parlay" };
    }


    const useEOAMode = !proxyWallet;
    const finalMaker = proxyWallet || address;
    const finalSigner = address;
    const finalIsProxy = !useEOAMode;


    if (chainId !== POLYGON_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
        await new Promise(r => setTimeout(r, 300));
      } catch {
        return { success: false, error: "Please switch to Polygon network" };
      }
    }

    // Balance check
    setPhase("checking");
    setError(null);
    setBalanceInfo(null);
    setApprovalStep(null);

    try {
      // ✅ 1. Validate Balance via CLOB API BEFORE anything else
      const balanceRes = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCredentials: { ...userCredentials, address: finalMaker },
          assetType: "COLLATERAL"
        })
      });
      const balanceData = await balanceRes.json();

      if (!balanceData.success) {
        setPhase("error");
        setError("Failed to verify balance with Polymarket: " + balanceData.error);
        return { success: false, error: "Balance API error" };
      }

      const availableUSDC = balanceData.balance;
      setBalanceInfo({ bridged: availableUSDC, native: 0, required: totalStake });

      // Strict balance validation
      if (availableUSDC < totalStake) {
        const msg = `Insufficient USDC balance: need $${totalStake}, have $${availableUSDC.toFixed(2)}.`;
        setPhase("error");
        setError(msg);
        return { success: false, error: "insufficient_funds", required: totalStake, available: availableUSDC } as any;
      }
    } catch (err: any) {
      // Network error, maybe fallback to VIEM balance reads? No, audit requires strict API validation.
      setPhase("error");
      setError("Network error while checking balance.");
      return { success: false, error: "Network error" };
    }

    // === USDC Allowance Check & Approval ===
    // Polymarket requires USDC.e approval for the CTF Exchange contracts.
    // Without approval, ALL orders will be rejected with "not enough balance / allowance".
    try {
      setPhase("approving");
      setApprovalStep("Checking USDC allowances...");

      const approvalStatus = await checkAllowances(finalMaker as `0x${string}`, totalStake);

      if (!approvalStatus.allApproved) {
        setApprovalStep("Approve USDC spending (one-time setup)...");

        const approved = await approveAll(
          finalMaker as `0x${string}`,
          totalStake,
          (step) => setApprovalStep(step),
        );

        if (!approved) {
          setPhase("error");
          setError("USDC approval was rejected. You must approve the exchange contracts to place orders.");
          return { success: false, error: "USDC approval rejected" };
        }

      } else {
      }
    } catch (err) {
      setPhase("error");
      setError("Failed to check/set USDC approval. Please try again.");
      return { success: false, error: "Approval check failed" };
    }

    // Sign orders
    const stakePerLeg = totalStake / legs.length;

    setLegStatuses(legs.map((l) => ({
      legId: l.id,
      question: l.question,
      status: "pending",
    })));
    setPhase("signing");

    const signedOrders: SignedLegOrder[] = [];

    for (let idx = 0; idx < legs.length; idx++) {
      const leg = legs[idx];

      if (idx > 0) {
        await new Promise(r => setTimeout(r, 500));
      }

      try {
        updateLeg(leg.id, { status: "signing" });

        // CRITICAL: Fetch negRisk per market — determines which exchange contract to sign against
        const negRisk = await getNegRisk(leg.tokenId);
        // CRITICAL: Fetch tickSize per market — determines rounding precision for amounts
        // Wrong tick size → "invalid amounts" error from CLOB!
        const tickSize = await getTickSize(leg.tokenId);

        const order: OrderData = buildOrder({
          maker: finalMaker as `0x${string}`,
          signer: finalSigner as `0x${string}`,
          tokenId: leg.tokenId,
          side: Side.BUY,
          pricePerShare: leg.price,
          sizeUSD: stakePerLeg,
          negRisk,
          tickSize,
          isProxy: finalIsProxy,
        });


        // CRITICAL: negRisk MUST match between buildOrder and getOrderTypedData
        // Wrong negRisk = wrong verifyingContract = invalid signature!
        const typedData = getOrderTypedData(order, negRisk);

        const signature = await walletClient.signTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });

        const signedOrder: SignedOrder = { ...order, signature: signature as `0x${string}` };

        signedOrders.push({
          legId: leg.id,
          signedOrder,
          tokenId: leg.tokenId,
          side: "BUY",
          pricePerShare: leg.price,
          sizeUSD: stakePerLeg,
        });

        updateLeg(leg.id, { status: "signed" });
      } catch (err: any) {
        let msg = "Signing failed";

        if (err?.code === 4001) {
          msg = `You rejected signature ${idx + 1}`;
        } else if (err instanceof Error) {
          msg = `Signing failed: ${err.message}`;
        }

        updateLeg(leg.id, { status: "error", error: msg });
        setPhase("error");
        setError(msg);
        return { success: false, error: msg };
      }
    }

    // Submit to CLOB
    setPhase("submitting");

    // ✅ ДОДАНО ЛОГУВАННЯ

    try {
      const res = await fetch("/api/parlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedOrders,
          userAddress: finalMaker,
          totalStake,
          userCredentials,
          legs,
          totalOdds,
          potentialPayout
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPhase("done");

        // Auto-save parlay to history (Phase 4.1)
        try {
          const parlayData = {
            legs: legs.map((leg: ParlayLeg) => ({
              id: leg.id,
              question: leg.question,
              side: leg.side,
              price: leg.price,
              status: "pending",
              marketId: leg.marketId || leg.id,
            })),
            totalStake,
            totalOdds,
            potentialPayout,
            status: "active",
            createdAt: new Date().toISOString(),
          };

          // Fire and forget - don't block the success response
          fetch("/api/user/parlays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parlayData),
          }).then(() => {
          }).catch((err) => {
          });
        } catch (saveErr) {
        }

        // Start polling for accepted orders in the background
        const acceptedOrders = data.orders || [];
        acceptedOrders.forEach((o: any) => {
          if (o.success && o.orderId && o.orderId !== "submitted") {
            pollOrderState(o.orderId, o.legId, userCredentials, finalMaker);
          } else if (o.success) {
            // Fallback if no orderId
            updateLeg(o.legId, { status: "signed" });
          } else {
            updateLeg(o.legId, { status: "error", error: o.error });
          }
        });

        return { success: true, result: data };
      } else {
        setPhase("error");
        setError(data.error || "Order rejected");
        return { success: false, error: data.error };
      }
    } catch {
      setPhase("error");
      setError("Network error");
      return { success: false, error: "Network error" };
    }
  }, [walletClient, address, isConnected, readUsdcBalance, chainId, switchChainAsync, proxyWallet, userCredentials, checkAllowances, approveAll]);

  const reset = useCallback(() => {
    setPhase("idle");
    setLegStatuses([]);
    setError(null);
    setBalanceInfo(null);
  }, []);

  return {
    signAndSubmit,
    phase,
    legStatuses,
    error,
    balanceInfo,
    reset,
    proxyWallet,
    proxyLookupDone,
    approvalStep,
  };
}
