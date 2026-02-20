import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("market_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!marketId) {
      return NextResponse.json({ success: false, error: "market_id required" }, { status: 400 });
    }

    const { data: comments, error } = await supabase
      .from("comments")
      .select("*")
      .eq("market_id", marketId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      comments: comments || [],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { market_id, user_address, text } = body;

    if (!market_id || !user_address || !text) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        market_id,
        user_address,
        text,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, comment: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to post comment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id, user_address } = body;

    if (!id || !user_address) {
      return NextResponse.json({ success: false, error: "id and user_address required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("comments")
      .delete()
      .match({ id, user_address })
      .select()
      .single();

    if (error) throw error;

    // If no data is returned, it means either the comment doesn't exist or it doesn't belong to the user
    if (!data) {
      return NextResponse.json({ success: false, error: "Unauthorized or not found" }, { status: 403 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete comment" }, { status: 500 });
  }
}
