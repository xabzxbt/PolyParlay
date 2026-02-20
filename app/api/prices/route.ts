import { NextResponse } from "next/server";
import { getPrice } from "@/lib/polymarket/clob";

export async function POST(request: Request) {
  try {
    const { tokenIds } = await request.json();
    if (!tokenIds || !Array.isArray(tokenIds)) {
      return NextResponse.json({ success: false, error: "tokenIds array required" }, { status: 400 });
    }

    const prices: Record<string, number> = {};
    await Promise.all(
      tokenIds.map(async (id: string) => {
        try { prices[id] = await getPrice(id); } catch {}
      })
    );

    return NextResponse.json({ success: true, prices });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch prices" }, { status: 500 });
  }
}
