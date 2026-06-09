# Phase 1 Workflow Mapping Common Guide

This guide defines how Phase 1 mobile workflows should be documented for TrueSpend.
Each workflow guide should map user stories and mockup screens to API calls, contracts,
database tables, execution mode, events/consumers, and caching decisions.

## Scope

- This workflow documentation is strictly for Phase 1 mobile workflows.
- Phase 2 features can be mentioned only as out of scope when they appear in shared screens.
- The focus is online behavior. Offline and sync behavior should be minimized unless the Phase 1 screen directly requires it.
- Workflow docs should be clear and concise. Detailed conventions belong in this common guide.
- Individual workflow docs should prefer compact tables and short bullet notes over long explanations.

## Source Of Truth

The canonical design sources are:

- API contracts: `_docs/low-level-design/Service/api-design-extended.md`
- Database design: `_docs/low-level-design/DB/db-design-extended.md`
- User stories: `_docs/UserStory/mobile-user-stories.md`
- Mobile UX references: `_docs/MobileApp-Mockup/index.html`

Workflow docs must not silently invent APIs, request fields, response fields, tables, or columns.
If a workflow requires a design change, record it as a design gap and then update the canonical
API or DB design before considering the workflow final.

## Workflow Document Template

Each Phase 1 workflow doc should use this structure:

```md
# Workflow Name

## Scope
## Screens Covered
## User Stories Covered
## Preconditions
## Primary API Sequence
## Step Matrix
## Contracts Used
## Tables Involved
## Cache Strategy
## Sync vs Async Decisions
## Invalidation Triggers
## Loading And Error States
## Design Gaps
```

Individual workflow docs should stay concise:

- Do not repeat detailed rules from this common guide.
- Prefer one short paragraph for scope and preconditions.
- Keep user story coverage as a table.
- Keep API/table/cache mapping in the step matrix.
- List only workflow-relevant contract fields.
- List table names and their role, not column definitions.
- Use short notes for edge cases, loading states, and design gaps.
- Move broad rationale or conventions back into this common guide.

## User Stories Covered

Each workflow doc must list the Phase 1 user stories it covers. Use the wording from
`_docs/UserStory/mobile-user-stories.md` as closely as practical.

Recommended table:

```md
| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can view all linked and manually added cards | 5.1 | Covered by cards list load |
| Partial | User can recover from expired authentication | 1.2, 1.3 | Workflow covers app behavior, provider specifics remain in auth setup |
```

Coverage values:

- `Full`: the workflow fully covers the story.
- `Partial`: the workflow covers part of the story, or the implementation depends on provider/platform behavior.
- `Out of scope`: the story appears nearby but belongs to another workflow.

Rules:

- Include only Phase 1 stories.
- Reference mockup screen IDs where available.
- Keep this section traceable, not exhaustive prose.

## Step Matrix

Each workflow should include a step matrix with these columns:

```md
| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
```

Column guidance:

- `Step`: user-visible action or screen transition.
- `API`: endpoint and method from `api-design-extended.md`.
- `Contract`: request and response model names, plus workflow-relevant fields when needed.
- `Execution`: one of the execution modes defined below.
- `Events/Consumers`: event names and async consumers, or `None`.
- `Tables`: DB tables read or written, grouped only when useful.
- `Cache`: client-side and server-side cache behavior.

Example:

```md
| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load cards tab | GET /api/v1/cards | CardsResponse -> CardSummaryVm[] | Sync API | None | finance.user_cards, catalog.card_products, catalog.card_issuers | Mobile persistent cache; server joins may use catalog cache |
```

## Execution Modes

Use one of these execution modes for every API-backed step.

| Mode | Meaning | Use When |
|---|---|---|
| `Sync API` | Work completes before the API response returns | User needs the result immediately |
| `Sync API + Event` | API returns the primary result, then publishes events for side effects | User needs saved state now, but follow-up processing can trail |
| `Async Job` | API starts work and returns job/run status | Work is slow, expensive, provider-dependent, or AI-heavy |
| `Webhook Driven` | External provider is the state source | Stripe or Plaid owns the state transition |
| `Precomputed Read Model` | API reads already-computed data | Aggregates, summaries, and generated insights |

Default Phase 1 sync operations:

