import { NextResponse } from "next/server";

export const revalidate = 60; // 60s cache for whales

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get("limit") || "1000";
        const startTs = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

        const response = await fetch(`https://data-api.polymarket.com/trades?limit=${limit}&startTs=${startTs}`, {
            next: { revalidate: 60 }
        });

        if (!response.ok) throw new Error("Fetch failed");

        const data = await response.json();

        let largeTrades: any[] = [];
        let walletVolumes: Record<string, number> = {};
        let smartestWallets = [];

        data.forEach((t: any) => {
            const usd = parseFloat(t.size || "0") * parseFloat(t.price || "0");
            const w = t.proxyWallet || t.maker_address || "unknown";

            if (!walletVolumes[w]) walletVolumes[w] = 0;
            walletVolumes[w] += usd;

            if (usd > 1000) {
                largeTrades.push({
                    ...t,
                    usdValue: usd,
                    timestamp: parseInt(t.timestamp || "0") * 1000
                });
            }
        });

        const topWallets = Object.entries(walletVolumes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([address, volume]) => ({ address, volume }));

        return NextResponse.json({
            success: true,
            data: {
                largeTrades: largeTrades.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50),
                topWallets,
                smartMoneyFlow: [] // Requires deep per-wallet PnL analysis — returns empty until implemented
            },
            lastUpdated: new Date().toISOString()
        }, {
            headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
        });
    } catch (err) {
        return NextResponse.json({
            success: false,
            data: { largeTrades: [], topWallets: [] }
        }, { status: 500 });
    }
}
