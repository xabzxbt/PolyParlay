import { NextResponse } from "next/server";
import { getActiveEvents, getActiveMarkets, fetchRelatedTags, fetchTrendingTags } from "@/lib/polymarket/gamma";

// ✅ ФІКС: вимкнути кеш бо Gamma API >2MB
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 30; // max 30s для serverless

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Sub-tags
    if (type === "subtags") {
      const tagId = parseInt(searchParams.get("tag_id") || "0");
      const tags = tagId ? await fetchRelatedTags(tagId) : await fetchTrendingTags();
      return NextResponse.json({ success: true, tags });
    }

    const limit = parseInt(searchParams.get("limit") || "50");
    const tagId = searchParams.get("tag_id") ? parseInt(searchParams.get("tag_id")!) : undefined;
    const order = searchParams.get("order") || "volume24hr";
    const ascending = searchParams.get("ascending") === "true";

    // Events grouped (default)
    if (type === "events" || !type) {
      const { events, stats } = await getActiveEvents({ limit, tagId, order, ascending });
      return NextResponse.json({ success: true, events, stats });
    }

    // Flat markets (legacy)
    if (type === "flat") {
      const markets = await getActiveMarkets({ limit, tagId, order, ascending });
      return NextResponse.json({ success: true, markets, count: markets.length });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch markets" }, { status: 500 });
  }
}
