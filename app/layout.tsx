import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
import "./globals.css";

const Providers = dynamic(() => import("@/providers/Providers"), { ssr: false });

export const metadata: Metadata = {
  title: "PolyParlay — Combo Bets on Polymarket",
  description: "Build parlay bets on Polymarket prediction markets. Combine 2-10 markets for multiplied odds.",
  manifest: "/manifest.json",
  openGraph: { title: "PolyParlay", description: "Combo bets on Polymarket. Multiply your odds.", siteName: "PolyParlay", type: "website" },
  twitter: { card: "summary_large_image", title: "PolyParlay", description: "Combo bets on Polymarket prediction markets" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1C1917" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }} className="min-h-screen antialiased">
        {/* Marquee ticker — dark bar, warm text, thin | dividers */}
        <div className="ticker-wrap">
          <div className="ticker-content">
            {[0, 1].map((n) => (
              <span
                key={`ticker-${n}`}
                className="inline-flex items-center gap-10 font-mono font-medium text-text-inverse px-4"
                style={{ fontSize: '9px', height: 26, lineHeight: '26px', opacity: 0.65, letterSpacing: '0.12em', textTransform: 'uppercase' }}
              >
                <span>Built on Polymarket</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Prediction Markets</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Real-time Analytics</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Combo Bets</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Smart Money Tracking</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Kelly Criterion</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Edge Detection</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Not Financial Advice</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>DYOR</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>Powered by Polymarket Gamma API</span>
              </span>
            ))}
          </div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
