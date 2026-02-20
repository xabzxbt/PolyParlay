import { NextResponse } from "next/server";
import {
    WhaleTrade,
    groupWhaleTradesByMarket,
    calculateWhaleConfidence,
    getWhaleSentiment
} from "@/lib/analytics/whale-detector";

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const minSize = parseFloat(searchParams.get("minSize") || "10000"); // default to 10k
        const period = searchParams.get("period") || "24h";
        const takerAddress = searchParams.get("taker_address");
        const assetId = searchParams.get("asset_id");

        let msToSubtract = 24 * 60 * 60 * 1000;
        if (period === "1h") msToSubtract = 60 * 60 * 1000;
        else if (period === "7d") msToSubtract = 7 * 24 * 60 * 60 * 1000;

        const startTs = Math.floor((Date.now() - msToSubtract) / 1000);

        // Build URL for public Data API
        let url = `https://data-api.polymarket.com/trades?limit=1000`;
        // While startTs might not strictly filter on all data-api nodes, we pass it and filter client-side
        url += `&startTs=${startTs}`;
        if (takerAddress) url += `&user=${takerAddress}`;
        if (assetId) url += `&asset_id=${assetId}`;

        const response = await fetch(url, {
            next: { revalidate: 30 }
        });

        if (!response.ok) {
            throw new Error(`Data API trades failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return NextResponse.json({ success: true, trades: [], marketActivity: [] });
        }

        const trades: WhaleTrade[] = [];

        // Parse real trades
        data.forEach((trade: any) => {
            const tradeTs = parseInt(trade.timestamp || "0");
            // Hard filter by time (fallback if API doesn't filter properly)
            if (tradeTs < startTs) return;

            const usdVolume = (parseFloat(trade.size || "0") * parseFloat(trade.price || "0"));
            if (usdVolume >= minSize) {
                // Determine direction based on side and outcome
                let direction = "YES";
                const isBuy = trade.side === "BUY";
                const outcomeString = (trade.outcome || "").toUpperCase();

                if (outcomeString === "YES" || outcomeString === "UP") {
                    direction = isBuy ? "YES" : "NO";
                } else if (outcomeString === "NO" || outcomeString === "DOWN") {
                    direction = isBuy ? "NO" : "YES";
                } else {
                    direction = isBuy ? "YES" : "NO";
                }

                trades.push({
                    id: trade.transactionHash || `${trade.conditionId}-${trade.timestamp}`,
                    marketId: trade.conditionId || trade.slug,
                    marketQuestion: trade.title || "Unknown Market",
                    side: direction as "YES" | "NO",
                    size: usdVolume,
                    price: parseFloat(trade.price || "0"),
                    timestamp: tradeTs * 1000,
                    traderAddress: trade.proxyWallet || trade.maker_address || "unknown",
                    isSmartMoney: false
                });
            }
        });

        // Group by market
        const grouped = groupWhaleTradesByMarket(trades);
        const marketActivity = Array.from(grouped.values()).map((activity) => ({
            ...activity,
            confidence: calculateWhaleConfidence(activity.whaleYesVolume, activity.whaleNoVolume),
            sentiment: getWhaleSentiment(
                calculateWhaleConfidence(activity.whaleYesVolume, activity.whaleNoVolume)
            ),
        }));

        return NextResponse.json({
            success: true,
            trades: trades.sort((a, b) => b.timestamp - a.timestamp),
            marketActivity,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to fetch whale activity" }, { status: 500 });
    }
}
