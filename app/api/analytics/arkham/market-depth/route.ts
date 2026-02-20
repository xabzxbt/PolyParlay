import { NextResponse } from "next/server";
import { getActiveEvents } from "@/lib/polymarket/gamma";

// Takes ?market_id={} or defaults to biggest volume market if none
export const revalidate = 30;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let marketId = searchParams.get("market");

        // Let's get top market from gamma if none provided
        if (!marketId) {
            const { events } = await getActiveEvents({ limit: 1, order: "volume24hr", ascending: false });
            if (events && events.length > 0 && events[0].markets && events[0].markets.length > 0) {
                marketId = events[0].markets[0].conditionId; // Fallback to token/conditionID
            }
        }

        if (!marketId) {
            return NextResponse.json({ success: false, data: null, error: "Market ID not found" }, { status: 400 });
        }

        const bookRes = await fetch(`https://clob.polymarket.com/book?market=${marketId}`, { next: { revalidate: 30 } });

        let bookData = { bids: [], asks: [] };
        if (bookRes.ok) {
            bookData = await bookRes.json();
        }

        // Bids vs asks imbalance calculations
        let bidVol = 0, askVol = 0;
        bookData.bids.forEach((b: any) => bidVol += parseFloat(b.size || "0") * parseFloat(b.price || "0"));
        bookData.asks.forEach((a: any) => askVol += parseFloat(a.size || "0") * parseFloat(a.price || "0"));

        let bigWalls: any[] = []; // Liquidity walls
        const wallThreshold = 5000; // $5k
        [...bookData.bids, ...bookData.asks].forEach((order: any) => {
            const cost = parseFloat(order.size || "0") * parseFloat(order.price || "0");
            if (cost > wallThreshold) {
                bigWalls.push({ ...order, value: cost });
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                bids: bookData.bids || [],
                asks: bookData.asks || [],
                imbalance: {
                    bidVolume: bidVol,
                    askVolume: askVol,
                    ratio: (bidVol / (askVol + bidVol)) || 0.5
                },
                liquidityWalls: bigWalls,
                marketId
            },
            lastUpdated: new Date().toISOString()
        }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=59' } });

    } catch (error) {
        return NextResponse.json({ success: false, data: null }, { status: 500 });
    }
}
