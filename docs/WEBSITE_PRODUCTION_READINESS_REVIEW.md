# Website Production Readiness Review

Last reviewed: 2026-05-25

## Executive Status

The website and web app are roughly **72% production-ready**. The core React app builds, route protection is active, onboarding exists, dashboard/transactions/budgets/insights/settings flows are present, and the auth system has MFA, email verification, password reset, Google OAuth, idle-session handling, and account status enforcement.

The full business is roughly **60-65% production-ready** because revenue, hosting, transactional email domain setup, Plaid production approval, legal/compliance review, monitoring, and end-to-end test coverage are still launch blockers.

## What Is Implemented Well

- Public marketing routes: home, features, pricing, about, docs, API, community, status.
- Protected app routes: dashboard, credit cards, transactions, budgets, insights, location history, favorite merchants, settings, billing.
- Auth routes: login/signup, Google OAuth, forgot password, reset password, verify email, confirm email change.
- Finance-app safety controls: MFA, backup codes, login attempt lockout, deleted-account rejection, pending-verification rejection, idle timeout dialog, targeted auth-state clearing on logout.
- Onboarding gate for active users who have not completed first-time setup.
- Subscription gate for premium routes through `requirePro`.
- Mobile navigation and standalone auth pages.

## Flow Rules

These are the production rules every auth-sensitive route should follow:

- A logged-out user visiting `/dashboard`, `/transactions`, `/budgets`, `/settings`, `/settings/billing`, `/insights`, or `/admin/*` must land on `/auth`.
- The original route, including query string and hash, must be preserved in navigation state and used after login.
- A user who logs out must have local auth tokens, React Query cache, and in-memory auth state cleared before server sign-out.
- Browser Back after logout must not restore a protected screen from BFCache.
- Auth/recovery pages should not show the signed-in app shell, billing banners, or account navigation.
- `/auth`, `/login`, `/signin`, `/forgot-password`, `/reset-password`, `/verify-email`, and `/confirm-email-change` must never be accepted as post-login redirect targets.
- Admin routes must require both an authenticated session and an admin role.
- Premium routes must require both an authenticated session and an active/trialing subscription.

## Provider Recommendations

### Payments

Use **Stripe first** unless TrueSpend is India-first and UPI is the primary payment method.

Stripe is the better default for a US/global SaaS because subscriptions, Checkout, customer portal, webhooks, trials, invoices, tax, and payment retries are mature and easy to operationalize. Razorpay is attractive for India-first payments and UPI, but it should be added behind a provider abstraction after the Stripe flow is stable.

Recommended implementation:

- `billing_provider` abstraction in code: `stripe` now, `razorpay` later.
- Stripe Checkout for new subscriptions.
- Stripe Customer Portal for plan changes and cancellations.
- Webhook-driven subscription source of truth in the database.
- Never trust frontend plan state for access control; use database subscription state and RLS/server checks.

### Transactional Email

Use **Resend for MVP** because the developer experience is simple and the free tier is enough for verification, password reset, and early transactional alerts. At higher volume, evaluate AWS SES for cost or Postmark for deliverability-focused transactional email.

Required before launch:

- Domain verification.
- SPF, DKIM, and DMARC.
- Separate templates for verification, password reset, deletion recovery, budget alerts, payment failed, weekly digest, and security events.
- Unsubscribe handling for non-security digest emails.

### Hosting

Use **Cloudflare Pages** for the Vite website/app, with Supabase as the backend.

Why:

- Static app hosting scales well and cheaply.
- Global CDN and WAF are first-class.
- Static asset traffic is inexpensive at scale.
- Works cleanly with a Vite SPA.

Production setup:

- Cloudflare Pages for frontend.
- Supabase Pro/Team for Postgres, Auth, Storage, Edge Functions.
- Cloudflare WAF/rate limiting in front of public endpoints.
- Sentry or equivalent for frontend and Edge Function errors.
- Staging and production environments with separate Supabase projects.

### Financial Data Provider

Use **Plaid for MVP** if the first market is the US. It has the strongest product fit for consumer finance, transaction sync, webhooks, and account linking.

Alternatives to evaluate:

- Teller: potentially simpler and cheaper, but coverage is narrower.
- MX: strong enterprise alternative.
- Mastercard Open Banking / Finicity: strong open banking option, usually more enterprise-sales oriented.
- Akoya: strong bank-backed network, but product fit and access depend on partner needs.
- TrueLayer: stronger fit for UK/EU, not the default for US-first.

