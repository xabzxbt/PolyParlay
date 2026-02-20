import { NextResponse } from "next/server";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const interval = searchParams.get("interval") || "1d";
    const fidelity = searchParams.get("fidelity") || "30";

    if (!tokenId) {
      return NextResponse.json({ success: false, error: "tokenId required" }, { status: 400 });
    }

    const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) {
      return NextResponse.json({ success: true, history: [] });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      history: data.history || data || [],
    }, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ success: true, history: [] });
  }
}