- Load profile, preferences, permissions, cards, catalog, transactions, notifications, billing state.
- Create or update profile/preferences/permissions.
- Create manual card.
- Generate in-store recommendation.
- Save a transaction's primary record and immediate reward result when cheap enough.
- Mark notification read or read all.
- Update notification settings.
- Create Stripe checkout or customer portal URL.

Default Phase 1 event-backed operations:

- Manual transaction created, updated, or deleted.
- User card created, updated, deleted, or set primary.
- Reward override changed.
- Notification read state changed, when audit or analytics is needed.
- Privacy/data request created.

Default Phase 1 async jobs:

- AI insight generation.
- Data export.
- Location history clear.
- Account deletion purge.
- Analytics recomputation when it cannot be done inline cheaply.

Default Phase 1 webhook-driven operations:

- Stripe subscription lifecycle updates.
- Stripe payment method updates.
- Plaid connection status changes, when reported by provider callbacks or later sync.

## Event Naming

Use the format:

```text
domain.entity.action
```

Examples:

- `finance.transaction.created`
- `finance.transaction.imported`
- `finance.transaction.updated`
- `finance.transaction.deleted`
- `finance.user_card.created`
- `finance.user_card.updated`
- `finance.user_card.deleted`
- `finance.reward_override.upserted`
- `finance.reward_override.deleted`
- `billing.subscription.updated`
- `messaging.notification.created`
- `privacy.data_export.requested`
- `privacy.location_history_clear.requested`
- `privacy.account_deletion.requested`
- `insights.ai_generation.requested`

For each event in a workflow doc, list:

- Producer API or webhook.
- Consumer/job name.
- User-visible effect, if any.
- Tables read and written.
- Cache invalidation triggered.

## Domain Event Outbox

App-level domain events use a transactional outbox plus per-consumer delivery rows for at-least-once dispatch without distributed transactions.

Tables: `messaging.event_outbox`, `messaging.event_subscriptions`, `messaging.event_deliveries`. Statuses: `lookup.event_outbox_statuses`, `lookup.event_delivery_statuses`. See `db-design-extended.md § messaging` and `§ lookup`.

### Producer rules

- Insert the event row into `messaging.event_outbox` in the same DB transaction as the source change. Never publish from in-memory state only.
- `payload` is opaque to the outbox; producers and consumers agree per `event_type`. Include `payload.version` for forward compatibility.
- Set `idempotency_key` when the source operation already has a stable external/client key, such as Plaid transaction ID or a client-generated ID for manual entry; leave null otherwise.
- Default `status = 'queued'`, `available_at = now()`. Use a future `available_at` for delayed events.

### Dispatcher rules

- Poller selects `event_outbox` rows where `status = 'queued'` and `available_at <= now()`.
- For each row: look up active `event_subscriptions` matching `event_type`, insert one `event_deliveries` row per subscriber with `status = 'pending'`, flip event to `dispatched`.
- Per-consumer worker claims `pending` deliveries, sets `processing`, invokes consumer, then sets terminal status.
- On failure: schedule `next_attempt_at` using `retry_backoff_seconds` (exponential up to `max_retries`), then `dead_lettered`.
- Roll-up: all deliveries `succeeded` → event `succeeded`; any `dead_lettered` → event `partially_failed`; no active subscriptions → `failed` (noop).

### Consumer naming

- Class-style names: `MissedRewardNotificationProducer`, `AnalyticsRecomputeConsumer`, `EntitlementCacheInvalidator`.
- A single consumer can subscribe to multiple `event_type`s via additional `event_subscriptions` rows.

### When not to use the outbox

- Provider webhook idempotency: handlers write `*_webhook_events` rows first; the outbox does not replace provider dedup.
- Inline cache invalidation that must take effect within the originating request can be done inline (no outbox row).
- Cron-only triggers (e.g. weekly summary) start a producer directly; that producer can still write a `messaging.notifications` row + an outbox event for fan-out.

## Caching Taxonomy

Use these cache locations consistently:

