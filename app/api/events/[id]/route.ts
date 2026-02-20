import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/polymarket/gamma";

// GET /api/events/:id — single event with all markets + metadata
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEventDetail(params.id);

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 });
  }
}
