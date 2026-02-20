import { NextResponse } from "next/server";
import { getMarketAnalytics, getEventAnalytics } from "@/lib/polymarket/data-api";

const CLOB_BASE = "https://clob.polymarket.com";

export const dynamic = "force-dynamic";

// GET /api/smart-money?type=market&yes_token=X&no_token=Y — single market analytics
// GET /api/smart-money?type=event&id=EVENT_ID — event-level smart money analytics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "market";

    if (type === "market") {
      const yesToken = searchParams.get("yes_token") || "";
      const noToken = searchParams.get("no_token") || "";

      if (!yesToken && !noToken) {
        return NextResponse.json({
          success: false,
          error: "yes_token or no_token required",
        }, { status: 400 });
      }

      const analytics = await getMarketAnalytics(yesToken, noToken);
      return NextResponse.json({ success: true, analytics });
    }

    // Event-level analytics: fetch event data and compute aggregates
    if (type === "event") {
      const eventId = searchParams.get("id");
      
      if (!eventId) {
        return NextResponse.json({ success: false, error: "id parameter required" }, { status: 400 });
      }

      // Fetch event from Polymarket API
      const eventRes = await fetch(`${CLOB_BASE}/events?${new URLSearchParams({ id: eventId })}`);
      if (!eventRes.ok) {
        return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 });
      }
      
      const eventData = await eventRes.json();
      const event = eventData[0];
      
      if (!event || !event.markets) {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
      }

      const markets = event.markets;
      
      // Calculate aggregate stats from markets
      let totalVolume = 0;
      let totalLiquidity = 0;
      let activeMarketsCount = 0;
      let yesVolumeTotal = 0;
      let noVolumeTotal = 0;
      let mostActiveMarket: { question: string; volume: number } | null = null;

      for (const market of markets) {
        const volume = parseFloat(market.volume || "0");
        const liquidity = parseFloat(market.liquidity || "0");
        const yesVol = parseFloat(market.volumeYes || "0");
        const noVol = parseFloat(market.volumeNo || "0");
        
        totalVolume += volume;
        totalLiquidity += liquidity;
        yesVolumeTotal += yesVol;
        noVolumeTotal += noVol;
        
        if (market.active) {
          activeMarketsCount++;
        }
        
        if (!mostActiveMarket || volume > mostActiveMarket.volume) {
          mostActiveMarket = {
            question: market.question || market.title,
            volume: volume
          };
        }
      }

      // Determine whale flow direction
      const whaleFlow = yesVolumeTotal > noVolumeTotal 
        ? "bullish" 
        : noVolumeTotal > yesVolumeTotal 
          ? "bearish" 
          : "neutral";
      
      const flowPercent = totalVolume > 0 
        ? Math.abs(yesVolumeTotal - noVolumeTotal) / totalVolume * 100 
        : 0;

      // Get top 3 markets analytics for detailed view
      const topMarkets = markets.slice(0, 3).map((m: any) => ({
        id: m.id,
        yesTokenId: m.clobTokenIds?.[0] || "",
        noTokenId: m.clobTokenIds?.[1] || "",
        question: m.question || m.title
      }));
      
      const marketAnalytics = await getEventAnalytics(topMarkets);

      return NextResponse.json({
        success: true,
        analytics: {
          totalVolume,
          totalLiquidity,
          activeMarketsCount,
          totalMarkets: markets.length,
          whaleFlow,
          flowPercent: Math.round(flowPercent),
          mostActiveMarket,
          marketAnalytics
        }
      });
    }

    return NextResponse.json({ success: false, error: "Unknown type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Analytics temporarily unavailable",
    });
  }
}
