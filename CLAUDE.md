# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run aurora:scan  # Run daily FinViz market scanner (stores results in Supabase)
```

Deployment is via GitHub Actions + SSH:
- `main` branch → live production (`/home/paul/deploy-aurora-live.sh`)
- `dev` branch → dev environment (`/home/paul/deploy-aurora-dev.sh`)

Production is managed by PM2 (`ecosystem.config.js`) as `aurora-app` on port 3000.

## Architecture Overview

**Aurora Growth** is a SaaS investment platform: tiered subscriptions (Stripe), live brokerage integration (Trading212), market scanning (FinViz), and portfolio analytics.

### Stack
- **Next.js 16 App Router** — all routes in `app/`, API routes in `app/api/`
- **Supabase** — PostgreSQL database + Auth (email/password + Google OAuth)
- **Stripe** — 3 plans × monthly/yearly billing (Core, Pro, Elite)
- **Tailwind CSS v4** — dark theme with cyan/blue/violet accents; uses `@import` syntax not `@tailwind` directives
- **TypeScript strict mode** — path alias `@/*` maps to repo root

### Authentication
Supabase Auth via `@supabase/ssr`. Two clients:
- `lib/supabase/server.ts` — server components, API routes, uses Next.js `cookies()`
- `lib/supabase/client.ts` — browser/client components

No `middleware.ts` — auth is checked per-route by calling `createClient()` and verifying session.

### API Routes (`app/api/`)
| Prefix | Purpose |
|--------|---------|
| `/api/trading212/` | Broker data: summary, positions, orders, account, market info |
| `/api/connections/` | Broker connection CRUD & status testing |
| `/api/aurora/` | Platform tools: calculator, candles, quote, analysis |
| `/api/watchlist/` | User watchlist management |
| `/api/stocks/` | Stock search |
| `/api/user/` | User settings (trading mode) |
| `/api/auth/` | Auth helpers |
| `/api/admin/` | Activity logging |

Pattern: routes return `NextResponse.json()`. Several routes use a module-level cache object with a timestamp for short-lived in-memory caching (e.g. 30s for portfolio overview).

### State Management
React Context providers in `components/providers/`:
- **PortfolioProvider** — Trading212 portfolio data; 180s refresh cooldown; smart number parsing handles `$`, `£`, `%`, `K/M/B` suffixes
- **WatchlistProvider** — Authenticated (Supabase) or guest (localStorage) watchlist

Custom hooks in `hooks/`:
- `useAccountStatus` — polls account metrics every 30s
- `useTrading212Summary` — polls summary every 60s

### Trading212 Broker Integration (`lib/trading212/`)
1. User submits API key/secret → encrypted with AES-256-GCM (`lib/security/encryption.ts`) → stored in `broker_connections` table
2. Server decrypts on demand → calls Trading212 REST API using `Authorization: Basic <base64(key:secret)>`
3. `BROKER_CREDENTIALS_SECRET` env var (32+ chars) is used for AES key derivation

### Database (`supabase/migrations/`)
- **broker_connections** — encrypted broker credentials per user/broker/mode (paper|live); RLS enforced
- **profiles** — extends Supabase auth.users; includes `trading_mode` (paper|live)

Full schema history is in migration files. Always check existing RLS policies before writing queries that touch user data.

### Market Scanner (`scripts/daily-finviz-scan.mjs`)
Scrapes FinViz with Cheerio, scores stocks (PEG, ROE, ROA, EPS growth → 0–100), stores in Supabase. Run via cron or `npm run aurora:scan`.

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `STRIPE_PRICE_<PLAN>_{MONTHLY,YEARLY}` | 6 price IDs (CORE/PRO/ELITE) |
| `BROKER_CREDENTIALS_SECRET` | AES-256 key derivation seed (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | Public base URL |
