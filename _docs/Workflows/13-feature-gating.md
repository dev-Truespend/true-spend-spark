# Feature Gating And Trial Behavior

> **MVP execution note** — The `truespend.eventconsumer` is not deployed in the MVP. The `billing.subscription.updated` → `EntitlementCacheInvalidator` dispatch referenced below runs **inline post-commit** in the API, in place of the archived outbox/consumer path. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Progress

| User story | Status | Notes |
|---|---|---|
| User can choose Free, Basic, or Pro with per-tier feature limits | Done | 3-tier model seeded in `billing_plans.sql` + `billing_plan_features.sql`; per-source `manual_card_limit` / `plaid_card_limit` + `geo_recommendations_per_day` features; `EntitlementGuard.RequireCardLinkCapacityAsync(user, source, count)` and `FoursquareWebhookBusiness` geo daily cap enforce them |
| User gets the picked plan's features during their trial (Basic 7-day, Pro 14-day) | Done | `EntitlementPlanResolver` now returns `subscription.planCode` while `trialing`; fallback baseline is Free, not Basic. `EntitlementPlanResolverTests` updated |
| User can see upgrade guidance when a paid feature is gated | Done | `EntitlementsResponse` extended with `Trialing`, `TrialEndsAt`, `PlaidLinkingEnabled`, `PlaidTransactionsViewEnabled`, `GeofencingEnabled`; new feature seeds in `billing_features.sql` + `billing_plan_features.sql` (plaid linking + transactions view = Basic+, geofencing = all tiers). **Audit fix (2026-06-04):** mobile CardsScreen/CardEmptyState/PlaidConnectionsScreen/InsightsScreen now read `useEntitlementGate` and surface upgrade CTAs / hide Plaid section / hide AI Insights generation when the corresponding feature is disabled. |
| User can be redirected to billing when opening a higher-plan feature | Done | `EntitlementRequiredAppException` + `ExceptionMiddleware` writes `{ errorCode:"ENTITLEMENT_REQUIRED", featureCode, requiredPlanCode, message }`; mobile `errorMapper` maps to `EntitlementRequiredAppError`, `queryClient` `QueryCache`/`MutationCache` `onError` route via `useEntitlementRequiredRouter` → `/(app)/billing?requiredPlanCode=...`. **Audit fix (2026-06-04):** `PlaidUpdateBusiness.SyncConnection/Reconnect/Disconnect/SyncPlaidTransactions` now call `entitlementGuard.RequireFeatureAsync(plaid_linking_enabled)` so `POST /plaid/connections/*` is gated end-to-end. **Audit fix #2 (2026-06-04):** `ExceptionMiddleware` was defined but never wired into the request pipeline, so every domain exception (including `EntitlementRequiredAppException`) was leaking as a raw 500; `Program.cs` now registers `CorrelationIdMiddleware` + `ExceptionMiddleware` ahead of `UseAuthentication`. |
| User can see entitlement changes reflected in the app shortly after Stripe webhook processing | Done | Pre-existing `EntitlementCacheInvalidator` from workflow 09. **Audit fix (2026-06-04):** outbox polling was a stub — now `OutboxPollingConsumer` actually dispatches `billing.subscription.updated` to `EntitlementCacheInvalidator`; mobile invalidates `QueryKeys.Entitlements` on app foreground via `useAppForegroundRefresh`. |
| User can lose Pro features when their trial ends without upgrading | Done | Resolver state machine: `active` → picked plan, `past_due`/`unpaid` → keep picked plan for `BillingConstants.PastDueGraceWindow` (24h) from `CurrentPeriodEnd`, else drop to Free. **Audit fix (2026-06-04):** resolver extracted to `Models/Billing/EntitlementPlanResolver.Resolve(subscription, now)` with parameterized clock; `EntitlementPlanResolverTests` covers trialing override, active, past_due/unpaid in/out of grace, canceled/none. |
| User can see a reusable lock + upsell on any gated surface | Done | Shared `<FeatureGate feature="...">` (`shared/components/FeatureGate.tsx`) renders children when entitled, else a catalog-driven `ProUpsell` → paywall. Catalog `shared/navigation/featureCatalog.ts` maps feature code → min plan, lock label, upsell copy, paywall plan; entitlement = server flag OR `planMeets(plan, minPlan)`. Validated on Insights; remaining tabs roll out incrementally. |
| Pro-only manual Plaid re-sync gated with a daily quota | Done | `manual_resync_enabled` is code-backed (`EntitlementGuard.IsFeatureEnabled` → `plan==Pro`). `ManualResyncQuotaBusiness` enforces `ProResyncDailyLimit` (default 5) via `app.user_daily_usage`; user-initiated `POST /plaid/connections/sync` + `/plaid/transactions/sync` consume quota (nightly sweep bypasses via `SyncSingleConnectionAsync`). Over-limit → 429; `GET /plaid/resync-quota` + mobile `useResyncQuota` show remaining. |
| Home-map pins (Basic+) and place search (Pro) are tier-gated | Done | New `map_pins_enabled` (Basic+) + `place_search_enabled` (Pro) features seeded in `billing_features.sql` + `billing_plan_features.sql`. Server: `RecommendationsReadBusiness.GetNearbyMerchantsAsync` / `SearchPlacesAsync` call `EntitlementGuard.RequireFeatureAsync`. Mobile: `WalletScreen` reads `useEntitlementGate` — pins (`WalletGlobeBackground showPins` + skips `useNearbyMerchants` fetch) and `PlaceSearchBar` render only when entitled. Free still gets the map + auto-detected recommendation. |

