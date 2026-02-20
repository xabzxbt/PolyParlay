"use client";

import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polygon } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";


const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [polygon],
  ssr: true,
});

if (projectId) {
  try {
    createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: [polygon],
      defaultNetwork: polygon,
      metadata: {
        name: "PolyParlay",
        description: "Combo bets on Polymarket prediction markets",
        url: typeof window !== "undefined" ? window.location.origin : "https://polyparlay.app",
        icons: ["/icon-192.png"],
      },
      features: {
        analytics: false,
        email: false,
        socials: false,
      },
      themeMode: "dark",
      themeVariables: {
        "--w3m-accent": "#00ff88",
        "--w3m-color-mix": "#080c14",
        "--w3m-color-mix-strength": 40,
        "--w3m-border-radius-master": "2px",
      },
    });
  } catch (error) {
  }
} else {
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
