import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const isAuthorized = auth === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAuthorized && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/resolve] Starting parlay resolution check...");

    const { data: active, error: fetchError } = await supabase
      .from("parlays")
      .select("*")
      .eq("status", "open");

    if (fetchError) throw fetchError;

    if (!active || active.length === 0) {
      console.log("[cron/resolve] No active parlays to resolve.");
      return NextResponse.json({
        success: true,
        checked: 0,
        resolved: 0,
        message: "No active parlays to resolve",
        ts: new Date().toISOString(),
      });
    }

    const marketIds = [...new Set(
      active.flatMap(p => {
        const markets = (Array.isArray(p.markets) ? p.markets : []) as any[];
        return markets.map(m => m.marketId);
      }).filter(id => id)
    )];

    if (marketIds.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        resolved: 0,
        message: "No markets to resolve",
      });
    }

    const resolved = await checkResolutions(marketIds);

    let resolvedCount = 0;
    let checkedCount = 0;

    for (const parlay of active) {
      let allDone = true;
      let anyLost = false;
      let wonLegs = 0;
      let pendingLegs = 0;

      const markets = (Array.isArray(parlay.markets) ? parlay.markets : []) as any[];
      let updatedMarkets = false;

      for (let leg of markets) {
        if (leg.status === "won" || leg.status === "lost") {
          if (leg.status === "won") wonLegs++;
          if (leg.status === "lost") anyLost = true;
          continue;
        }

        const res = resolved.get(leg.marketId);

        if (!res) {
          allDone = false;
          pendingLegs++;
          continue;
        }

        const won = (leg.side === "YES" && res === "yes") ||
          (leg.side === "NO" && res === "no");

        leg.status = won ? "won" : "lost";
        leg.outcome = res;
        updatedMarkets = true;

        if (won) wonLegs++;
        else anyLost = true;
      }

      checkedCount++;

      if (allDone) {
        let newStatus = "lost";
        let actualPayout = 0;

        if (!anyLost) {
          newStatus = "won";
          actualPayout = markets[0]?.potentialPayout || 0;
        } else if (wonLegs > 0) {
          newStatus = "partial";
        }

        await supabase
          .from("parlays")
          .update({
            status: newStatus,
            markets: markets,
            resolved_at: new Date().toISOString(),
            payout: actualPayout
          })
          .eq("id", parlay.id);

        console.log(`[cron/resolve] Resolved parlay ${parlay.id} with status ${newStatus} and payout ${actualPayout}`);
        resolvedCount++;
      } else if (updatedMarkets) {
        await supabase
          .from("parlays")
          .update({
            markets: markets
          })
          .eq("id", parlay.id);
      }
    }

    return NextResponse.json({
      success: true,
      checked: checkedCount,
      resolved: resolvedCount,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/resolve]", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

async function checkResolutions(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      try {
        const r = await fetch(`${GAMMA_BASE}/markets/${id}`);
        if (!r.ok) return { id, result: null };
        const market = await r.json();

        if (market?.closed || market?.active === false) {
          let prices = [0.5, 0.5];
          if (market.outcomePrices) {
            prices = typeof market.outcomePrices === 'string'
              ? JSON.parse(market.outcomePrices)
              : market.outcomePrices;
          }

          if (prices[0] >= 0.99) return { id, result: "yes" };
          else if (prices[1] >= 0.99) return { id, result: "no" };
        }
        return { id, result: null };
      } catch (e) {
        return { id, result: null };
      }
    });

    const results = await Promise.all(promises);
    for (const { id, result } of results) {
      if (result) out.set(id, result);
    }
  }

  return out;
}
