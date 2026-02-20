import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

export const dynamic = "force-dynamic";

interface TraderProfile {
    address: string;
    proxyWallet: string;
    name: string;
    profileImage: string;
    pnl: number;
    volume: number;
    marketsTraded: number;
    side: "YES" | "NO" | "BOTH";
    positionSize: number;
    positionValue: number;
    avgPrice: number;
    tradeCount: number;
    firstTrade: string | null;
    isNew: boolean;
    profileUrl: string;
    dataSource: "holders" | "trades";
}

interface PnlTier {
    label: string;
    min: number;
    max: number;
    yesTraders: TraderProfile[];
    noTraders: TraderProfile[];
    totalYesSize: number;
    totalNoSize: number;
}

// Helper to fetch trades with deep paging
async function fetchAllTrades(tokenId: string): Promise<any[]> {
    try {
        const allTrades: any[] = [];
        let offset = 0;
        let remaining = 50000; // scan deep

        while (remaining > 0) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            try {
                const res = await fetch(`${DATA_API}/trades?asset_id=${tokenId}&limit=1000&offset=${offset}`, {
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                    cache: "no-store",
                });
                clearTimeout(timeout);

                if (!res.ok) break;
                const data = await res.json();

                if (!Array.isArray(data) || data.length === 0) break;
                allTrades.push(...data);

                if (data.length < 1000) break; // Last page
                offset += 1000;
                remaining -= 1000;

            } catch (err) {
                clearTimeout(timeout);
                break;
            }
        }
        return allTrades;
    } catch { return []; }
}

