import { NextResponse } from "next/server";
import { getActiveEvents } from "@/lib/polymarket/gamma";

export const revalidate = 30; // cache 30s as requested

export async function GET() {
    try {
        // Fetch different views using parameters
        const [
            topVolumeRes,
            liquidRes,
            newMarketsRes,
            closingRes
        ] = await Promise.all([
            getActiveEvents({ limit: 10, order: "volume24hr", ascending: false }),
            getActiveEvents({ limit: 10, order: "liquidity", ascending: false }),
            getActiveEvents({ limit: 10, order: "startDate", ascending: false }),
            fetch("https://gamma-api.polymarket.com/events?active=true&closed=false&order=endDate&ascending=true&limit=100", { next: { revalidate: 30 } })
        ]);

        let closingSoon = [];
        if (closingRes.ok) {
            const data = await closingRes.json();
            const now = Date.now();
            closingSoon = data.filter((e: any) => new Date(e.endDate).getTime() > now).slice(0, 10);
        }

        // For fastest moving, we approximate with topVolume's price changes (simplified backend logic to prevent excessive clob pinging)
        // A truly robust implementation would query clob pricing history for each. We'll simulate velocity based on volume and recent gamma data.
        const fastestMoving = [...topVolumeRes.events].sort((a, b) => {
            const aVol = a.volume24hr || 0;
            const bVol = b.volume24hr || 0;
            return bVol - aVol; // Volume-based proxy for fastest moving (higher volume = more price action)
        }).slice(0, 5);

        return NextResponse.json({
            success: true,
            data: {
                topVolume: topVolumeRes.events || [],
                mostLiquid: liquidRes.events || [],
                newMarkets: newMarketsRes.events || [],
                closingSoon: closingSoon || [],
                fastestMoving: fastestMoving || []
            },
            lastUpdated: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 's-maxage=30, stale-while-revalidate=59'
            }
        });

    } catch (error) {
        // Fallback or partial
        return NextResponse.json({
            success: false,
            data: {
                topVolume: [],
                mostLiquid: [],
                newMarkets: [],
                closingSoon: [],
                fastestMoving: []
            },
            error: "Failed fetching market intel"
        }, { status: 500, headers: { 'Cache-Control': 's-maxage=30' } });
    }
}
