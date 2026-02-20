import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all-time"; // weekly, monthly, all-time
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "100"));

    // We fetch the top users by total_pnl
    let query = supabase
      .from("leaderboard")
      .select("*")
      .order("total_pnl", { ascending: false })
      .limit(limit);

    if (period === "weekly") {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("updated_at", lastWeek);
    } else if (period === "monthly") {
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("updated_at", lastMonth);
    }

    const { data: traders, error } = await query;

    if (error) throw error;

    // Optional: map to frontend expected format
    const mappedTraders = traders?.map((t: any, index: number) => ({
      rank: t.rank || index + 1,
      wallet: t.user_address,
      name: `Trader ${t.user_address.slice(0, 6)}`,
      pnl: parseFloat(t.total_pnl || "0"),
      volume: 0, // Not tracked in leaderboard table
      winRate: parseFloat(t.win_rate || "0"),
      trades: parseInt(t.total_trades || "0"),
      image: "",
      xUsername: "",
      verified: false,
      profileUrl: `/profile/${t.user_address}`,
    }));

    // If win_rate needs dynamic calculation from parlays, we could do it here,
    // but the schema has win_rate built-in, so we return it directly.

    return NextResponse.json({ success: true, traders: mappedTraders || [], period, category: "OVERALL" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Leaderboard unavailable" }, { status: 500 });
  }
}
