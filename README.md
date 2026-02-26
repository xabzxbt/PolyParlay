# PolyParlay 🎲

**The First Advanced Parlay Trading Platform on Polymarket.**

PolyParlay allows you to combine 2-10 prediction markets into a single parlay bet. Higher risk, exponentially bigger rewards. Built on top of Polymarket's CLOB and Gamma APIs, it offers a seamless, gasless experience via Polymarket's Proxy Wallets.

## Features ✨

- **Gasless Trading**: Deep integration with Polymarket Proxy Wallets (Gnosis Safe) means zero gas fees for placing orders.
- **Advanced Market Analytics**: Integrated market stats, whale activity tracking, and on-chain order book depth.
- **Smart Order Validation**: Automatic slippage calculation, negative risk management, and batch execution via Polymarket CLOB.
- **Social Trading**: Share your parlays with custom OG images, comment on markets, and track platform-wide leaderboards.

## Quick Start 🚀

```bash
npm install
# Copy env variables
cp .env.example .env.local

# Run development server
npm run dev
# App will be available at http://localhost:3000
```

## Required Environment Variables 🔑

| Key | Description |
|-----|--------|
| `POLYMARKET_BUILDER_API_KEY` | Polymarket API Key for builder fees (Settings -> Builder) |
| `POLYMARKET_BUILDER_SECRET` | Polymarket Builder Secret |
| `POLYMARKET_BUILDER_PASSPHRASE`| Polymarket Builder Passphrase |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Reown (WalletConnect) Project ID for AppKit |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase Public Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (for backend processing) |

## Architecture 🏗️

- **Frontend**: Next.js 14, React, Tailwind CSS, Reown AppKit (Wagmi/Viem).
- **Backend API**: Next.js App Router API Routes (`/api/parlay`, `/api/markets`, etc).
- **Database**: Supabase (PostgreSQL).
- **Web3**: ethers.js, viem, `@polymarket/clob-client`.

## Order Execution Flow 🔄

1. User connects wallet via Wagmi (Reown AppKit).
2. PolyParlay checks for a Polymarket Proxy Wallet (L2 Safe) and derives L2 API credentials.
3. User selects multiple markets and determines the parlay stake.
4. PolyParlay builds CLOB orders for each leg, fetching specific market `tickSize` and `negRisk` parameters.
5. User signs standard typed data (`signTypedData`).
6. Orders are sent to the PolyParlay backend, which injects Builder Attribution headers (for revenue share) and submits to the Polymarket CLOB.

## Deploying to Vercel 🌐

```bash
vercel deploy --prod
```
*Note: Cron jobs for resolving parlays and updating leaderboards are configured automatically via GitHub Actions.*
