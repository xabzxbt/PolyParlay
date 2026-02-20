import { NextResponse } from "next/server";
import {
    generateBuilderHeaders,
    generateUserL2Headers,
    validateBuilderCredentials,
} from "@/lib/polymarket/builder-sign";

const CLOB_BASE = "https://clob.polymarket.com";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/cancel-order
 * 
 * Cancels an open order on the Polymarket CLOB.
 * 
 * Body: {
 *   orderID: string,           // ID of the order to cancel
 *   userCredentials: {
 *     apiKey, secret, passphrase, address
 *   }
 * }
 */
export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { orderID, userCredentials } = body;

        if (!orderID) {
            return NextResponse.json(
                { success: false, error: "Missing orderID" },
                { status: 400 }
            );
        }

        if (!userCredentials?.apiKey || !userCredentials?.secret) {
            return NextResponse.json(
                { success: false, error: "Missing credentials" },
                { status: 401 }
            );
        }

        const { valid, missing } = validateBuilderCredentials();
        if (!valid) {
            return NextResponse.json(
                { success: false, error: `Builder not configured: ${missing.join(", ")}` },
                { status: 500 }
            );
        }

        const path = "/order";
        const payload = { id: orderID };
        const bodyStr = JSON.stringify(payload);

        // Generate auth headers — cancel uses DELETE method
        const userHeaders = generateUserL2Headers(
            userCredentials.address,
            userCredentials.apiKey,
            userCredentials.secret,
            userCredentials.passphrase,
            "DELETE",
            path,
            bodyStr
        );

        const builderHeaders = generateBuilderHeaders("DELETE", path, bodyStr);


        const res = await fetch(`${CLOB_BASE}${path}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...userHeaders,
                ...builderHeaders,
            },
            body: bodyStr,
        });

        const responseText = await res.text().catch(() => "");

        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: `Cancel failed: ${responseText.slice(0, 200)}` },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Internal error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/cancel-order
 * 
 * Cancels ALL open orders for a user.
 * 
 * Body: {
 *   userCredentials: { apiKey, secret, passphrase, address }
 * }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userCredentials } = body;

        if (!userCredentials?.apiKey) {
            return NextResponse.json(
                { success: false, error: "Missing credentials" },
                { status: 401 }
            );
        }

        const { valid } = validateBuilderCredentials();
        if (!valid) {
            return NextResponse.json(
                { success: false, error: "Builder not configured" },
                { status: 500 }
            );
        }

        const path = "/cancel-all";

        const userHeaders = generateUserL2Headers(
            userCredentials.address,
            userCredentials.apiKey,
            userCredentials.secret,
            userCredentials.passphrase,
            "DELETE",
            path,
        );

        const builderHeaders = generateBuilderHeaders("DELETE", path);


        const res = await fetch(`${CLOB_BASE}${path}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...userHeaders,
                ...builderHeaders,
            },
        });

        const responseText = await res.text().catch(() => "");

        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: `Cancel all failed: ${responseText.slice(0, 200)}` },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Internal error" },
            { status: 500 }
        );
    }
}
