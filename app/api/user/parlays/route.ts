import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

// GET /api/user/parlays?address=0x... — Fetch user's parlays
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ success: false, error: "address required" }, { status: 400 });
  }

  try {
    const { data: parlays, error } = await supabase
      .from("parlays")
      .select("*")
      .eq("user_address", address)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const total = parlays?.length || 0;
    const active = parlays?.filter((p) => p.status === "open").length || 0;
    const won = parlays?.filter((p) => p.status === "won").length || 0;
    const lost = parlays?.filter((p) => p.status === "lost").length || 0;
    const totalStaked = parlays?.reduce((sum, p) => sum + Number(p.stake || 0), 0) || 0;
    const totalWon = parlays?.reduce((sum, p) => sum + Number(p.payout || 0), 0) || 0;
    const winRate = total > 0 ? (won / total) * 100 : 0;

    return NextResponse.json({
      success: true,
      parlays: parlays || [],
      stats: { total, active, won, lost, totalStaked, totalWon, winRate },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch parlays" }, { status: 500 });
  }
}

// POST /api/user/parlays — Save a new parlay to database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, legs, stake, combinedOdds, potentialPayout, orderResults } = body;

    if (!address || !legs?.length) {
      return NextResponse.json({ success: false, error: "Invalid parlay data" }, { status: 400 });
    }

    const marketsPayload = legs.map((leg: any, i: number) => ({
      ...leg,
      orderId: orderResults?.[i]?.orderId,
      shares: orderResults?.[i]?.shares,
      status: orderResults?.[i]?.success ? "FILLED" : "PENDING",
      combinedOdds,
      potentialPayout,
    }));

    const { data, error } = await supabase
      .from("parlays")
      .insert({
        user_address: address,
        markets: marketsPayload,
        stake: stake,
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      parlayId: data.id,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save parlay" }, { status: 500 });
  }
}

// PATCH /api/user/parlays
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, payout } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "id and status required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("parlays")
      .update({
        status,
        payout: payout || 0,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, parlay: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update parlay" }, { status: 500 });
  }
}
