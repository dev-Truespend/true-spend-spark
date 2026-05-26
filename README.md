# TrueSpend

AI-powered personal finance tracker with receipt OCR, geofenced budgets, credit card management, and anomaly detection.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State / Data | TanStack React Query v5 |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + RLS) |
| AI / OCR | Google Vision API, HuggingFace Transformers |
| Payments | Plaid bank linking, Stripe subscriptions |
| Native | Capacitor (iOS / Android) |
| Maps | Leaflet + react-leaflet |

## Local Development

### Prerequisites

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project with the schema applied

### Setup

```bash
git clone <repo>
cd true-spend-spark
npm install
cp .env.example .env          # fill in your Supabase keys
npm run dev                   # http://localhost:8080
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

### Supabase Edge Functions (local)

```bash
supabase start
supabase functions serve
```

Functions live in `supabase/functions/`. Each function reads secrets from Supabase Vault — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Project Structure

```
src/
  features/           # Domain features: auth, budgets, cards, insights, etc.
  shared/             # Shared UI, hooks, lib utilities, navigation
  integrations/       # Supabase, Stripe, Google Maps integration clients
  pages/              # Marketing, legal, dashboard launcher, internal ops pages
supabase/
  functions/          # Edge Functions (Deno)
  migrations/         # SQL migrations
docs/                 # Architecture, API, production checklist
```

## Key Features

- **Transaction tracking** — manual entry, AI auto-categorisation, receipt scanning
- **Budget management** — per-category limits, geofence-linked budgets, threshold alerts
- **AI Insights** — spending pattern analysis via `ai-analyze-spending` Edge Function
- **Credit cards** — Plaid inline link flow, card CRUD
- **Geofencing** — location-based budget rules using Haversine distance
- **Anomaly detection** — unusual transaction flagging
- **Role-based access** — `user`, `developer`, `admin` roles stored in `user_roles`
- **MFA** — TOTP via `otpauth` + QR code setup

## Scripts

```bash
npm run dev          # Dev server (port 8080)
npm run build        # Production build
npm run typecheck    # TypeScript validation
npm run audit:prod   # Production dependency audit
npm run verify       # typecheck + build + audit
npm run lint         # ESLint
```

## Deployment

The recommended production hosting path is Cloudflare Pages for the React SPA and Supabase for Auth, Postgres, Storage, and Edge Functions. Build output goes to `dist/`.

```bash
npm run verify
```

Supabase Edge Functions are deployed via:

```bash
supabase functions deploy <function-name>
```

See [Cloudflare + Supabase Production Guide](docs/CLOUDFLARE_SUPABASE_PRODUCTION.md) for the exact Cloudflare Pages settings, environment variables, Supabase secrets, smoke tests, and rollback plan.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data flows, security model
- [API Reference](docs/API.md) — Edge Functions request/response shapes
- [Production TODO](docs/PRODUCTION_TODO.md) — what must be done before public launch
- [Cloudflare + Supabase Production Guide](docs/CLOUDFLARE_SUPABASE_PRODUCTION.md) — hosting, security headers, secrets, deployment runbook

See [docs/PRODUCTION_TODO.md](docs/PRODUCTION_TODO.md) for what must be completed before the first public launch.
