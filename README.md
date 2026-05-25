# TrueSpend

AI-powered personal finance tracker with receipt OCR, geofenced budgets, credit card management, and anomaly detection.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State / Data | TanStack React Query v5 |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + RLS) |
| AI / OCR | Google Vision API, HuggingFace Transformers |
| Payments | Plaid (bank linking), Stripe (subscriptions — pending) |
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
  components/         # Reusable UI components
    auth/             # Login, MFA, session management
    credit-cards/     # Plaid-linked card UI
    receipts/         # OCR capture flow
    settings/         # Data management, notifications
  hooks/              # Custom React hooks
  lib/
    api/              # BFF client (bffClient.ts)
    performance/      # Performance monitoring
  pages/              # Route-level components
  integrations/
    supabase/         # Generated Supabase types + client
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
npm run lint         # ESLint
```

## Deployment

The app is a static SPA. Build output goes to `dist/`. Deploy to any CDN (Vercel, Cloudflare Pages, Netlify).

```bash
npm run build
# upload dist/ to your hosting provider
```

Supabase Edge Functions are deployed via:

```bash
supabase functions deploy <function-name>
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data flows, security model
- [API Reference](docs/API.md) — Edge Functions request/response shapes
- [Production TODO](docs/PRODUCTION_TODO.md) — what must be done before public launch

See [docs/PRODUCTION_TODO.md](docs/PRODUCTION_TODO.md) for what must be completed before the first public launch.
