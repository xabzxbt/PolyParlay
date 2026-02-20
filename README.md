# PolyParlay

**Combo bets on Polymarket prediction markets.**

Combine 2-10 markets into a single parlay. Higher risk, bigger rewards. Partial wins included.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in keys
npx prisma db push            # setup database
npm run dev                   # http://localhost:3000
```

## Required Keys

| Key | Source |
|-----|--------|
| `POLYMARKET_BUILDER_API_KEY` | polymarket.com/settings?tab=builder |
| `POLYMARKET_BUILDER_SECRET` | same |
| `POLYMARKET_BUILDER_PASSPHRASE` | same |
| `NEXT_PUBLIC_MAGIC_API_KEY` | dashboard.magic.link |
| `DATABASE_URL` | Supabase PostgreSQL |
| `CRON_SECRET` | Any random string |

## Architecture

```
Frontend → /api/markets (Gamma proxy) → Polymarket
         → /api/prices (CLOB batch)
         → /api/parlay (execute with builder HMAC)
         → /api/cron/resolve (auto-resolve every 15min)

Database: User → Parlay → ParlayLeg (Prisma + PostgreSQL)
Revenue: ~1% builder fee on all order volume
```

## Deploy

```bash
vercel deploy --prod
# Health check: GET /api/health
```

## Stack

Next.js 14 · TypeScript · Tailwind · Prisma · Magic Link · Polymarket APIs
