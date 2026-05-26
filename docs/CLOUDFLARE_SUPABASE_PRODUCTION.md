# Cloudflare + Supabase Production Guide

This is the production runbook for hosting TrueSpend as a static React SPA on Cloudflare Pages with Supabase handling Auth, Postgres, Storage, Realtime, and Edge Functions.

The target architecture is:

```text
Browser / iOS / Android / Extension
  -> Cloudflare Pages CDN
  -> React SPA
  -> Supabase Auth, Postgres, Storage, Realtime, Edge Functions
  -> Stripe, Plaid, Resend, Google Maps, AI providers
```

## Production Readiness Position

Cloudflare Pages + Supabase is a good fit for the first production version and can support meaningful scale if the app keeps reads behind indexed queries, server-side pagination, RLS, caching for repeated dashboard reads, and external API rate limits.

This is not yet "Amazon/Facebook/Walmart level" in the organizational sense. Those sites operate with mature incident response, staged rollouts, security teams, chaos testing, full observability, performance budgets, accessibility programs, and fraud teams. This repo now has the right foundation, but the remaining work is process and integration hardening.

## Cloudflare Pages Setup

Create a Pages project from `otherservices/true-spend-spark`.

Use these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite / React |
| Production branch | `main` |
| Build command | `npm ci && npm run verify` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | `22` |

`npm run verify` runs typecheck, production build, and production dependency audit. If Cloudflare build time becomes too high, use `npm ci && npm run build` and keep `npm run verify` in GitHub Actions.

The repo includes:

| File | Purpose |
| --- | --- |
| `public/_headers` | Security headers, CSP, browser cache headers |
| `public/_redirects` | Explicit SPA deep-link fallbacks for app routes |
| `.env.example` | Complete environment variable reference |

Cloudflare Pages already handles SPA fallback when no top-level `404.html` exists, but `_redirects` documents the intended app routes and protects direct deep links like `/transactions` and `/settings/billing`.

## Cloudflare Environment Variables

Set these in Cloudflare Pages -> Settings -> Environment variables.

Public browser variables:

```bash
VITE_SUPABASE_PROJECT_ID=<project-ref>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-or-publishable-key>
VITE_APP_URL=https://<your-production-domain>

VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_PRO_ANNUAL_PRICE_ID=price_...

VITE_GOOGLE_MAPS_API_KEY=<browser-restricted-key>
VITE_CSP_REPORT_URI=https://<project-ref>.supabase.co/functions/v1/csp-reporter
VITE_MAINTENANCE_MODE=false
VITE_PWA_ENABLED=false
```

Do not put service role keys, Stripe secret keys, Plaid secrets, Resend keys, or AI provider keys in Cloudflare Pages browser variables.

## Cloudflare Security Settings

Enable these at the Cloudflare zone level:

| Area | Recommendation |
| --- | --- |
| SSL/TLS | Full (strict) |
| Always Use HTTPS | Enabled |
| HSTS | Enable after the custom domain works correctly for at least one deploy |
| WAF managed rules | Enabled |
| Bot protection | Start in monitoring/challenge-light mode; do not break OAuth, Plaid, or Stripe redirects |
| Rate limiting | Add limits for `/auth`, `/forgot-password`, `/reset-password`, and any `/api/*` proxy if added later |
| Web Analytics | Optional; CSP already allows Cloudflare Insights |
| Cache Rules | Avoid custom HTML caching; Pages already manages static asset cache correctly |

Do not cache authenticated HTML routes separately. This is a SPA; sensitive data comes from Supabase APIs after auth, but stale app shells still cause confusing user flows.

## Supabase Production Setup

Use a separate Supabase project for production. Do not reuse local or staging data.

Deployment order:

1. Create the production Supabase project.
2. Link local CLI:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

3. Apply database migrations:

   ```bash
   supabase db push
   ```

4. Set Edge Function secrets:

   ```bash
   supabase secrets set --env-file .env.production
   ```

5. Deploy functions:

   ```bash
   supabase functions deploy --project-ref <project-ref>
   ```

6. Configure Supabase Auth URLs.
7. Deploy Cloudflare Pages.
8. Configure provider webhooks after final URLs exist.

## Supabase Auth Configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

| Setting | Value |
| --- | --- |
| Site URL | `https://<your-production-domain>` |
| Redirect URL | `https://<your-production-domain>/auth` |
| Redirect URL | `https://<your-production-domain>/reset-password` |
| Redirect URL | `https://<your-production-domain>/verify-email` |
| Redirect URL | `https://<your-production-domain>/confirm-email-change` |

For Google login:

