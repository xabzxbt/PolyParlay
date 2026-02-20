import { NextResponse } from "next/server";

const CLOB_BASE = "https://clob.polymarket.com";

export const dynamic = "force-dynamic";

// GET /api/proxy-wallet?address=0x123...
// Returns the Polymarket proxy wallet for a given EOA
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address") || "";

    if (!address) {
      return NextResponse.json({ success: false, error: "address required" }, { status: 400 });
    }

    const addrLower = address.toLowerCase();

    // Try CLOB API: GET /account-data/{address}
    try {
      const res = await fetch(`${CLOB_BASE}/account-data/${addrLower}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();

        // CLOB API returns: { address: "0xEOA", proxyWallet: "0xProxy", ... }
        const proxyWallet = data.proxyWallet || data.proxy || "";


        if (proxyWallet && proxyWallet !== "0x0000000000000000000000000000000000000000") {
          return NextResponse.json({
            success: true,
            proxyWallet,
            isRegistered: true,
            source: "clob_api",
          });
        }

        // Profile exists but no proxy yet (registration incomplete)
        if (data.address) {
          return NextResponse.json({
            success: false,
            proxyWallet: null,
            isRegistered: true,
            error: "Polymarket account found but proxy not deployed yet. Complete setup on polymarket.com.",
          });
        }
      }

      // 404 = not registered or no proxy yet
      if (res.status === 404) {
        // Return 200 so frontend doesn't see console errors
        return NextResponse.json({
          success: true,
          proxyWallet: null,
          isRegistered: false,
          error: null,
          source: "clob_api_404",
        });
      }

    } catch (err) {
    }

    // Fallback: Allow trading with EOA directly (no proxy)
    return NextResponse.json({
      success: true,
      proxyWallet: null, // null = use EOA directly
      isProxyItself: false,
      isRegistered: false,
      source: "fallback_eoa",
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
