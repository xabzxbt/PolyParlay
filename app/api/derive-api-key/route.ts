import { NextResponse } from "next/server";

const CLOB_BASE = "https://clob.polymarket.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, signature, timestamp, nonce } = body;

    // Validate input
    if (!address || !signature || !timestamp) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Construct headers for Polymarket API
    // Note: We use standard fetch here. Node.js environment usually preserves underscores in headers.
    const headers = {
      "POLY_ADDRESS": address,
      "POLY_SIGNATURE": signature,
      "POLY_TIMESTAMP": timestamp.toString(),
      "POLY_NONCE": (nonce || 0).toString(),
    };


    // 1. Try to DERIVE existing credentials (GET)
    let res = await fetch(`${CLOB_BASE}/auth/derive-api-key`, {
      method: "GET",
      headers: headers as Record<string, string>,
    });

    let data = await res.json();

    // 2. Fallback: If not found or cannot derive, try to CREATE new credentials (POST)
    // "Could not derive api key!" is the specific error when keys don't exist yet for this nonce/signature
    if (!res.ok && (res.status === 404 || JSON.stringify(data).includes("Could not derive"))) {

      res = await fetch(`${CLOB_BASE}/auth/api-key`, {
        method: "POST",
        headers: headers as Record<string, string>,
      });

      data = await res.json();
    }

    // Check final result
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to obtain API key" },
        { status: res.status },
      );
    }

    return NextResponse.json({
      success: true,
      apiKey: data.apiKey,
      secret: data.secret,
      passphrase: data.passphrase,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
