# TrueSpend Milestone Tracker

> Last reviewed from source code: 2026-05-26
> Canonical build strategy: [`BUILD_PLAN.md`](../BUILD_PLAN.md)
> Current implementation status: source-of-truth rewards MVP is underway, not production complete.

## Executive Status

| Area | Current status | Production status |
| --- | --- | --- |
| Web app shell | Built | Needs E2E and UX polish |
| Auth/navigation | Built | Needs full browser-flow regression tests |
| Dashboard | Built | Needs final AI-agent/rewards-first UX |
| Transactions | Built | Needs `bff-transactions` adoption and pagination validation |
| Budgets | Built | Needs seeded-data validation and empty/error state pass |
| Credit cards | Source-of-truth flow built | Needs seeded DB verification and UX testing |
| Source-of-truth catalog | Built | Needs migrations applied in Supabase and admin review |
| Rewards engine | Built | Needs deployed Edge Function smoke test with real user cards |
| AI agent | Deferred helper | Must not be source of truth for reward math |
| Recommendations | Initial implementation | Needs best-card and missed-rewards persistence across flows |
| Stripe billing | Code exists | Needs live products, secrets, webhook replay |
| Plaid | Partially implemented | Needs webhook hardening and transaction lifecycle coverage |
| Website hosting | Not deployed | Cloudflare Pages setup pending |
| Extension | Partial | Build/publish pipeline pending |
| iOS/Android | Capacitor shell | Device builds and permissions testing pending |

## Phase 0 — Cleanup And Simplification

**Goal:** Remove bloat, stale docs, and legacy provider paths before adding more features.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Remove old provider branding/references | ✅ Done | Code, docs, metadata, extension permission, and lockfile references removed |
| Delete stale review/docs/diagram files | ✅ Done | Removed old review reports and `.drawio` diagram docs |
| Switch dependency source of truth to npm | ✅ Done | Removed `bun.lock`; CI now checks `package-lock.json` |
| Keep only canonical docs | 🟡 In progress | Current canonical docs are in `docs/` |
| Reduce 100+ Edge Functions to the MVP set | ❌ Pending | `supabase/functions/` still contains many non-MVP functions |
| Remove unused ML/observability UI from consumer app | ✅ Done | Custom ML routes, Hugging Face/Modal functions, and training UI removed from the MVP path |

**Gate to pass:** build succeeds and the app has no legacy provider strings or dead docs.

## Phase 1 — Rewards Foundation

**Goal:** Make credit card rewards a durable source of truth.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Create rewards schema | ✅ Started | `supabase/migrations/20260526001300_rewards_foundation.sql` |
| Add recommendation feed schema | ✅ Started | Same migration |
| Add Recommendations page | ✅ Started | `src/features/recommendations/pages/Recommendations.tsx` |
| Add card catalog seed for top cards | ✅ Built | `20260526090004_seed_initial_catalog.sql` seeds 26 cards as `needs_review` |
| Add merchant domain seed | ✅ Built | `20260526090005_seed_merchant_domains.sql` seeds 10 verified domains |
| Add deterministic rewards engine | ✅ Built | `supabase/functions/rewards-engine/index.ts` |
| Add browser-extension suggestion endpoint | ✅ Built | `supabase/functions/extension-card-suggest/index.ts`; stores domain only |
| Add rewards editor for user confirmation | ✅ Built | `/app/cards/:id/rewards`, `card-update-reward-overrides` |
| Show reward highlights on card tiles/details | 🟡 Partial | Card detail shows catalog rules; list tiles still intentionally compact |
| Add admin catalog review flow | ✅ Built | `/app/admin/catalog`, `/app/admin/catalog/review` |
| Add validation scripts | ✅ Built | `scripts/validate-*` |

**Gate to pass:** apply migrations in Supabase, add a real user card, run Amazon extension validation, and confirm admin review is role-gated.

## Phase 2 — AI Explanation Layer

**Goal:** Use AI only for explanation, summaries, and draft extraction after deterministic recommendations work.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Add `ai-agent` Edge Function | ✅ Started | `supabase/functions/ai-agent/index.ts` |
| Add React hook | ✅ Started | `src/shared/hooks/useAIAgent.ts` |
| Route Insights through agent | ✅ Started | `src/features/insights/pages/Insights.tsx` |
| Route dashboard AI nudge through agent | ✅ Started | `src/pages/UserDashboard.tsx` |
| Keep compatibility endpoints while migrating | ✅ Done | Legacy endpoints now call Claude/fallback paths |
| Add AI cost guardrails | ✅ Done | Per-user rate limits, cache table, fast/agent model routing, deterministic fallback |
| Keep reward math out of AI | ✅ Built | `rewards-engine` is deterministic and documented |
| Persist agent outputs consistently | 🟡 Partial | Recommendations page exists; all flows not wired |
| Add chat UI | ❌ Pending | Needed for full co-pilot experience |