1. Create OAuth credentials in Google Cloud Console.
2. Add the Supabase callback URL shown in the Supabase Google provider setup.
3. Enable Google provider in Supabase Auth.
4. Confirm `/auth` receives the callback and redirects to the preserved destination.

For mobile later, add the iOS/Android deep link URLs only after Capacitor URL scheme is finalized.

## Supabase Secrets

Required production secrets:

```bash
APP_URL=https://<your-production-domain>
SITE_URL=https://<your-production-domain>
FRONTEND_URL=https://<your-production-domain>

SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_PRICE_IDS=price_...,price_...

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=TrueSpend <noreply@your-domain.com>

PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENVIRONMENT=production

GOOGLE_MAPS_BACKEND_KEY=...

UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

LOCATION_SIGNING_SECRET=<32+ byte random string>
```

Optional/future secrets:

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
HUGGING_FACE_ACCESS_TOKEN=...
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
IOS_APNS_KEY=...
IOS_APNS_KEY_ID=...
IOS_APNS_TEAM_ID=...
MODAL_API_TOKEN=...
MODAL_WEBHOOK_SECRET=...
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or provider secret keys in browser `VITE_*` variables.

## Provider Webhooks

Configure these after production domains and functions are deployed:

| Provider | Webhook URL |
| --- | --- |
| Stripe | `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` |
| Plaid | `https://<project-ref>.supabase.co/functions/v1/webhook-plaid` |
| Resend | `https://<project-ref>.supabase.co/functions/v1/resend-webhook-handler` |

Keep webhook signature verification enabled. Do not put these webhooks behind Cloudflare cache rules.

## Production Navigation Rules

These are the expected website flows:

| Scenario | Expected behavior |
| --- | --- |
| Logged-out user opens `/dashboard` | ProtectedRoute redirects to `/auth` and preserves `/dashboard` |
| Successful email login | Auth page redirects to preserved route or `/dashboard` |
| Successful Google login | OAuth callback on `/auth` strips auth params and redirects to preserved route |
| Logged-in user opens `/` | Marketing home remains viewable; no forced dashboard redirect |
| Logout then browser Back | BFCache guard reloads if needed; protected page re-checks auth and redirects to `/auth` |
| Free user opens `/insights` | Redirects to `/settings/billing` |
| Non-admin opens `/admin` | Redirects to `/dashboard` |
| Direct deep link refresh | Cloudflare serves `index.html`, React Router resolves route |

## Smoke Test Checklist

Run this after every production deploy:

1. Open `/`, `/features`, `/pricing`, `/about`.
2. Open `/dashboard` logged out; confirm redirect to `/auth`.
3. Sign up with email; confirm verification email arrives.
4. Verify email; confirm active account can log in.
5. Log in with email/password; confirm dashboard loads.
6. Log out; press browser Back; confirm no private dashboard data is visible.
7. Start Google login; confirm callback returns to `/dashboard`.
8. Open `/transactions`; create, search, filter, and paginate transactions.
9. Open `/budgets`; create budget and confirm spend calculations load.
10. Open `/credit-cards`; confirm Plaid Link starts or shows a configured error.
11. Open `/settings/billing`; start checkout and portal flows.
12. Open `/insights` as free user; confirm billing redirect.
13. Open `/admin` as non-admin; confirm dashboard redirect.
14. Run mobile viewport checks for nav and forms.
15. Check browser console for CSP violations, auth loops, and failed chunks.

## Rollback Plan

Cloudflare Pages supports deployment rollback from the Pages dashboard. If a frontend deploy breaks navigation, roll back to the previous Pages deployment first.

If an Edge Function deploy breaks payments/auth/webhooks:

1. Re-deploy the last known good function version from Git.
2. Disable the affected provider webhook temporarily if it is causing repeated failures.
3. Keep the Cloudflare frontend live in maintenance mode only if user data integrity is at risk:

   ```bash
   VITE_MAINTENANCE_MODE=true
   ```

## Remaining Launch Blockers

Before public launch:

1. Finish provider production setup: Stripe live mode, Plaid production, Resend verified sending domain, Google OAuth consent screen.
2. Complete RLS audit for every user-owned table.
3. Add production monitoring: Sentry or equivalent for frontend and Edge Function error tracking.
4. Add hosted smoke tests against the Cloudflare production URL.
5. Fix the remaining lint debt. Typecheck and build pass, but ESLint still contains historical debt.
6. Add legal review for financial data, location tracking, affiliate/reward recommendations, and AI-generated advice.
7. Add data retention and account deletion operational checks.

## Official References

- Cloudflare Pages React/Vite deployment: https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/
- Cloudflare Pages build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Pages headers: https://developers.cloudflare.com/pages/configuration/headers/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- Supabase Edge Function deployment: https://supabase.com/docs/guides/functions/deploy
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
