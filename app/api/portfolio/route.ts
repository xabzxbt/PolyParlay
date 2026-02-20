import { NextResponse } from "next/server";
import { generateUserL2Headers } from "@/lib/polymarket/builder-sign";

const CLOB_BASE = "https://clob.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userCredentials } = body;

        if (!userCredentials?.apiKey || !userCredentials?.secret) {
            return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 401 });
        }

        const { address, apiKey, secret, passphrase } = userCredentials;

        if (!address) {
            return NextResponse.json({ success: false, error: "Missing wallet address in credentials" }, { status: 400 });
        }

        // Try to fetch Proxy Wallet (if any)
        const proxyWallet = await fetchProxyAddress(address);

        const safeAddr = typeof address === 'string' ? address.slice(0, 6) : '???';
        const safeProxy = (proxyWallet && typeof proxyWallet === 'string') ? proxyWallet.slice(0, 6) : '';

        // Parallel fetch: Open Orders & Positions (for BOTH execution paths)
        const [ordersResult, positionsResult, proxyPositionsResult] = await Promise.allSettled([
            fetchOpenOrders(address, apiKey, secret, passphrase),
            fetchPositions(address),
            proxyWallet ? fetchPositions(proxyWallet) : Promise.resolve([]),
        ]);

        const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
        const eoaPositions = positionsResult.status === "fulfilled" ? positionsResult.value : [];
        const proxyPositions = proxyPositionsResult.status === "fulfilled" ? (proxyPositionsResult.value as Record<string, unknown>[]) : [];



        // Combine positions (unique by asset_id, prioritize proxy if duplicate?)
        // Usually positions should be on one or the other.
        const rawPositions = [...eoaPositions, ...proxyPositions];

        if (ordersResult.status === "rejected") {
        }

        // Filter small dust positions
        const activePositions = rawPositions.filter((p: any) => parseFloat(p.size) > 0.001);
        const totalPositions = activePositions.length;

        // Safety cap at 200 positions
        const cappedPositions = activePositions.slice(0, 200);

        // 1. Collect ALL unique token IDs
        const posTokens = cappedPositions.map((p: any) => p.asset_id);
        const ordTokens = Array.isArray(orders) ? orders.map((o: any) => o.asset_id) : [];
        const uniqueTokens = [...new Set([...posTokens, ...ordTokens])];

        // 2. Fetch Market Data for all tokens
        const marketsMap = await fetchMarketsMap(uniqueTokens);

        // 3. Enrich Positions
        const enrichedPositions = cappedPositions.map((p: any) => {
            const m = marketsMap.get(p.asset_id);
            const size = parseFloat(p.size);
            const details = getMarketDetails(m, p.asset_id);

            return {
                tokenId: p.asset_id,
                size,
                valueUsd: size * (details.price || 0),
                market: m ? {
                    question: m.question,
                    image: m.image || m.icon,
                    slug: m.slug,
                    outcome: details.outcome,
                    currentPrice: details.price,
                    conditionId: m.conditionId,
                    active: m.active,
                    closed: m.closed,
                    resolved: m.resolvedBy, // non-null if resolved
                } : null
            };
        });

        // 4. Enrich Orders
        const enrichedOrders = Array.isArray(orders) ? orders.map((o: any) => {
            const m = marketsMap.get(o.asset_id);
            const details = getMarketDetails(m, o.asset_id);
            return {
                ...o,
                market: m ? {
                    question: m.question,
                    slug: m.slug,
                    image: m.image || m.icon,
                    outcome: details.outcome,
                } : null
            };
        }) : [];

        // Sort positions by value desc
        enrichedPositions.sort((a: any, b: any) => b.valueUsd - a.valueUsd);

        return NextResponse.json({
            success: true,
            orders: enrichedOrders,
            positions: enrichedPositions,
            totalPositions
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// === Helpers ===

async function fetchOpenOrders(address: string, apiKey: string, secret: string, passphrase: string) {
    const path = "/data/orders";
    const headers = generateUserL2Headers(address, apiKey, secret, passphrase, "GET", path);
    const res = await fetch(`${CLOB_BASE}${path}`, { headers: headers as unknown as Record<string, string>, cache: "no-store" });
    if (!res.ok) throw new Error(`Orders: ${res.status}`);
    return res.json();
}

async function fetchPositions(address: string) {
    const res = await fetch(`${DATA_API}/positions?user=${address}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Positions: ${res.status}`);
    return res.json();
}

async function fetchMarketsMap(tokenIds: string[]) {
    const map = new Map();
    const failedTokens: string[] = [];

    // Process in chunks to avoid rate limits
    const CHUNK_SIZE = 20;

    // Safety cap is handled before this function
    const tokensToFetch = tokenIds;

    for (let i = 0; i < tokensToFetch.length; i += CHUNK_SIZE) {
        const chunk = tokensToFetch.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (tid) => {
            try {
                const res = await fetch(`${GAMMA_API}/markets?clob_token_id=${tid}`, {
                    signal: AbortSignal.timeout(5000) // 5s timeout per request
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) map.set(tid, data[0]);
                } else {
                    failedTokens.push(tid);
                }
            } catch (err: any) {
                if (err.name === "AbortError" || err.name === "TimeoutError") {
                } else {
                }
                failedTokens.push(tid);
            }
        }));
    }

    // Log warning if some tokens failed but continue with partial data
    if (failedTokens.length > 0) {
    }

    return map;
}

function getMarketDetails(m: any, tokenId: string) {
    if (!m) return { outcome: "?", price: 0 };

    try {
        // Handle both string and array formats (Gamma API inconsistency)
        const tokens = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : (m.clobTokenIds || []);
        const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : (m.outcomes || []);
        const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : (m.outcomePrices || []);

        const idx = tokens.findIndex((t: string) => t.toLowerCase() === tokenId.toLowerCase());

        if (idx >= 0) {
            const rawPrice = prices[idx];
            // Ensure price is a number, handling strings like "0.55"
            let finalPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
            if (isNaN(finalPrice)) finalPrice = 0;


            return {
                outcome: outcomes[idx] || (idx === 0 ? "Yes" : "No"),
                price: finalPrice,
            };
        } else {
        }
    } catch (e) {
    }

    return { outcome: "?", price: 0 };
}

async function fetchProxyAddress(address: string): Promise<string | null> {
    try {
        const res = await fetch(`https://clob.polymarket.com/account-data/${address}`);
        if (res.ok) {
            const data = await res.json();
            return data.proxyWallet || data.proxy || null;
        }
    } catch { }
    return null;
}