// GET /api/market-traders?condition_id=X&yes_token=Y&no_token=Z&yes_price=0.65
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conditionId = searchParams.get("condition_id") || "";
        const yesToken = searchParams.get("yes_token") || "";
        const noToken = searchParams.get("no_token") || "";
        const yesPrice = parseFloat(searchParams.get("yes_price") || "0.5");
        const noPrice = 1 - yesPrice;

        if (!yesToken && !noToken) {
            return NextResponse.json({ success: false, error: "yes_token or no_token required" }, { status: 400 });
        }

        // === 1. Fetch REAL Holders (Source of Truth) ===
        let holdersData: any[] = [];
        let resolvedConditionId = conditionId;

        if (!resolvedConditionId && (yesToken || noToken)) {
            try {
                const tRes = await fetch(`${DATA_API}/trades?asset_id=${yesToken || noToken}&limit=1`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
                if (Array.isArray(tRes) && tRes.length > 0) resolvedConditionId = tRes[0].conditionId;
            } catch { }
        }

        if (resolvedConditionId) {
            try {
                const hRes = await fetch(`${DATA_API}/holders?market=${resolvedConditionId}&limit=500`, { signal: AbortSignal.timeout(8000) }).then(r => r.json());
                if (Array.isArray(hRes)) holdersData = hRes;
            } catch { }
        }

        // Map holders
        const holdersMap = new Map<string, { yesShares: number; noShares: number; name: string; image: string }>();
        for (const grp of holdersData) {
            for (const h of grp.holders) {
                const addr = (h.proxyWallet || "").toLowerCase();
                if (!addr) continue;

                const existing = holdersMap.get(addr) || { yesShares: 0, noShares: 0, name: "", image: "" };

                const name = h.name && !h.name.startsWith("0x") ? h.name : (h.pseudonym || h.name || "");
                existing.name = name;
                existing.image = h.profileImageOptimized || h.profileImage || "";

                if (h.outcomeIndex === 0) existing.yesShares += h.amount || 0;
                else existing.noShares += h.amount || 0;

                holdersMap.set(addr, existing);
            }
        }

        // === 2. Fetch Trades for PnL ===
        const [yesTrades, noTrades] = await Promise.all([
            yesToken ? fetchAllTrades(yesToken) : [],
            noToken ? fetchAllTrades(noToken) : [],
        ]);

        const allTradesRaw = [...yesTrades, ...noTrades];

        // Aggregate stats
        const statsMap = new Map<string, {
            netInvested: number; // (Buys - Sells)
            volume: number;
            count: number;
            firstTime: string;
            name: string;
            image: string;
        }>();

        for (const t of allTradesRaw) {
            const addr = (t.proxyWallet || t.maker_address || "").toLowerCase();
            if (!addr) continue;

            const size = parseFloat(t.size || "0");
            const price = parseFloat(t.price || "0");
            const usd = size * price;

            const s = statsMap.get(addr) || {
                netInvested: 0, volume: 0, count: 0,
                firstTime: "", name: "", image: ""
            };

            s.volume += usd;
            s.count++;

            if (t.side === "BUY") s.netInvested += usd;
            else s.netInvested -= usd;

            const ts = t.timestamp ? new Date(t.timestamp * 1000).toISOString() : new Date().toISOString();
            if (!s.firstTime || ts < s.firstTime) s.firstTime = ts;

            if (!s.name) {
                const name = t.name && !t.name.startsWith("0x") ? t.name : (t.pseudonym || t.name || "");
                s.name = name;
                s.image = t.profileImageOptimized || t.profileImage || "";
            }
            statsMap.set(addr, s);
        }

        // === 3. Build Profiles ===
        const allTraders: TraderProfile[] = [];
        const processed = new Set<string>();

        // Holders
        for (const [addr, h] of holdersMap) {
            processed.add(addr);
            const stats = statsMap.get(addr);

            const netYes = h.yesShares;
            const netNo = h.noShares;

            let side: "YES" | "NO" | "BOTH" = "BOTH";
            if (netYes > 10 && netNo <= 10) side = "YES";
            else if (netNo > 10 && netYes <= 10) side = "NO";
            else if (netYes > 10 && netNo > 10) side = "BOTH";
            else if (netYes < 1 && netNo < 1) continue;

            const posValue = (netYes * yesPrice) + (netNo * noPrice);
            const posSize = netYes + netNo;

            // PnL = Current Value - Net Invested
            // If no trades found (netInvested missing), assume netInvested is 0 (mint/transfer) -> PnL is full value
            // Or indicate 0 if truly unknown. Let's use simple logic:
            const netInvested = stats ? stats.netInvested : 0;
            const pnl = posValue - netInvested;

            allTraders.push({
                address: addr,
                proxyWallet: addr,
                name: h.name || stats?.name || `${addr.slice(0, 6)}...`,
                profileImage: h.image || stats?.image || "",
                pnl: Math.round(pnl * 100) / 100,
                volume: Math.round(stats?.volume || 0),
                marketsTraded: 0,
                side,
                positionSize: Math.round(posSize),
                positionValue: Math.round(posValue),
                avgPrice: 0,
                tradeCount: stats?.count || 0,
                firstTrade: stats?.firstTime || null,
                isNew: false,
                profileUrl: `https://polymarket.com/profile/${addr}`,
                dataSource: "holders"
            });
        }

        // Trade-only (closed positions)
        for (const [addr, stats] of statsMap) {
            if (processed.has(addr)) continue;

            // 0 holdings, calculate realized PnL
            // Realized PnL = (Sells - Buys) = -NetInvested
            const pnl = -stats.netInvested;

            // Skip dust
            if (Math.abs(pnl) < 1 && stats.volume < 10) continue;

            const isYes = stats.netInvested > 0; // heuristic

            allTraders.push({
                address: addr,
                proxyWallet: addr,
                name: stats.name || `${addr.slice(0, 6)}...`,
                profileImage: stats.image || "",
                pnl: Math.round(pnl * 100) / 100,
                volume: Math.round(stats.volume),
                marketsTraded: 0,
                side: "BOTH",
                positionSize: 0,
                positionValue: 0,
                avgPrice: 0,
                tradeCount: stats.count,
                firstTrade: stats.firstTime,
                isNew: false,
                profileUrl: `https://polymarket.com/profile/${addr}`,
                dataSource: "trades"
            });
        }

        // === 4. Tiers ===
        // Define tiers for Win/Loss visualization
        const tierDefs = [
            { label: "$10k+", min: 10_000, max: Infinity },
            { label: "$1k - $10k", min: 1_000, max: 10_000 },
            { label: "$100 - $1k", min: 100, max: 1_000 },
            { label: "$0 - $100", min: 0, max: 100 },
            { label: "Losses < $100", min: -100, max: 0 },
            { label: "Losses > $100", min: -Infinity, max: -100 },
        ];

        const tiers: PnlTier[] = tierDefs.map(def => {
            const yesTraders = allTraders
                .filter(t => t.side === "YES" && t.pnl >= def.min && t.pnl < def.max)
                .sort((a, b) => b.positionSize - a.positionSize).slice(0, 20);

            const noTraders = allTraders
                .filter(t => t.side === "NO" && t.pnl >= def.min && t.pnl < def.max)
                .sort((a, b) => b.positionSize - a.positionSize).slice(0, 20);

            return {
                label: def.label,
                min: def.min,
                max: def.max,
                yesTraders,
                noTraders,
                totalYesSize: yesTraders.reduce((s, t) => s + t.positionSize, 0),
                totalNoSize: noTraders.reduce((s, t) => s + t.positionSize, 0),
            };
        });

        // Add "Unknown PnL" tier for big holders with no trade history
        const unknownPnlTraders = allTraders.filter(t => t.tradeCount === 0 && t.positionValue > 100);
        if (unknownPnlTraders.length > 0) {
            const yesUnk = unknownPnlTraders.filter(t => t.side === "YES").sort((a, b) => b.positionSize - a.positionSize);
            const noUnk = unknownPnlTraders.filter(t => t.side === "NO").sort((a, b) => b.positionSize - a.positionSize);

            if (yesUnk.length > 0 || noUnk.length > 0) {
                tiers.push({
                    label: "Unknown PnL (Holders)",
                    min: 0, max: 0,
                    yesTraders: yesUnk,
                    noTraders: noUnk,
                    totalYesSize: yesUnk.reduce((s, t) => s + t.positionSize, 0),
                    totalNoSize: noUnk.reduce((s, t) => s + t.positionSize, 0),
                });
            }
        }

        const nonEmptyTiers = tiers.filter(t => t.yesTraders.length > 0 || t.noTraders.length > 0);

        // Find "New Accounts" - first trade < 7 days ago
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const newAccountAlerts = allTraders
            .filter(t => t.firstTrade && t.firstTrade > sevenDaysAgo && t.positionValue > 50)
            .sort((a, b) => b.positionValue - a.positionValue)
            .slice(0, 5);

        // "Whales" - large positions > $5k
        const whaleAlerts = allTraders
            .filter(t => t.positionValue > 5000)
            .sort((a, b) => b.positionValue - a.positionValue)
            .slice(0, 10);

        const totalYesTraders = allTraders.filter(t => t.side === "YES").length;
        const totalNoTraders = allTraders.filter(t => t.side === "NO").length;

        return NextResponse.json({
            success: true,
            tiers: nonEmptyTiers,
            newAccountAlerts,
            whaleAlerts,
            allTraders: allTraders.sort((a, b) => b.positionValue - a.positionValue).slice(0, 100),
            summary: {
                totalTraders: holdersMap.size,
                totalYesTraders,
                totalNoTraders,
                totalYesSize: 0,
                totalNoSize: 0,
                newAccountCount: newAccountAlerts.length,
            },
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: String(error),
            tiers: [], newAccountAlerts: [], whaleAlerts: [], allTraders: [],
            summary: { totalTraders: 0, totalYesTraders: 0, totalNoTraders: 0, totalYesSize: 0, totalNoSize: 0, newAccountCount: 0 }
        });
    }
}
