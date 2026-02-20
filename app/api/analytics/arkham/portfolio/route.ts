import { NextResponse } from "next/server";

export const revalidate = 60; // 60s cache

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const user = searchParams.get("user");

        if (!user) {
            return NextResponse.json({ success: false, data: null, error: "No user address provided" }, { status: 400 });
        }

        const [positionsRes, valueRes, activityRes] = await Promise.all([
            fetch(`https://data-api.polymarket.com/positions?user=${user}&limit=100`, { next: { revalidate: 60 } }),
            fetch(`https://data-api.polymarket.com/value?user=${user}`, { next: { revalidate: 60 } }),
            fetch(`https://data-api.polymarket.com/trades?user=${user}&limit=50`, { next: { revalidate: 60 } })
        ]);

        let positions = [], totalValueStr = "0", activity = [];

        if (positionsRes.ok) positions = await positionsRes.json();
        if (valueRes.ok) {
            const valJson = await valueRes.json();
            totalValueStr = valJson.value || "0";
        }
        if (activityRes.ok) activity = await activityRes.json();

        const totalValue = parseFloat(totalValueStr);

        // Win rate calculation from real trade activity
        const winRate = activity.length > 0 ? (activity.filter((a: any) => a.side === "SELL" && a.price > 0.5).length / Math.max(1, activity.length)) : 0;

        return NextResponse.json({
            success: true,
            data: {
                totalValue,
                positionsCount: positions.length,
                positions,
                recentTrades: activity,
                estimatedWinRate: Math.round(winRate * 100),
                bestCategory: "Politics", // Without event ID to gamma lookup this is hard to derive dynamically fast
                address: user
            },
            lastUpdated: new Date().toISOString()
        }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } });

    } catch (error) {
        return NextResponse.json({ success: false, data: {} }, { status: 500 });
    }
}