| Cache Location | Use For | Notes |
|---|---|---|
| Mobile memory cache | Current screen data, temporary form options, active recommendation | Short-lived and cleared naturally |
| Mobile persistent cache | Profile, preferences, cards, catalog values, notification settings, recent transactions | Refresh on app start, app foreground, TTL expiry, or write success |
| Server cache | Catalog, lookup tables, reward rules, plan features, entitlements, merchant resolution | Cache-aside or write-through after DB commit |
| DB read model | Analytics snapshots, AI insights, notification summaries if added | Source is DB, refreshed by consumers/jobs |
| Provider-backed local DB cache | Stripe and Plaid state copied into local tables | Provider webhooks or explicit sync update local DB |

## Dropdown And Reference Data Cache Rule

Dropdown/reference APIs should be cached by default.

Examples:

- `GET /api/v1/card-catalog/issuers`
- `GET /api/v1/card-catalog/products`
- `GET /api/v1/card-catalog/search`
- `GET /api/v1/card-catalog/categories`
- `GET /api/v1/card-catalog/category-aliases`
- `GET /api/v1/card-catalog/reward-rules`
- `GET /api/v1/billing/countries`
- `GET /api/v1/billing/plans`
- `GET /api/v1/billing/prices`
- `GET /api/v1/billing/features`
- `GET /api/v1/notification-settings/types`
- All `/api/v1/lookups/*` endpoints.

If a new dropdown/reference value is added:

1. Write the new value to the database first.
2. Commit the DB transaction successfully.
3. Update or invalidate the server cache.
4. Let mobile receive the new value through refresh, TTL expiry, or explicit cache invalidation.

The cache must never be the source of truth for dropdown/reference data.

## Default Cache Rules

- Catalog and lookup data: cache aggressively on server and mobile.
- User profile/preferences/permissions: cache on mobile; refresh on app start or foreground.
- User cards: cache on mobile; invalidate after card create/update/delete/primary changes.
- Recommendations: short TTL; invalidate after card, reward rule, override, or category changes.
- Transactions: cache list and detail briefly; invalidate after create/update/delete.
- Analytics summaries: read from precomputed DB read models or server cache; invalidate or recompute after transaction changes.
- AI insights: read from DB; generation is async; invalidate when dismissed or privacy setting disables personalized AI.
- Billing and entitlements: server authoritative; short mobile cache; invalidate on Stripe webhook and checkout return.
- Notifications: cache inbox briefly; invalidate after read/read-all/settings changes.

## Invalidation Vocabulary

Use these terms in workflow docs:

- `On write success`
- `On provider webhook`
- `On app foreground`
- `On pull-to-refresh`
- `TTL expiry`
- `Entitlement change`
- `Catalog sync`
- `Reference data write`
- `Consumer completion`

Example:

```md
| Trigger | Client Cache | Server Cache | Read Model |
|---|---|---|---|
| finance.transaction.created | Invalidate transactions and transaction detail | Invalidate user analytics cache | Recompute analytics_snapshots |
```

## Table Mapping Rules

List tables by role instead of repeating column definitions.

Recommended grouping:

- `Reads`
- `Writes`
- `Derived writes`
- `Lookup/reference`
- `Provider/audit/log`

Example:

```md
## Tables Involved

- Reads: finance.user_cards, catalog.reward_rules, catalog.categories
- Writes: finance.transactions
- Derived writes: finance.transaction_reward_results, finance.missed_reward_events
- Read models: insights.analytics_snapshots
```

## Contract Mapping Rules

- Always name the endpoint, HTTP method, request model, and response model.
- Include only workflow-relevant request/response fields in workflow docs.
- Refer to `api-design-extended.md` for full contract details.
- Name shared view models, such as `CardSummaryVm`, `MoneyVm`, `TransactionVm`, and `RecommendationVm`.
- Do not duplicate full contract definitions unless a workflow-specific field is important to discuss.

## Design Gaps

Use design gaps when a workflow reveals that the canonical API or DB design needs adjustment.

Design gap categories:

- `Missing API`
- `Missing Request Field`
- `Missing Response Field`
- `Contract Shape Issue`
- `Missing Table`
- `Missing Column`
- `Redundant API`
- `Redundant Table/Column`
- `Derived Data Needed`
- `Cache/Invalidation Gap`
- `Async/Event Gap`

Recommended table:

```md
| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Open | Missing Response Field | API | GET /api/v1/cards | Add field needed by UI | Cards screen needs this value |
```

Rules:

