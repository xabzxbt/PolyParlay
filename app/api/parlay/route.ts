import { NextResponse } from "next/server";
import { executeSignedParlay } from "@/lib/parlay/executor";
import { saveParlay } from "@/lib/db/json-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signedOrders, userAddress, totalStake, userCredentials } = body;



    if (!Array.isArray(signedOrders) || signedOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid orders" },
        { status: 400 },
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "Missing user address" },
        { status: 400 },
      );
    }

    if (!userCredentials?.apiKey || !userCredentials?.secret || !userCredentials?.passphrase) {

      return NextResponse.json(
        {
          success: false,
          error: "Trading session expired. Click 'Enable Trading' again.",
        },
        { status: 401 },
      );
    }

    const fullUserCredentials = {
      ...userCredentials,
      address: userAddress,
    };

    const result = await executeSignedParlay(
      signedOrders,
      userAddress,
      fullUserCredentials,
    );

    if (result.success) {
      const accepted = result.orders.filter((o) => o.success).length;

      // ✅ SAVE TO DB
      if (body.legs) {
        try {
          saveParlay({
            id: Date.now().toString(),
            userAddress: body.userAddress,
            createdAt: new Date().toISOString(),
            stake: body.totalStake,
            combinedOdds: body.totalOdds || 0,
            potentialPayout: body.potentialPayout || 0,
            status: "active",
            legs: body.legs.map((l: any) => ({
              marketId: l.marketId,
              question: l.question,
              side: l.side,
              price: l.price,
              tokenId: l.tokenId,
              status: "pending",
              outcome: l.outcome || "?",
            })),
          });
        } catch (e) {
          // DB Save Error silently handled
        }
      }

      return NextResponse.json({
        success: true,
        accepted,
        rejected: result.orders.length - accepted,
        orders: result.orders,
      });
    }

    return NextResponse.json(
      { success: false, error: result.errors[0] || "Failed to submit parlay" },
      { status: 500 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
