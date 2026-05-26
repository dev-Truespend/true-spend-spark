# Production TODO

This is the practical launch checklist for Cloudflare + Supabase production.

## P0 — Must Finish Before Public Launch

### Hosting

- [ ] Create production Supabase project.
- [ ] Apply all migrations to production with `supabase db push`.
- [ ] Deploy required Edge Functions only.
- [ ] Create Cloudflare Pages project from `otherservices/true-spend-spark`.
- [ ] Configure custom domain, HTTPS strict mode, and Pages environment variables.
- [ ] Confirm direct deep links work: `/dashboard`, `/transactions`, `/settings/billing`, `/auth`, `/reset-password`.

### Auth And Navigation

- [ ] Run browser regression tests for signup, login, Google login, logout, browser Back, reset password, verify email.
- [ ] Confirm logged-out protected routes always redirect to `/auth`.
- [ ] Confirm logged-in users can view marketing pages without being forced to dashboard.
- [ ] Confirm logout clears only Supabase auth keys.
- [ ] Confirm admin routes reject non-admin users.

### Plaid

- [ ] Configure production Plaid app and webhook URL.
- [ ] Cryptographically verify Plaid webhook JWT.
- [ ] Implement removed transaction handling.
- [ ] Implement pending-to-posted transition handling.
- [ ] Add deduplication between manual transactions and Plaid transactions.
- [ ] Run sandbox and production test-user sync for multiple days.

### Stripe

- [ ] Create live Stripe products/prices for free/pro/family or chosen plans.
- [ ] Set Supabase secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs.
- [ ] Set Cloudflare variable: `VITE_STRIPE_PUBLISHABLE_KEY`.
- [ ] Configure Stripe webhook endpoint.
- [ ] Replay checkout, renewal, cancel, failed payment, and refund events.
- [ ] Confirm subscription state updates premium access.

Recommendation: use **Stripe first** for the US/international launch path. Add Razorpay only if India-first payments become mandatory; running two payment processors before launch adds reconciliation and support complexity.

### AI Agent

- [ ] Set `ANTHROPIC_API_KEY` in Supabase secrets.
- [x] Add cost guardrails for `ai-agent` with per-user rate limiting, response caching, lower-cost model routing, and deterministic fallback.
- [ ] Migrate remaining user-facing AI calls to `ai-agent`.
- [x] Add deterministic fallback responses for provider downtime and provider rate limits.
- [ ] Log prompt/tool failures without storing sensitive financial details in plaintext logs.

### Email

- [ ] Configure Resend domain and DNS records.
- [ ] Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- [ ] Verify password reset, verification, billing, weekly summary, and alert templates.

Resend is a good free/cheap starting point. It is simpler than running your own SMTP and has enough deliverability tooling for an MVP.

### Security

- [ ] Run `npm run verify`.
- [ ] Run dependency audit and fix high/critical production issues.
- [ ] Review RLS policies for all user-owned tables.
- [ ] Apply source-of-truth migrations and regenerate Supabase TypeScript types.
- [ ] Run source-of-truth validation scripts with test JWTs.
- [ ] Ensure service-role keys never appear in browser-visible code or `VITE_*` env vars.
- [ ] Tighten CORS for Edge Functions before production if possible.
- [ ] Add Sentry or equivalent for frontend and Edge Function errors.

## P1 — First Production Sprint

- [x] Seed first 25+ credit cards and merchant domains.
- [x] Build rewards editor and user confirmation flow.
- [x] Add deterministic source-of-truth rewards engine.
- [x] Add browser-extension-ready card suggestion endpoint.
- [ ] Expand card catalog seed from 26 to top 100 US credit cards.
- [ ] Manually verify seeded reward rules and mark trusted rules `verified`.
- [ ] Show richer reward highlights on all card tiles/details.
- [ ] Move transaction reads to `bff-transactions`.
- [ ] Add empty/error/loading states across dashboard, transactions, budgets, insights, credit cards.
- [ ] Add Playwright E2E tests for the main website flows.
- [ ] Add onboarding checklist for first-time users.
- [ ] Add user-friendly provider outage messages for Plaid, Stripe, AI, and email.
- [x] Remove admin-only ML/Hugging Face/Modal pages from the production MVP.

## P2 — Scale And Retention

- [ ] Add "best card now" quick action to dashboard.
- [ ] Add missed rewards monthly digest.
- [ ] Add AI chat for natural language rewards questions.
- [ ] Complete browser extension build and publish pipeline.
- [ ] Test iOS and Android builds on devices.
- [ ] Add mobile notification permission flow.
- [ ] Add Google Maps production key restrictions and usage alerts.

## P3 — Later

- [ ] Family/household plans.
- [ ] Loyalty points expiry alerts.
- [ ] CSV import.
- [ ] Multi-currency support.
- [ ] Affiliate link tracking and compliance review.
- [x] Keep advanced/custom ML training out of the MVP scope.

## Owner Inputs Needed

| Input | Why it matters |
| --- | --- |
| Production domain | Needed for Cloudflare, Supabase Auth, Stripe, Plaid, Resend |
| Stripe account | Required to charge subscriptions |
| Plaid account | Required to connect financial accounts/cards |
| Resend account/domain | Required for transactional email |
| Google Cloud project | Required for OAuth and Maps APIs |
| Anthropic API key | Required for production AI-agent calls |
| Privacy/terms review | Required because this is a finance app |
