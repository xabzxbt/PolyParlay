import { NextResponse } from "next/server";
import { generateBuilderHeaders, generateUserL2Headers } from "@/lib/polymarket/builder-sign";

const CLOB_BASE = "https://clob.polymarket.com";

export async function POST(request: Request) {
    try {
        const { userCredentials, assetType, tokenId } = await request.json();

        let path = `/balance-allowance?asset_type=${assetType}`;
        if (tokenId) path += `&token_id=${tokenId}`;

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
        return NextResponse.json({
            success: true,
            balance: parseFloat(data.balance),
            allowance: parseFloat(data.allowance)
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