**Gate to pass:** user can ask "why this card?" and AI explains the already-computed deterministic result without changing catalog data.

## Phase 3 — Website Experience

**Goal:** Make the web app feel production-grade without overwhelming users.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Protected route navigation | ✅ Built | `ProtectedRoute`, safe redirects, logout handling |
| Dashboard entry point | ✅ Built | `src/pages/UserDashboard.tsx` |
| Global navigation | ✅ Built | `GlobalNav` |
| Dashboard action hierarchy | 🟡 Needs pass | Should prioritize "connect card", "best card now", "missed rewards" |
| Empty states for first-time users | 🟡 Partial | Needs consistent onboarding across dashboard/cards/transactions |
| Failure states for provider outages | 🟡 Partial | Stripe/Plaid/AI failures need user-friendly copy |
| Back-button/browser navigation regression tests | ❌ Pending | Especially auth/logout/OAuth flows |

**Gate to pass:** a new user can sign up, return later, connect a card, understand the next action, and never hit a confusing auth loop.

## Phase 4 — Plaid And Transactions

**Goal:** Make transaction data trustworthy.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Plaid Link token and exchange | ✅ Built | `plaid-create-link-token`, `plaid-exchange-token` |
| Manual sync function | ✅ Built | `plaid-sync-transactions` |
| Webhook receiver | 🟡 Partial | `webhook-plaid` exists |
| Verify Plaid webhook JWT | ❌ Pending | Required before production |
| Handle removed transactions | ❌ Pending | Required for data correctness |
| Handle pending-to-posted transitions | ❌ Pending | Required for deduplication |
| Transaction list through BFF | 🟡 Partial | `bff-transactions` exists; frontend adoption pending |

**Gate to pass:** Plaid sandbox and production test users sync transactions accurately over multiple days with no duplicates.

## Phase 5 — Billing

**Goal:** Be ready to charge users.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Stripe checkout function | ✅ Built | `stripe-create-checkout-session` |
| Stripe portal function | ✅ Built | `stripe-create-portal-session` |
| Stripe webhook | ✅ Built | `stripe-webhook` |
| Subscription table | ✅ Built | `20260525120000_create_subscriptions.sql` |
| Billing page | ✅ Built | `src/features/settings/pages/Billing.tsx` |
| Live Stripe products and prices | ❌ Pending from owner | Must be configured in Stripe dashboard |
| Webhook replay test | ❌ Pending | Required before launch |
| Razorpay decision | 🟡 Later | Use only if India-first payments become a hard requirement |

**Gate to pass:** a test user can subscribe, upgrade/downgrade, cancel, and have app access update through webhooks.

## Phase 6 — Production Launch

**Goal:** Safely host and monitor the website.

| Task | Status | Evidence / Notes |
| --- | --- | --- |
| Cloudflare deployment guide | ✅ Built | `docs/CLOUDFLARE_SUPABASE_PRODUCTION.md` |
| Production Supabase project | ❌ Pending from owner | Separate from local/staging |
| Cloudflare Pages project | ❌ Pending from owner | Connect GitHub repo |
| Production env/secrets | ❌ Pending from owner | Supabase, Stripe, Plaid, Resend, Anthropic, Google |
| E2E smoke tests | ❌ Pending | Auth, dashboard, billing, Plaid, AI |
| Monitoring | ❌ Pending | Sentry or equivalent |
| Legal/compliance review | ❌ Pending | Finance app privacy, terms, affiliate disclosures |

**Gate to pass:** staging and production deploys are reproducible, monitored, and rollback-ready.

## Current Top Priorities

1. Apply and verify the source-of-truth migrations in Supabase.
2. Regenerate Supabase TypeScript types after migrations.
3. Run validation scripts with real test JWTs.
4. Harden Plaid webhooks and transaction deduplication.
5. Configure live Stripe and run webhook replay tests.
6. Deploy staging to Cloudflare Pages and run auth/navigation E2E tests.
