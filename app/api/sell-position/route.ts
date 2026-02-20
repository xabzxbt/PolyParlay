import { NextResponse } from "next/server";
import {
    generateBuilderHeaders,
    generateUserL2Headers,
    validateBuilderCredentials,
} from "@/lib/polymarket/builder-sign";

const CLOB_BASE = "https://clob.polymarket.com";

export const dynamic = "force-dynamic";

/**
 * POST /api/sell-position
 * 
 * Sells (closes) an existing position by creating a SELL order on the CLOB.
 * 
 * How Polymarket positions work:
 * 1. BUY order → user gets conditional tokens (YES or NO shares)
 * 2. Position is "open" until either:
 *    a. Market resolves → winning tokens auto-redeemed for USDC (on-chain)
 *    b. User SELLS tokens back on the CLOB → instant USDC
 * 3. This endpoint handles case (b) — selling tokens on the CLOB
 * 
 * Body: {
 *   signedOrder: SignedOrder,    // pre-signed SELL order from client
 *   userCredentials: {           // L2 API credentials
 *     apiKey, secret, passphrase, address
 *   },
 *   orderType?: "GTC" | "FOK",  // GTC = Good-Til-Cancelled, FOK = Fill-or-Kill
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { signedOrder, userCredentials, orderType = "GTC" } = body;

        if (!signedOrder || !userCredentials?.apiKey) {
            return NextResponse.json(
                { success: false, error: "Missing signed order or credentials" },
                { status: 400 }
            );
        }

        // Validate builder credentials
        const { valid, missing } = validateBuilderCredentials();
        if (!valid) {
            return NextResponse.json(
                { success: false, error: `Builder credentials not configured. Missing: ${missing.join(", ")}` },
                { status: 500 }
            );
        }

        // Convert numeric side to string
        const sideStr = signedOrder.side === 0 ? "BUY" : "SELL";

        // Parse salt safely (generateSalt produces 48-bit values)
        const saltNum = parseInt(signedOrder.salt, 10);

        const payload = {
            deferExec: false,
            order: {
                salt: saltNum,
                maker: signedOrder.maker,
                signer: signedOrder.signer,
                taker: signedOrder.taker,
                tokenId: signedOrder.tokenId,
                makerAmount: signedOrder.makerAmount,
                takerAmount: signedOrder.takerAmount,
                expiration: signedOrder.expiration,
                nonce: signedOrder.nonce,
                feeRateBps: signedOrder.feeRateBps,
                side: sideStr,
                signatureType: signedOrder.signatureType,
                signature: signedOrder.signature,
            },
            owner: userCredentials.apiKey,
            orderType,
        };

        const bodyStr = JSON.stringify(payload);
        const path = "/order";

        // Generate auth headers
        const userHeaders = generateUserL2Headers(
            userCredentials.address,
            userCredentials.apiKey,
            userCredentials.secret,
            userCredentials.passphrase,
            "POST",
            path,
            bodyStr
        );

        const builderHeaders = generateBuilderHeaders("POST", path, bodyStr);


        const res = await fetch(`${CLOB_BASE}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...userHeaders,
                ...builderHeaders,
            },
            body: bodyStr,
        });

        const responseText = await res.text().catch(() => "");

        if (!res.ok) {
            const lower = responseText.toLowerCase();
            let userMsg = `Sell order rejected: ${responseText.slice(0, 200)}`;

            if (lower.includes("insufficient") || lower.includes("balance")) {
                userMsg = "You don't have enough shares to sell. Check your position on polymarket.com";
            } else if (lower.includes("signature")) {
                userMsg = "Invalid signature. Try reconnecting your wallet.";
            } else if (lower.includes("unauthorized") || lower.includes("api key")) {
                userMsg = "Trading session expired. Click 'Enable Trading' again.";
            } else if (lower.includes("price") || lower.includes("tick")) {
                userMsg = "Price out of range. Adjust your sell price.";
            }

            return NextResponse.json({ success: false, error: userMsg }, { status: 400 });
        }

        try {
            const data = JSON.parse(responseText);
            return NextResponse.json({
                success: true,
                orderID: data.orderID || data.id || "submitted",
            });
        } catch {
            return NextResponse.json({ success: true, orderID: "submitted" });
        }
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/sell-position?address=0x...&token_id=...
 * 
 * Check the user's current position size for a given token.
 * Uses the CLOB balance endpoint.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");
        const tokenId = searchParams.get("token_id");

        if (!address || !tokenId) {
            return NextResponse.json(
                { success: false, error: "Missing address or token_id" },
                { status: 400 }
            );
        }

        // Fetch from Gamma API (shows on-chain positions)
        const ctfAddress = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
        const res = await fetch(
            `https://polygon-rpc.com`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{
                    to: ctfAddress,
                    data: `0x00fdd58e${address.slice(2).padStart(64, "0")}${BigInt(tokenId).toString(16).padStart(64, "0")}`,
                }, "latest"],
                id: 1,
            }),
        }
        );

        const data = await res.json();
        const balance = data.result ? parseInt(data.result, 16) / 1e6 : 0;

        return NextResponse.json({
            success: true,
            balance,
            tokenId,
            address,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message, balance: 0 },
            { status: 500 }
        );
    }
}
