import { NextResponse } from "next/server";
import { getActiveEvents } from "@/lib/polymarket/gamma";

export const revalidate = 30;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let marketId = searchParams.get("market");

        if (!marketId) {
            const { events } = await getActiveEvents({ limit: 1, order: "volume24hr", ascending: false });
            if (events && events.length > 0 && events[0].markets && events[0].markets.length > 0) {
                marketId = events[0].markets[0].conditionId;
            }
        }

        if (!marketId) throw new Error("No market available");

        const historyRes = await fetch(`https://clob.polymarket.com/prices-history?market=${marketId}&interval=1d`, { next: { revalidate: 30 } });

        let priceHistory = [];
        if (historyRes.ok) {
            const h = await historyRes.json();
            priceHistory = h.history || [];
        }

        const volatility = priceHistory.length > 0
            ? Math.abs(priceHistory[0].p - priceHistory[priceHistory.length - 1].p)
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                history: priceHistory.map((p: any) => ({ time: new Date(p.t * 1000).toISOString(), price: p.p })),
                volatilityIndex: volatility * 100, // naive score
                marketId
            },
            lastUpdated: new Date().toISOString()
        }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=59' } });

    } catch (error) {
        return NextResponse.json({ success: false, data: { history: [], volatilityIndex: 0 } }, { status: 500 });
    }
}
