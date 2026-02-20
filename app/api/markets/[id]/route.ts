import { NextResponse } from "next/server";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${GAMMA_BASE}/markets?id=${params.id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`Gamma ${res.status}`);
    const markets = await res.json();

    if (!markets.length) {
      return NextResponse.json({ success: false, error: "Market not found" }, { status: 404 });
    }

    const m = markets[0];
    let prices: number[], tokenIds: string[];
    try { prices = JSON.parse(m.outcomePrices); } catch { prices = [0.5, 0.5]; }
    try { tokenIds = JSON.parse(m.clobTokenIds); } catch { tokenIds = ["", ""]; }

    return NextResponse.json({
      success: true,
      market: {
        id: m.id,
        conditionId: m.conditionId,
        question: m.question,
        description: m.description || "",
        yesPrice: prices[0] ?? 0.5,
        noPrice: prices[1] ?? 0.5,
        volume: parseFloat(m.volume) || 0,
        volume24hr: parseFloat(m.volume24hr || "0") || 0,
        liquidity: parseFloat(m.liquidity) || 0,
        endDate: m.endDate,
        yesTokenId: tokenIds[0] ?? "",
        noTokenId: tokenIds[1] ?? "",
        active: m.active,
        closed: m.closed,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch market" }, { status: 500 });
  }
}
