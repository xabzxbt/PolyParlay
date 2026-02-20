import { NextResponse } from "next/server";
import { getActiveEvents } from "@/lib/polymarket/gamma";

export const dynamic = "force-dynamic";

// GET /api/events — list all active events (grouped)
// Backward compatible: does NOT change existing /api/markets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const tagId = searchParams.get("tag_id") ? parseInt(searchParams.get("tag_id")!) : undefined;
    const order = searchParams.get("order") || "volume24hr";
    const ascending = searchParams.get("ascending") === "true";

    const { events, stats } = await getActiveEvents({ limit, tagId, order, ascending });

    return NextResponse.json({
      success: true,
      events,
      stats,
      count: events.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}