- Workflow docs may record proposed changes, but source-of-truth docs must be updated before the workflow is final.
- Once the API/DB docs are updated, remove the resolved entry from the workflow doc by default. Keep a `Resolved` row only when the resolution is non-obvious from the current source-of-truth docs and a reader would benefit from seeing the rationale.
- If a workflow doc has no remaining gaps, the Design Gaps section should read `None currently open.`.
- Do not create a second competing design inside workflow docs.

## Loading And Error States

Each workflow doc should briefly mention relevant online states:

- Initial loading.
- Refresh-in-place.
- Empty state.
- Validation error.
- Authorization/session expired.
- Provider redirect failure.
- Provider unavailable.
- Server failure.
- Permission denied, where applicable.

Keep this section concise and tie states to screens/user stories when possible.

## Phase 1 Workflow Index

The following workflow docs should be created for Phase 1.

| File | Workflow | Primary Screens | Main Areas Covered |
|---|---|---|---|
| `01-auth-session.md` | Auth And Session | 1.1, 1.2, 1.3 | Splash, passwordless sign-in, OAuth/OTP callbacks, session restore, expired auth recovery |
| `02-onboarding.md` | Onboarding, Linking, Plan Selection | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | Plaid linking, manual card entry, permissions, plan selection, Stripe checkout entry, notification opt-in |
| `03-recommendations.md` | Recommendations (renders inside Wallet tab) | 3.1, 3.2, 3.3, 3.4 | Empty state, detected merchant, merchant/category resolution, recommendation, runner-up cards, coverage warnings |
| `04-cards.md` | Wallet (Cards) And Plaid Connections | 5.1, 5.2, 5.3, 5.4 | Default tab, greeting, cards list, card detail, manual cards, reward overrides, card limits, Plaid connection health/reconnect/disconnect |
| `05-transactions.md` | Transactions | 6.1, 6.1b, 6.2 | Transaction list/search/filter, manual transaction creation, Plaid import, reward check, detail, edit, delete, missed reward event |
| `06-insights-analytics.md` | Insights, Analytics, And AI Insights | 6.3 | Rewards summary, missed rewards summary, daily/category breakdowns, top missed rewards, Azure OpenAI insights |
| `07-notifications.md` | Notifications And Notification Settings | 7.1, 7.2, 7.3 | Inbox, filters, detail, missed reward notification, reminders, read state, channel/type preferences, quiet hours, devices |
| `08-profile-preferences.md` | Profile, Preferences, Permissions | 8.1, 8.2 | Profile display/edit, preferences, sign-in methods visibility, biometric preference, permission status, sign out |
| `09-billing-entitlements.md` | Billing, Subscription, And Entitlements | 2.5, 8.3 | Plans, prices, Stripe checkout, customer portal, payment methods, subscription state, entitlements/card limits |
| `10-geo-recommendations.md` | Geo Arrival Recommendations | 2.4, 7.1, 7.2, 7.3, lock screen | Foursquare-driven background geofence push: webhook handler, merchant resolution, recommendation, push fan-out |
| `11-sync-status.md` | Sync Status Online View | 8.5 | Online sync status, pending counts, conflicts list, retry sync; offline behavior intentionally minimized |
| `13-feature-gating.md` | Feature Gating And Trial Behavior | (cross-cutting) | Entitlement model, trial override rule, feature codes, server-side enforcement points |
| `14-privacy-data.md` | Privacy And Data Controls | 8.4 | Privacy settings, data export, location history download/clear, account deletion request/cancel |

## Phase 1 Workflow Ordering

Create and review workflow docs in this order:

1. `01-auth-session.md`
2. `02-onboarding.md`
3. `04-cards.md`
4. `03-recommendations.md`
5. `05-transactions.md`
6. `06-insights-analytics.md`
7. `07-notifications.md`
8. `08-profile-preferences.md`
9. `09-billing-entitlements.md`
10. `10-geo-recommendations.md`
11. `11-sync-status.md`
12. `13-feature-gating.md`
13. `14-privacy-data.md`

This order builds from identity and setup into cards, recommendations, transactions, derived
insights, messaging, account settings, billing, geo-arrival pushes, sync, the feature gating
framework that ties entitlements to runtime, and finally privacy.