Keep a provider adapter layer so accounts and transactions are normalized into TrueSpend tables regardless of provider.

### Google APIs

Google OAuth already exists through Supabase. For location intelligence, add Google Maps Platform only where it improves merchant identification or maps UX.

Recommended APIs:

- Places API for merchant enrichment.
- Geocoding API only when a text address must become coordinates.
- Maps SDK only for map UI that Leaflet cannot cover well.

Use strict API key restrictions by domain, bundle ID, package name, and API scope.

## Credit Card Rewards Source Of Truth

The proposed rewards approach is correct, but the source of truth should not be raw AI output.

Recommended model:

- Create a canonical `credit_card_products` table keyed by issuer, network, card name, country, and product fingerprint.
- Create a versioned `reward_rules` table with category, MCC/category mapping, multiplier, cap, exclusions, effective date, source URL, confidence score, and review status.
- On first card connection, map the Plaid account name/issuer/card metadata to a card product.
- If unknown, enqueue a review/enrichment job.
- Use AI to extract and normalize issuer terms, but store source URLs and require confidence thresholds or human review before making reward recommendations.
- Reuse the verified database record for future users with the same card.

This gives the app a defensible internal rewards database while keeping AI as an extraction assistant, not the authority.

## Geolocation Policy

Only use geolocation for reward-relevant categories and never for sensitive inference by default.

Allowed categories:

- Dining and restaurants.
- Grocery.
- Gas and EV charging.
- Travel, hotels, airlines, rideshare, transit.
- Shopping and department stores.
- Drugstores.
- Entertainment where card rewards commonly apply.

Restricted or aggregate-only categories:

- Health, medical, pharmacy details beyond broad drugstore rewards.
- Political, religious, legal, adult, dating, gambling, and other sensitive categories.
- Home/work inference unless user explicitly opts in.

## Remaining Launch Blockers

P0:

- Payment provider production configuration and webhook testing.
- Transactional email provider domain setup.
- Hosted staging and production environments.
- Plaid production approval and webhook replay testing.
- E2E tests for signup, login, logout, password reset, dashboard, transactions, budgets, billing, and Plaid link.
- Monitoring and alerting.
- Legal review for privacy, data processing, AI recommendations, and financial-data disclaimers.

P1:

- Real card rewards database and enrichment pipeline.
- Provider abstraction for Plaid/Teller/MX/Finicity.
- Fine-grained feature flags for Stripe/Razorpay/Plaid/Google APIs.
- Better bundle splitting for diagram/admin-only dependencies.
- Mobile on-device testing for iOS and Android.

## Latest Code Hardening Completed

- Protected-route redirects now preserve path, query string, and hash.
- Auth page now honors protected-route `state.from` as well as `?redirectTo=`.
- Redirect sanitizer rejects excessive redirect lengths.
- Logout BFCache guard is wired into the app shell.
- Auth/recovery pages no longer render global app chrome.
- Logo navigation no longer forces a full page reload.
- Admin landing route helper now points to `/admin`, not nonexistent `/admin/dashboard`.
- Removed `next-themes` dependency from the toaster.
- Moved Playwright to dev dependencies.
- Fixed CSS import order warning.
- Applied non-breaking dependency audit fixes; production dependency audit is clean.
- Simplified Vite manual chunking to remove circular chunk warnings.

## Verified Locally

- `npx tsc --noEmit --pretty false` passes.
- `npm run build` passes.
- `npm audit --omit=dev --audit-level=moderate` passes with zero vulnerabilities.
- Playwright route smoke test passed for:
  - `/`
  - `/auth`
  - `/forgot-password`
  - `/login`
  - `/transactions?category=dining#list`
  - `/settings/billing?success=true`
  - `/insights`
  - Back button after protected-route redirect.

## Known Engineering Debt

- `npm run lint` still fails due pre-existing lint debt across the extension, Supabase Edge Functions, and several older feature files. The dominant issues are explicit `any`, `@ts-nocheck`, hook dependency warnings, and a `require()` in `tailwind.config.ts`.
- Build still reports large chunk warnings. The circular chunk warnings are resolved, but heavy admin, Mermaid, and vendor dependencies still need deeper lazy-loading before public launch.
- Browserslist data is stale and should be updated in a separate dependency maintenance commit.
