import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/polymarket/gamma";

// GET /api/events/:id/markets — markets within a specific event
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEventDetail(params.id);

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active_only") !== "false";

    let markets = event.markets;
    if (activeOnly) {
      markets = markets.filter((m) => m.active && m.yesPrice > 0.02 && m.yesPrice < 0.98);
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
      eventTitle: event.title,
      markets,
      count: markets.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch event markets" }, { status: 500 });
  }
}
