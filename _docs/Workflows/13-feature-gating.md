# Feature Gating And Trial Behavior

## Scope

Phase 1 cross-cutting policy for how app features are turned on/off per user. Centralizes the entitlement model, the trial override rule, and the runtime enforcement points so individual feature workflows don't redefine gating per surface. The mechanism is fully data-driven by `billing.features` + `billing.plan_features`; this guide documents the framework and its trial behavior, not the specific seeded values (those are admin-managed reference data).

## Screens Covered

No new screens — gating affects existing surfaces by hiding/showing UI based on `EntitlementsResponse`.

| Screen | Effect |
|---|---|
| 3.1 / 3.2 / 3.3 / 3.4 | In-store recommendation surfaces respect `geofencing_enabled` for arrival push side; foreground rec stays available per Phase 1 baseline |
| 5.1 / 5.3 | Cards list / empty state shows upgrade CTAs when `card_link_limit` reached or `plaid_linking_enabled = false` |
| 5.4 | Plaid connections hidden entirely when `plaid_linking_enabled = false` |
| 6.1 | Transactions list filters out `source = plaid` rows when `plaid_transactions_view_enabled = false` |
| 6.3 | AI insights card hidden / disabled when `ai_insights_enabled = false` |
| 7.1 / 7.2 / lock screen | Geo-arrival push suppressed when `geofencing_enabled = false` |
| 8.3 | Billing screen surfaces upgrade CTAs for each gated feature |
| (any) | Trial countdown banner is shown when `trialing = true` |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can use all Pro features during their 7-day trial regardless of plan they picked | (any) | Option 1 trial override below |
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

## Trial Override Rule (Option 1: Full Access)

Phase 1 uses the industry-standard rule: **during `status = 'trialing'`, the entitlement resolver returns the full Pro feature set regardless of which plan the user selected at checkout.**

| Subscription state | Effective feature set |
|---|---|
| `trialing` | All features enabled (Pro equivalent) — `EntitlementsResponse.trialing = true` |
| `active` | Resolved from `billing.plan_features` for the user's plan |
| `past_due`, `unpaid` | Grace window: keep last-known entitlements for 24h, then downgrade to Basic |
| `canceled`, `incomplete_expired` | Downgrade to Basic feature set |
| no subscription row | Basic feature set (read-only access maintained for offboarding) |

**Why Option 1:** simpler resolver, generous trial UX, well-established pattern (Spotify, Notion, Linear). Option 2 (surgical per-feature trial unlock via an `is_trial_only_grant` flag on `billing.plan_features`) is recorded in Design Gaps below — switch only when product-strategy needs differ per feature.

## Gateable Features

Source of truth: `billing.features.code`. Add a row here to introduce a new gate; the resolver picks it up without code changes.

| Feature code | What it gates | Server enforcement points |
|---|---|---|
| `card_link_limit` (integer) | Max linked + manual cards | `POST /cards/manual`, `POST /plaid/exchange-token` reject when limit reached |
| `unlimited_cards` (boolean) | Bypasses the cap | Same endpoints as above |
| `ai_insights_enabled` (boolean) | AI insights tab + generation | `GET /ai-insights`, `POST /ai-insights/generate`, `AIInsightGenerationJob` (re-check at run time per [job-architecture.md](../low-level-design/Service/job-architecture.md#aiinsightgenerationjob)) |
| `plaid_linking_enabled` (boolean) | Plaid Link flow + connection management | `POST /plaid/link-token`, `POST /plaid/exchange-token`, `POST /plaid/connections/*` |
| `plaid_transactions_view_enabled` (boolean) | Visibility of `source = plaid` rows in transaction list/detail | `GET /transactions`, `GET /transactions/{id}` filter `source` server-side |
| `geofencing_enabled` (boolean) | Geo-arrival push notification | `POST /api/v1/webhooks/foursquare` skips notification insert when disabled |

## Contracts Used

`EntitlementsResponse` is the single source of runtime gating data on mobile.

| Field | Type | Notes |
|---|---|---|
| `planCode` | string | Currently effective plan |
| `trialing` | boolean | `true` while `subscriptions.status = 'trialing'` |
| `trialEndsAt` | timestamp, nullable | When trial flips to active or canceled |
| `cardLinkLimit` | int, nullable | `null` when `unlimited_cards = true` |
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

| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Open | Tier Mapping | Product spec | Original [truespend-overview](../UserStory/mobile-user-stories.md) tier split was "Basic = 3 Plaid + 2 manual, Pro = unlimited". Adding `plaid_linking_enabled`, `plaid_transactions_view_enabled`, `geofencing_enabled` as gates implies a tier shift (Plaid moves Pro-only, etc.) | Product owner confirms which features sit in Basic vs Pro for v1, then seed `billing.plan_features` accordingly | Architecture supports any matrix; the actual Basic/Pro split is a product decision |
| Open | Contract Shape Issue | API | `EntitlementsResponse` does not yet include `trialing`, `trialEndsAt`, `plaidLinkingEnabled`, `plaidTransactionsViewEnabled`, `geofencingEnabled` fields | Add the fields to `EntitlementsResponse` in [api-design-extended.md](../low-level-design/Service/api-design-extended.md) once the tier mapping above is locked | Mobile gating reads from this contract |
| Open | Trial Policy | Workflow | Phase 1 ships with Option 1 (trial = full Pro access) | Revisit if product wants per-feature trial unlock (Option 2 = add `is_trial_only_grant` to `billing.plan_features`) | Industry default fits Phase 1; surgical control is a later refinement |
