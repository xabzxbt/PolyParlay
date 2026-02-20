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

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F4F7FA" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-1 text-text-primary antialiased">
        {/* Modern Ticker */}
        <div className="ticker-wrap">
          <div className="ticker-content">
            {[0, 1].map((n) => (
              <span key={`ticker-${n}`} className="inline-flex items-center gap-8 text-[9px] font-mono font-bold text-primary uppercase tracking-[0.2em] px-4" style={{ height: 24, lineHeight: '24px' }}>
                <span>■ Built on Polymarket</span>
                <span>■ Prediction Markets</span>
                <span>■ Real-time Analytics</span>
                <span>■ Combo Bets</span>
                <span>■ Smart Money Tracking</span>
                <span>■ Kelly Criterion</span>
                <span>■ Edge Detection</span>
                <span>■ Not Financial Advice</span>
                <span>■ DYOR</span>
                <span>■ Powered by Polymarket Gamma API</span>
              </span>
            ))}
          </div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
