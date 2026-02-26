import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        // CLOB /book?token_id= takes the YES token ID
        const tokenId = searchParams.get("token") || searchParams.get("market");

        if (!tokenId) {
            return NextResponse.json({ success: false, data: null, error: "Token ID required" }, { status: 400 });
        }

        // Try both token param styles (CLOB API supports both ?token_id= and ?market= but token_id is preferred)
        let bookData: { bids: any[]; asks: any[] } = { bids: [], asks: [] };

        for (const paramStyle of [`token_id=${tokenId}`, `market=${tokenId}`]) {
            const bookRes = await fetch(`https://clob.polymarket.com/book?${paramStyle}`, {
                next: { revalidate: 30 }
            });
            if (bookRes.ok) {
                const bd = await bookRes.json();
                if (bd && (bd.bids?.length > 0 || bd.asks?.length > 0)) {
                    bookData = bd;
                    break;
                }
            }
        }

        // Bids vs asks calculations
        let bidVol = 0, askVol = 0;
        bookData.bids.forEach((b: any) => bidVol += parseFloat(b.size || "0") * parseFloat(b.price || "0"));
        bookData.asks.forEach((a: any) => askVol += parseFloat(a.size || "0") * parseFloat(a.price || "0"));

        const wallThreshold = 5000;
        const bigWalls: any[] = [];
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
                tokenId,
                hasData: bookData.bids.length > 0 || bookData.asks.length > 0,
            },
            lastUpdated: new Date().toISOString()
        }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=59' } });

    } catch (error) {
        return NextResponse.json({ success: false, data: null }, { status: 500 });
    }
}
