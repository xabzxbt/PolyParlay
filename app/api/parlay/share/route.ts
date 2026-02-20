import { NextResponse } from "next/server";

// POST /api/parlay/share — Generate a shareable parlay link
// Stores parlay config and returns a short URL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { legs, stake, combinedOdds } = body;

    if (!legs || legs.length < 2) {
      return NextResponse.json({ success: false, error: "Need 2+ legs" }, { status: 400 });
    }

    // Generate unique share ID (in production, save to DB)
    const shareId = generateShareId();

    // Build share data
    const shareData = {
      id: shareId,
      legs: legs.map((l: any) => ({
        q: l.question?.slice(0, 80),
        side: l.side,
        price: l.price,
        marketId: l.marketId,
      })),
      stake,
      odds: combinedOdds,
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase if available
    try {
      const { supabase } = await import("@/lib/supabase/client");
      await supabase.from("shared_parlays").insert(shareData);
    } catch {
      // Supabase save is non-blocking — share link still works via OG route
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://polyparlay.app";

    return NextResponse.json({
      success: true,
      shareId,
      url: `${baseUrl}/s/${shareId}`,
      ogImage: `${baseUrl}/api/og?id=${shareId}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to share" }, { status: 500 });
  }
}

function generateShareId(): string {
  // Use crypto for secure random ID generation
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i++) id += chars[bytes[i] % chars.length];
  return id;
}