## Scope

Phase 1 cross-cutting policy for how app features are turned on/off per user. Centralizes the entitlement model, the trial override rule, and the runtime enforcement points so individual feature workflows don't redefine gating per surface. The mechanism is fully data-driven by `billing.features` + `billing.plan_features`; this guide documents the framework and its trial behavior, not the specific seeded values (those are admin-managed reference data).

## Screens Covered

No new screens — gating affects existing surfaces by hiding/showing UI based on `EntitlementsResponse`.

| Screen | Effect |
|---|---|
| 3.1 / 3.2 / 3.3 / 3.4 | In-store recommendation surfaces respect `geofencing_enabled`; geo-arrival pushes are additionally capped per day by `geo_recommendations_per_day` (Free 1, Basic 3, Pro unlimited) |
| 3.1 / 3.2 (home map) | Nearby merchant pins shown only when `map_pins_enabled` (Basic+); place search shown only when `place_search_enabled` (Pro). Free sees the map + auto-detected recommendation alone. Both endpoints also enforced server-side. |
| 5.1 / 5.3 | Cards list / empty state shows upgrade CTAs when `manual_card_limit` / `plaid_card_limit` reached or `plaid_linking_enabled = false` |
| 5.4 | Plaid connections hidden entirely when `plaid_linking_enabled = false` |
| 6.1 | Transactions list filters out `source = plaid` rows when `plaid_transactions_view_enabled = false` |
| 6.3 | AI insights card hidden / disabled when `ai_insights_enabled = false` |
| 7.1 / 7.2 / lock screen | Geo-arrival push suppressed when `geofencing_enabled = false` |
| 8.3 | Billing screen surfaces upgrade CTAs for each gated feature |
| (any) | Trial countdown banner is shown when `trialing = true` |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User gets the picked plan's features during their trial (Basic 7-day, Pro 14-day) | (any) | Trial rule below — trial grants the chosen plan |
| Full | User can see upgrade guidance when a paid feature is gated | 5.1, 5.3, 6.3, 8.3 | Existing entitlement-driven CTAs |
| Full | User can be redirected to billing when opening a higher-plan feature | 5.1, 5.3, 8.3 | Existing |
| Full | User can see entitlement changes reflected in the app shortly after Stripe webhook processing | 8.3, 5.1 | `EntitlementCacheInvalidator` ([webhook-handlers.md](webhook-handlers.md#consumers-triggered)) |
| Full | User can lose Pro features when their trial ends without upgrading | (any) | Stripe webhook flips subscription to non-trial; entitlements re-resolve |

## Preconditions

- User has an authenticated session.
- `billing.subscriptions` row exists for the user (created at first checkout — see [02-onboarding.md](02-onboarding.md)).
- `billing.features` and `billing.plan_features` are seeded.
- Mobile reads the user's effective feature set from `GET /api/v1/entitlements` and caches it.

## Primary API Sequence

```text
Cold start (after auth bootstrap)
  GET /api/v1/entitlements   <- resolves features for current subscription state
  Mobile gates every gated surface from the response

On Stripe webhook (trial -> active, active -> canceled, plan change)
  billing.stripe_webhook_events written
  messaging.event_outbox writes billing.subscription.updated
  EntitlementCacheInvalidator drops server cache, mobile refreshes on next foreground
  GET /api/v1/entitlements   <- returns new feature set

On gated API call (e.g. POST /plaid/link-token)
  Server re-resolves entitlements
  If feature disabled -> 403 ENTITLEMENT_REQUIRED with reason + planCode required
  Mobile routes to billing screen
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Resolve entitlements | `GET /api/v1/entitlements` | `EntitlementsResponse` | Sync API | Consumed by `EntitlementCacheInvalidator` on `billing.subscription.updated` | Read `billing.subscriptions`, `billing.plans`, `billing.plan_features`, `billing.features`, `lookup.subscription_statuses` | Server per-user short TTL; mobile persistent until subscription event |
| Apply trial override | server-internal | Entitlement resolver sees `status = 'trialing'` and applies trial-override rule | Inline within entitlement resolution | None | Read same as above | Same as above |
| Server-side gate | every gated endpoint | Re-checks `EntitlementsResponse` before processing | Inline | None | Read entitlement cache | Server entitlement cache |
| Stripe webhook reshape | `POST /api/v1/webhooks/stripe` | `WebhookAckResponse` | Webhook Driven | Publishes `billing.subscription.updated` → `EntitlementCacheInvalidator` ([webhook-handlers.md](webhook-handlers.md)) | Write `billing.subscriptions`, `billing.stripe_webhook_events`, `messaging.event_outbox` | Invalidate per-user entitlement cache |

## Plan Tiers And Trial Rule

Three tiers, fully data-driven from `billing.plans` + `billing.plan_features`:

| Tier | Trial | Manual cards | Plaid cards | Geo recs/day | Plaid linking | AI insights | Map pins | Place search |
|---|---|---|---|---|---|---|---|---|
| Free | — | 1 | 0 | 1 | ❌ | ❌ | ❌ | ❌ |
| Basic | 7 days | 3 | 3 | 3 | ✅ | ❌ | ✅ | ❌ |
| Pro | 14 days | unlimited | unlimited | unlimited | ✅ | ✅ | ✅ | ✅ |

Home map tiering: **Free** sees the satellite map + auto-detected best-card recommendation only; **Basic** adds nearby merchant pins; **Pro** adds place search.

**Trial = the picked plan.** During `status = 'trialing'`, the resolver returns the feature set of the plan the user selected at checkout (a Basic trial grants Basic features, a Pro trial grants Pro). When entitlement falls away the baseline is **Free**, not Basic.

| Subscription state | Effective plan |
|---|---|
| `trialing` | `subscription.planCode` (the picked plan) |
| `active` | `subscription.planCode` |
| `past_due`, `unpaid` | Grace window: keep picked plan for 24h from `CurrentPeriodEnd`, then drop to Free |
| `canceled`, `incomplete_expired`, no subscription row | Free feature set |

Resolver: `Models/Billing/EntitlementPlanResolver.Resolve(subscription, now)`.

## Gateable Features

Source of truth: `billing.features.code`. Add a row here to introduce a new gate; the resolver picks it up without code changes.

| Feature code | What it gates | Server enforcement points |
|---|---|---|
| `manual_card_limit` (integer) | Max manually added cards | `POST /cards/manual` rejects when the manual count reaches the limit |
| `plaid_card_limit` (integer) | Max bank-linked (Plaid) cards | `POST /plaid/exchange-token` rejects when the plaid count reaches the limit |
| `geo_recommendations_per_day` (integer) | Geo-arrival recommendations per UTC day | `POST /api/v1/webhooks/foursquare` soft-skips once today's `geofence_arrival` count reaches the limit |
| `unlimited_cards` (boolean) | Bypasses both per-source card limits | `POST /cards/manual`, `POST /plaid/exchange-token` |
| `ai_insights_enabled` (boolean) | AI insights tab + generation | `GET /ai-insights`, `POST /ai-insights/generate`, `AIInsightGenerationJob` (re-check at run time per [job-architecture.md](../low-level-design/Service/job-architecture.md#aiinsightgenerationjob)) |
| `plaid_linking_enabled` (boolean) | Plaid Link flow + connection management | `POST /plaid/link-token`, `POST /plaid/exchange-token`, `POST /plaid/connections/*` |
| `plaid_transactions_view_enabled` (boolean) | Visibility of `source = plaid` rows in transaction list/detail | `GET /transactions`, `GET /transactions/{id}` filter `source` server-side |
| `geofencing_enabled` (boolean) | Geo-arrival push master switch (on for all tiers; the per-day cap differentiates tiers) | `POST /api/v1/webhooks/foursquare` skips notification insert when disabled |
| `map_pins_enabled` (boolean) | Home-map nearby merchant pins (Basic+) | `POST /recommendations/nearby-merchants` → `EntitlementGuard.RequireFeatureAsync` |
| `place_search_enabled` (boolean) | Home-map place search (Pro) | `POST /recommendations/search-places` → `EntitlementGuard.RequireFeatureAsync` |

Card-limit enforcement is per-source: `EntitlementGuard.RequireCardLinkCapacityAsync(user, cardSource, count)` checks `manual_card_limit` or `plaid_card_limit` (bypassed by `unlimited_cards`). Displayed limits come from the same entitlements via `CardLimitsCalculator`.

## Contracts Used

`EntitlementsResponse` is the single source of runtime gating data on mobile.

| Field | Type | Notes |
|---|---|---|
| `planCode` | string | Currently effective plan (`free` \| `basic` \| `pro`) |
| `trialing` | boolean | `true` while `subscriptions.status = 'trialing'` |
| `trialEndsAt` | timestamp, nullable | When trial flips to active or canceled |
| `manualCardLimit` | int, nullable | `null` when `unlimited_cards = true` |
| `plaidCardLimit` | int, nullable | `null` when `unlimited_cards = true` |
| `geoRecommendationsPerDay` | int, nullable | `null` = unlimited |
| `unlimitedCards` | boolean | |
| `aiInsightsEnabled` | boolean | |
| `plaidLinkingEnabled` | boolean | |
| `plaidTransactionsViewEnabled` | boolean | |
| `geofencingEnabled` | boolean | |

`ENTITLEMENT_REQUIRED` error shape returned by any server-side gate:

```jsonc
{
  "errorCode": "ENTITLEMENT_REQUIRED",
  "featureCode": "plaid_linking_enabled",
  "requiredPlanCode": "pro",
  "message": "This feature is available on Pro."
}
```

Mobile routes to the billing screen (8.3) pre-selecting `requiredPlanCode` on `ENTITLEMENT_REQUIRED`.

## Tables Involved

| Role | Tables |
|---|---|
| Feature catalog | `billing.features`, `billing.plan_features` |
| Subscription state | `billing.subscriptions`, `lookup.subscription_statuses` |
| Plans | `billing.plans` |
| Provider audit | `billing.stripe_webhook_events` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions` |

No new tables introduced by this guide. Tier changes are seeded-data updates to `billing.plan_features`.

## Cache Strategy

- Server entitlement cache per user with short TTL; invalidated by `EntitlementCacheInvalidator` on `billing.subscription.updated`.
- Mobile persistent cache; refreshed on app foreground, on Stripe webhook return, and on `ENTITLEMENT_REQUIRED` rejection.
- Feature catalog (`billing.features`, `billing.plan_features`) is cached as dropdown/reference data per [common-guide.md § Dropdown And Reference Data Cache Rule](common-guide.md#dropdown-and-reference-data-cache-rule); admin edits flow DB-first → cache invalidation → mobile TTL.

## Sync vs Async Decisions

- Entitlement reads are synchronous so screens can gate UI before render.
- Trial-override is inline in the resolver — never an event.
- Subscription state changes are webhook-driven; cache invalidation runs async via the outbox; mobile picks up new entitlements on next read.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| `billing.subscription.updated` (Stripe webhook) | Per-user entitlement server cache; mobile refreshes on next foreground |
| Admin edits to `billing.features` / `billing.plan_features` | Feature catalog cache (server + mobile reference cache via TTL) |
| Trial-end clock | No event — webhook from Stripe fires `customer.subscription.updated`, normal path applies |
| `ENTITLEMENT_REQUIRED` rejection at any endpoint | Mobile triggers a fresh `GET /entitlements` before routing to billing |

## Loading And Error States

- Entitlement fetch failure: keep last-known mobile cache; show a non-blocking refresh banner.
- `ENTITLEMENT_REQUIRED` from any endpoint: navigate to 8.3 with `requiredPlanCode` preselected; do not silently drop the action.
- Trial-end transition mid-session: next API call may return `ENTITLEMENT_REQUIRED`; mobile re-fetches entitlements and updates UI without forcing sign-out.
- Past-due grace window expiring: drop to Basic; existing gated screens transition to upgrade CTA states.

## Design Gaps

None currently open.
