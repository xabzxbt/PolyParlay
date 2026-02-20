import { NextResponse } from "next/server";
import { calculateEdgeScore, EdgeScoreInput } from "@/lib/analytics/edge-score";
import { getActiveMarkets } from "@/lib/polymarket/gamma";

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");

        // We fetch current active markets using centralized gamma logic
        const activeMarkets = await getActiveMarkets({ limit, order: "volume24hr", ascending: false });

        if (!activeMarkets || activeMarkets.length === 0) {
            return NextResponse.json({ success: true, marketsWithEdge: [], topOpportunities: [], hotOpportunities: [] });
        }

        // Evaluate Edge Scores
        const marketsWithEdge = activeMarkets.map((market) => {
            const endDate = new Date(market.endDate || Date.now() + 86400000);
            const daysRemaining = Math.max(0, (endDate.getTime() - Date.now()) / 86400000);

            // Default whale confidence — real whale data requires cross-referencing whale-tracker endpoint
            const whaleConfidence = 0.5;

            const edgeInput: EdgeScoreInput = {
                posterior: market.yesPrice || 0.5, // simplified
                marketPrice: market.yesPrice || 0.5,
                liquidity: market.liquidity || 0,
                whaleConfidence,
                daysRemaining,
                volume24h: market.volume24hr || market.volume || 0,
                avgVolume7d: (market.volume24hr || market.volume || 0) * 0.8,
            };

            const edgeScore = calculateEdgeScore(edgeInput);

            return {
                id: market.id || market.conditionId,
                question: market.question || "",
                slug: market.eventSlug || "",
                yesPrice: market.yesPrice || 0.5,
                noPrice: market.noPrice || 0.5,
                volume24hr: market.volume24hr || market.volume || 0,
                liquidity: market.liquidity || 0,
                endDate: market.endDate || "",
                category: market.category || "other",
                edgeScore,
            };
        }).sort((a, b) => b.edgeScore.total - a.edgeScore.total);

        return NextResponse.json({
            success: true,
            marketsWithEdge,
            topOpportunities: marketsWithEdge.slice(0, 5),
            hotOpportunities: marketsWithEdge.filter((m) => m.edgeScore.rating === "HOT"),
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to calculate edge scores" }, { status: 500 });
    }
}
