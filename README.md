# TrueSpend

TrueSpend is an AI-agent-first credit card rewards co-pilot for web, iOS, Android, and browser extension users. The product helps users connect cards, understand rewards, track spend, and get a simple answer to the question: **which card should I use right now?**

The production hosting target is Cloudflare Pages for the React app and Supabase for Auth, Postgres, Storage, Realtime, and Edge Functions.

## Current Product Direction

TrueSpend is moving from a broad personal-finance dashboard toward a focused rewards optimizer:

- **AI agent** — one orchestration layer for spending summaries, best-card suggestions, missed rewards, recommendations, and chat.
- **Card rewards source of truth** — store card reward structures once, then reuse them for every user who connects the same card.
- **Plaid-first transaction data** — linked card and bank activity feeds recommendations instead of requiring manual entry.
- **Contextual guidance** — website dashboard, extension shopping hints, mobile geo nudges, and weekly emails.
- **Subscription-ready** — Stripe billing code exists; live Stripe setup and webhook replay are still required before launch.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web app | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| App state | TanStack React Query |
| Backend | Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions |
| AI | Claude-compatible Supabase Edge Functions behind `ai-agent` |
| Payments | Stripe subscriptions |
| Financial data | Plaid Link + transaction sync |
| Maps/location | Google Maps-ready integration, Leaflet UI, Capacitor geolocation |
| Mobile | Capacitor iOS/Android shell |
| Extension | Chrome MV3 extension |
| Hosting target | Cloudflare Pages + Supabase |

## Local Development

### Prerequisites

- Node 20+
- npm
- Supabase CLI
- A Supabase project or local Supabase stack

### Setup

```bash
git clone <repo>
cd true-spend-spark
npm install
cp .env.example .env
npm run dev
```

The Vite dev server runs on `http://localhost:8080`.

### Required Browser Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_GOOGLE_MAPS_API_KEY=
```

Provider secrets such as `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `PLAID_SECRET`, and `RESEND_API_KEY` belong in Supabase secrets, not in browser-visible `VITE_*` variables.

## Project Structure

```text
src/
  features/           Domain features: auth, cards, transactions, insights, recommendations
  shared/             Shared UI, hooks, navigation, logging, security, API helpers
  integrations/       Browser-side clients for Supabase, Stripe, Google Maps
  pages/              Marketing, legal, dashboard launcher, internal operations pages

supabase/
  functions/          Deno Edge Functions
  migrations/         SQL schema and seed migrations

extension/            Chrome MV3 extension
ios/ android/         Capacitor native projects
docs/                 Canonical architecture and launch documents
```

## Core User Flows

- Marketing visitor reads public pages and can start signup/login from `/auth`.
- Logged-out users who open app routes are redirected to `/auth` with the intended destination preserved.
- Logged-in users land on `/dashboard`, but can still return to the marketing home page.
- Users connect cards through Plaid, review rewards, then receive recommendations from the AI agent.
- Premium routes and billing actions are backed by Stripe subscription state.

## Scripts

```bash
npm run dev          # Vite dev server
npm run typecheck    # TypeScript validation
npm run build        # Production build
npm run audit:prod   # Production dependency audit
npm run verify       # typecheck + build + audit
npm run lint         # ESLint
```

## Documentation

- [Documentation Index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Milestone Tracker](docs/MILESTONE_TRACKER.md)
- [Production TODO](docs/PRODUCTION_TODO.md)
- [Cloudflare + Supabase Production Guide](docs/CLOUDFLARE_SUPABASE_PRODUCTION.md)
- [AI Agent UX Guide](docs/AI_AGENT_UX_GUIDE.md)
