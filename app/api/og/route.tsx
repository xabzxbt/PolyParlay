import { ImageResponse } from "@vercel/og";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/og?id=SHARE_ID — Generate Open Graph image for shared parlays
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Parse query parameters for parlay data
  const legsParam = searchParams.get("legs");
  const stakeParam = searchParams.get("stake");
  const oddsParam = searchParams.get("odds");
  const payoutParam = searchParams.get("payout");

  let legs: string[] = [];
  let stake = "0";
  let odds = "0";
  let payout = "0";

  try {
    if (legsParam) {
      legs = JSON.parse(decodeURIComponent(legsParam));
    }
    if (stakeParam) stake = stakeParam;
    if (oddsParam) odds = oddsParam;
    if (payoutParam) payout = payoutParam;
  } catch (e) {
  }

  // If no id and no legs, return placeholder
  if (!id && legs.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0a0f",
            fontSize: 32,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "linear-gradient(90deg, #2E5CFF, #00D4FF)",
            }}
          />
          <span style={{ color: "#ffffff", fontSize: 48, marginBottom: 8 }}>
            PolyParlay
          </span>
          <span style={{ color: "#9ca3af", fontSize: 24 }}>
            Shared Parlay
          </span>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  // Format odds as decimal
  const formattedOdds = odds ? `${parseFloat(odds).toFixed(2)}x` : "0x";
  const formattedPayout = payout ? `$${parseFloat(payout).toFixed(2)}` : "$0";
  const formattedStake = stake ? `$${parseFloat(stake).toFixed(2)}` : "$0";

  // Truncate legs for display
  const displayLegs = legs.slice(0, 4);
  const moreLegs = legs.length > 4 ? `+${legs.length - 4} more` : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0f",
          padding: 40,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #2E5CFF, #00D4FF)",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30 }}>
          <span style={{ color: "#2E5CFF", fontSize: 42, fontWeight: 800 }}>
            PolyParlay
          </span>
          <span style={{ color: "#6b7280", fontSize: 24 }}>◆</span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#6b7280", fontSize: 18, marginBottom: 4 }}>
                Stake
              </span>
              <span style={{ color: "#ffffff", fontSize: 36, fontWeight: 700 }}>
                {formattedStake}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#6b7280", fontSize: 18, marginBottom: 4 }}>
                Odds
              </span>
              <span style={{ color: "#2E5CFF", fontSize: 36, fontWeight: 700 }}>
                {formattedOdds}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#6b7280", fontSize: 18, marginBottom: 4 }}>
                Payout
              </span>
              <span style={{ color: "#22c55e", fontSize: 36, fontWeight: 700 }}>
                {formattedPayout}
              </span>
            </div>
          </div>

          {/* Legs */}
          <div
            style={{
              background: "#1a1a2e",
              borderRadius: 12,
              padding: 20,
              flex: 1,
            }}
          >
            <span style={{ color: "#6b7280", fontSize: 16, marginBottom: 12 }}>
              {displayLegs.length} Leg Parlay
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayLegs.map((leg, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: "rgba(46, 92, 255, 0.2)",
                      color: "#2E5CFF",
                      fontSize: 14,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {index + 1}
                  </div>
                  <span
                    style={{
                      color: "#e5e7eb",
                      fontSize: 18,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {leg}
                  </span>
                </div>
              ))}
              {moreLegs && (
                <span style={{ color: "#6b7280", fontSize: 16, marginTop: 4 }}>
                  {moreLegs}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <span style={{ color: "#4b5563", fontSize: 16 }}>
            polyparlay.app{id ? `/s/${id}` : ""}
          </span>
          <span style={{ color: "#6b7280", fontSize: 14 }}>
            Powered by Polymarket
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
