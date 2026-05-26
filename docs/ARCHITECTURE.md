# TrueSpend Architecture

## Target Architecture

TrueSpend is a static React application deployed on Cloudflare Pages. Supabase is the backend: Auth, Postgres, RLS, Storage, Realtime, and Edge Functions.

```text
Web / iOS / Android / Chrome Extension
  -> Cloudflare Pages CDN + WAF
  -> React app shell
  -> Supabase Auth for sessions and OAuth
  -> Supabase Postgres through RLS policies
  -> Supabase Edge Functions for provider secrets, AI, webhooks, billing
  -> Plaid, Stripe, Resend, Google Maps, Anthropic
```

There is no separate Node/Express backend. Business logic that needs secrets or strong trust boundaries belongs in Edge Functions. User-specific reads can go directly through Supabase tables only when RLS is active and the query is simple.

## Product Modules

| Module | Purpose | Status |
| --- | --- | --- |
| Marketing site | Home, features, pricing, legal pages | Built; copy should stay reward-agent focused |
| Auth | Email/password, Google OAuth, reset, verification, MFA UI | Built; needs E2E coverage |
| Dashboard | User summary, AI nudge, feature entry points | Built; needs final UX polish and seeded-data validation |
| Transactions | Manual entry, filtering, AI categorization, Plaid data target | Built; should move reads through `bff-transactions` |
| Budgets | Category budgets and alerts | Built; needs final empty/error states and realistic test data |
| Credit cards | Card CRUD and Plaid linking | Built; reward editor/catalog must be completed |
| Recommendations | AI recommendation feed | Initial implementation merged |
| Insights | Spending analysis through `ai-agent` | Partially migrated; legacy compatibility endpoints remain |
| Billing | Stripe checkout and portal | Code exists; live Stripe setup pending |
| AI agent | Claude-backed rewards assistant with caching, rate limiting, and deterministic fallback | Built; production key and model budget monitoring pending |
| Extension | Merchant detection and popup shell | Partial; build/publish pipeline pending |
| Mobile | Capacitor iOS/Android shell | Partial; native device testing pending |
| Internal ops | Admin, observability, ML scaffolds | Too large for MVP; should be reduced after launch path is stable |

## AI Agent Design

The preferred path is one agent endpoint:

```text
src/shared/hooks/useAIAgent.ts
  -> supabase.functions.invoke("ai-agent")
  -> tools query user spending, cards, rewards, budgets
  -> response returns user-facing text + structured data
```

Primary intents:

| Intent | User value |
| --- | --- |
| `analyze_spending` | Explain recent spending and trends |
| `best_card_now` | Recommend the best existing card for a merchant/category |
| `missed_rewards` | Calculate rewards left on the table |
| `recommend_card_to_apply` | Suggest a card worth applying for based on actual spend |
| `chat` | Natural-language finance/rewards questions |

Compatibility endpoints such as `ai-analyze-spending`, `ai-categorize-transaction`, and `location-insights-ai` still exist so older UI and server paths do not break. They should be deleted only after all callers are migrated to `ai-agent`.

## Authentication And Navigation

Expected behavior:

| Scenario | Correct result |
| --- | --- |
| Logged-out user opens `/dashboard` | Redirect to `/auth` and preserve destination |
| Successful email login | Redirect to preserved destination or `/dashboard` |
| Successful Google login | OAuth callback finishes on `/auth`, then redirects to preserved destination |
| Logged-in user opens `/` | Show marketing home; do not force dashboard |
| User logs out | Clear only Supabase auth keys and redirect to `/auth` |
| Browser Back after logout | Protected route re-checks auth and redirects to `/auth` |
| Non-admin opens `/admin/*` | Redirect to `/dashboard` |
| Free user opens a premium route | Redirect to `/settings/billing` |

Auth enforcement is layered:

- Frontend: `ProtectedRoute` gates navigation and UI.
- Database: RLS enforces `auth.uid() = user_id`.
- Edge Functions: JWT validation and service-role operations scoped to server-side code.

## Data Flow: Card Recommendation

```text
Plaid imports transactions
  -> transactions normalized by merchant/category
  -> cards linked to card catalog and reward categories
  -> ai-agent compares transaction category + merchant + card reward rules
  -> recommendation saved in ai_recommendations
  -> dashboard / recommendations / extension / mobile displays one clear action
```

The card catalog should become the source of truth. When the first user adds a card, AI can help parse rewards from trusted source material. After review, that normalized reward structure is reused for later users with the same card.

## Data Flow: Receipt OCR

```text
Receipt capture
  -> Supabase Storage image upload
  -> Google Vision or Claude Vision fallback
  -> structured merchant/date/amount/category
  -> user confirms before transaction insert
```

Receipt parsing must never silently create financial records without a confirmation screen.

## Data Flow: Plaid

```text
Credit Cards page
  -> plaid-create-link-token
  -> Plaid Link
  -> plaid-exchange-token
  -> plaid_items / plaid_accounts
  -> webhook-plaid and plaid-sync-transactions
  -> transactions
```

Remaining production hardening:

- Cryptographically verify Plaid webhook JWTs.
- Implement removed transaction handling.
- Handle pending-to-posted transitions.
- Add deduplication between manual and Plaid-created transactions.

## AI Cost And Availability Controls

The `ai-agent` Edge Function routes short analytical intents to the fast Claude model and keeps conversational/card-application flows on the stronger agent model. Cacheable responses are stored in `ai_agent_cache`, keyed by user, intent, and payload hash. If Anthropic is unavailable or rate-limited, deterministic tool-based summaries keep the dashboard usable without pretending an AI response was generated.

## Deployment Boundaries

| Concern | Location |
| --- | --- |
| Static app | Cloudflare Pages |
| CDN/WAF/security headers | Cloudflare |
| Auth/session/OAuth | Supabase Auth |
| User data | Supabase Postgres with RLS |
| Files/receipts | Supabase Storage |
| AI/provider secrets | Supabase Edge Functions |
| Payments | Stripe Edge Functions + Stripe dashboard |
| Email | Resend through Edge Functions |
| Maps | Google Maps browser key + optional server key |

## What Not To Add Yet

Avoid adding new custom infrastructure before the MVP is stable:

- Custom observability platform
- Custom ML training pipelines
- Duplicate BFF endpoints for every page
- Multiple maps providers
- Multiple payment processors before Stripe is live
- New admin pages that are not tied to an operational need
