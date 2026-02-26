import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        // Accept either a token ID directly, or fall back to market/conditionId
        const tokenId = searchParams.get("token") || searchParams.get("market");

        if (!tokenId) {
            return NextResponse.json({ success: false, data: { history: [], volatilityIndex: 0 } }, { status: 400 });
        }

        // CLOB API: ?market= takes a TOKEN ID (yes token), not conditionId
        // Try multiple intervals to get the best data
        let priceHistory: any[] = [];

        for (const interval of ["1d", "1w", "max"]) {
            const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=${interval}&fidelity=60`;
            const res = await fetch(url, { next: { revalidate: 30 } });
            if (res.ok) {
                const h = await res.json();
                if (h.history && h.history.length > 1) {
                    priceHistory = h.history;
                    break;
                }
            }
        }

        const volatility = priceHistory.length > 1
            ? Math.abs(priceHistory[0].p - priceHistory[priceHistory.length - 1].p)
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                history: priceHistory.map((p: any) => ({
                    time: new Date(p.t * 1000).toISOString(),
                    price: p.p
                })),
                volatilityIndex: (volatility * 100).toFixed(2),
                tokenId,
                hasData: priceHistory.length > 1,
            },
            lastUpdated: new Date().toISOString()
        }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=59' } });

    } catch (error) {
        return NextResponse.json({ success: false, data: { history: [], volatilityIndex: 0 } }, { status: 500 });
    }
}
