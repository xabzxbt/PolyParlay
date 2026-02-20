import { NextResponse } from "next/server";
import { generateBuilderHeaders, generateUserL2Headers } from "@/lib/polymarket/builder-sign";

const CLOB_BASE = "https://clob.polymarket.com";

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await request.json();
        const { userCredentials } = body;

        if (!userCredentials?.address || !userCredentials?.apiKey) {
            return NextResponse.json({ success: false, error: "Missing L2 credentials" }, { status: 400 });
        }

        const path = `/order/${id}`;

        // Auth logic
        const userHeaders = generateUserL2Headers(
            userCredentials.address,
            userCredentials.apiKey,
            userCredentials.secret,
            userCredentials.passphrase,
            "GET",
            path
        );

        const builderHeaders = generateBuilderHeaders("GET", path);

        const res = await fetch(`${CLOB_BASE}${path}`, {
            headers: { ...userHeaders, ...builderHeaders }
        });

        if (!res.ok) {
            return NextResponse.json({ success: false, error: await res.text() }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ success: true, order: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
