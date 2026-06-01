# Geo Arrival Recommendations Workflow

## Scope

Phase 1 background flow that sends a push notification with the best card recommendation when the user arrives at a known merchant. Geofence detection, background location, and place matching are owned by Foursquare's SDK + webhooks. TrueSpend owns the merchant resolution, recommendation, and notification fan-out — all already-defined infrastructure. No new screens; the notification lands on the lock screen, in the inbox (7.1/7.2), and respects existing notification settings (7.3).

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 2.4 | Location permission | Onboarding must request OS "Always" / `ACCESS_BACKGROUND_LOCATION` so Foursquare can monitor in the background |
| 7.1 / 7.2 | Inbox + notification detail | The push lands here as a `best_card_alert` notification |
| 7.3 | Notification settings | `best_card_alert` toggle gates these pushes |
| (lock screen) | OS-rendered push | Tap routes to notification detail or recommendation |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can receive a push notification with the best card when they arrive at a known merchant | lock screen, 7.1, 7.2 | Foursquare webhook triggers the notification |
| Full | User can tap the push to open the recommendation | 7.2 | Standard push deep-link routing ([12-cross-cutting.md](12-cross-cutting.md#step-matrix)) |
| Partial | User can opt out of geo-arrival pushes | 7.3 | Toggle `best_card_alert` off; covered by [07-notifications.md](07-notifications.md) |
| Partial | User can grant the OS background location permission required by Foursquare | 2.4 | Owned by onboarding; Foursquare SDK drives the OS prompts |

## Preconditions

- Foursquare SDK initialized in the mobile app with the user's `auth.users.id` set as Foursquare `externalId`.
- OS background location permission granted ("Always" on iOS, `ACCESS_BACKGROUND_LOCATION` on Android).
- `messaging.notification_preferences.master_enabled = true` and the `best_card_alert` type preference is enabled.
- User has at least one active `finance.user_cards` row (otherwise the recommendation handler short-circuits).
- Foursquare webhook endpoint registered with Foursquare's dashboard pointing at `POST /api/v1/webhooks/foursquare`.

## Primary API Sequence

```text
Mobile app start (after auth)
  Foursquare SDK init(externalId = auth.users.id)
  Foursquare SDK trackOnce() or background tracking start

User physically arrives at a known place
  Foursquare SDK detects entry (no TrueSpend code runs on device)
  Foursquare -> POST https://api.truespend.app/api/v1/webhooks/foursquare

Server: webhook handler (single transaction)
  Verify Foursquare-Signature; reject 400 on mismatch
  Insert finance.foursquare_webhook_events (unique on foursquare_event_id); on conflict return deduplicated:true
  Resolve user_id from payload externalId
  Resolve finance.merchants from geofence tag / place metadata
  Generate recommendation -> insert finance.recommendations (context_code = 'geofence_arrival')
  Insert messaging.notifications (type = 'best_card_alert') with related_recommendation_id
  Insert messaging.event_outbox messaging.notification.created
  Optional: insert finance.location_events (event_type = 'geofence_entered')
  Return WebhookAckResponse

PushFanOutConsumer (existing, notification-production.md)
  Reads messaging.devices for user -> APNs/FCM delivery
  Writes messaging.notification_deliveries
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Initialize Foursquare SDK | Foursquare SDK (client) | `Foursquare.setUserId(auth.users.id)` | Client-side | None | None (provider state) | None |
| Register watch-list with Foursquare | Foursquare Geofences API (server-side admin or SDK) | Provider-specific | Out of band | None | None TrueSpend-side in Phase 1 | None |
| Receive arrival webhook | `POST /api/v1/webhooks/foursquare` | raw Foursquare event -> `WebhookAckResponse` | Webhook Driven | Publishes `messaging.notification.created` -> `PushFanOutConsumer`, `InboxCacheInvalidator` | Write `finance.foursquare_webhook_events`, `finance.location_events`, `finance.recommendations`, `messaging.notifications`, `messaging.event_outbox`; read `finance.user_cards`, `catalog.reward_rules`, `finance.card_reward_overrides`, `finance.merchants` | None at handler |
| Deliver push | `PushFanOutConsumer` (existing) | APNs / FCM provider | Async Job | Consumes `messaging.notification.created` | Read `messaging.devices`, `messaging.notification_preferences`; write `messaging.notification_deliveries` | None |
| Tap push | Client-side deep link → optional `GET /api/v1/notifications/{notificationId}` | `NotificationDetailResponse` | Sync API | None | Read `messaging.notifications`, `finance.recommendations` | Uses notification detail cache |

## Contracts Used

- `WebhookAckResponse` — `received`, `deduplicated`.
- `RecommendationVm`, `RecommendationCardVm`, `MerchantVm`, `CardSummaryVm` — embedded in the notification body / referenced by `related_recommendation_id`.
- `NotificationDetailResponse` — for the tap-through flow.
- `BestCardAlertPushPayload` — the APNs/FCM data payload constructed by the webhook handler. Defined in [api-design-extended.md § Push Payloads](../low-level-design/Service/api-design-extended.md#push-payloads).

No new view models. The notification is a standard `best_card_alert` row; the recommendation is a standard `finance.recommendations` row.

## Tables Involved

| Role | Tables |
|---|---|
| Provider idempotency | `finance.foursquare_webhook_events` |
| User cards / reward profile | `finance.user_cards`, `finance.card_reward_overrides`, `catalog.reward_rules`, `catalog.categories` |
| Merchant resolution | `finance.merchants` |
| Recommendation output | `finance.recommendations`, `lookup.recommendation_contexts` (`geofence_arrival`) |
| Arrival audit | `finance.location_events`, `lookup.location_event_types` (`geofence_entered`) |
| Notification + delivery | `messaging.notifications`, `messaging.notification_types`, `messaging.notification_preferences`, `messaging.notification_type_preferences`, `messaging.devices`, `messaging.notification_deliveries` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_subscriptions`, `messaging.event_deliveries` |

## Cache Strategy

- Webhook handler does not read from cache; it writes to DB and lets the outbox drive cache invalidation.
- Inbox cache for the user is invalidated by `InboxCacheInvalidator` via `messaging.notification.created` ([notification-production.md](notification-production.md#step-matrix)).
- The reward profile and merchant resolution caches from [03-home-recommendations.md](03-home-recommendations.md#cache-strategy) are reused; no new cache layer.
- Foursquare's own place / geofence state is owned by Foursquare and not mirrored locally in Phase 1.

## Sync vs Async Decisions

- Webhook receipt + DB writes + outbox insert are synchronous within the handler so Foursquare gets a fast `200`.
- Push delivery, inbox cache invalidation, and audit/analytics consumers run async off the outbox.

## Watch-list Strategy

Phase 1 uses **Foursquare Places only** — Foursquare's built-in POI database for known chains (Starbucks, Target, Whole Foods, gas-station brands, etc.). The webhook handler resolves the Foursquare `place.chain` to a `finance.merchants` row by chain name. No per-user geofence sync, no scheduled job, no new TrueSpend tables for monitored locations. Chains carry most category-reward value, so this covers the high-value cases out of the box.

## Later: Local Merchant Coverage

Out of scope for the initial Phase 1 cut but specced here so it can be turned on without re-architecting. This adds coverage for non-chain merchants the user actually visits — local "Joe's Coffee" style places that Foursquare Places doesn't know about.

**Trigger to ship:** users report missed arrivals at favorite local spots, or analytics show a meaningful share of `finance.merchant_visits` rows are at merchants Foursquare Places never matched.

**Mechanism:**

| Piece | Detail |
|---|---|
| Source of truth | Existing `finance.merchant_visits` (no new table needed for the watch-list itself) |
| Selection rule | Per user, top N most-visited merchants in the last 90 days where the chain was not already covered by Foursquare Places, with a minimum visit count threshold |
| Cap | N tuned to stay inside the iOS 20 active-region limit; Android allows up to 100 |
| Sync job | New nightly `FoursquareUserGeofenceSyncJob` ([job-architecture.md](../low-level-design/Service/job-architecture.md)) calls Foursquare's server-side Geofences API per user to upsert geofences with `tag = 'merchant_id:<id>'` and delete ones that fell off the list |
| Webhook payload | Foursquare fires `user.entered_geofence` with `geofence.tag` — the handler reads the tag and goes straight to `finance.merchants.id`, skipping the chain-name match path |
| iOS region swap | Job recomputes the top N daily; the SDK syncs the new list, replacing whichever regions dropped |
| Cost guardrail | Per-user geofence count and per-user sync cadence are config knobs so Foursquare billing scales linearly with active users |

**What it does not need:**

- No new TrueSpend lookup tables (`merchant_id` tagging is enough)
- No new outbox event types (handler still publishes `messaging.notification.created`)
- No mobile UI change — the user never sees the watch-list; arrivals "just start working" for their frequented places
- No change to the permission model — same `authorized_always` requirement

**Migration:** purely additive. The Phase 1 chain-name handler stays, and the new tag-based handler is a sibling branch in the same webhook endpoint — picked by whether the Foursquare event has a `geofence.tag` set.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| `messaging.notification.created` from Foursquare handler | Per-user inbox cache + unread count |
| `messaging.notification_preferences.updated` (`best_card_alert` off) | Future arrivals skip notification insert at the handler gate |
| `finance.user_card.created/updated/deleted` | User reward profile (also re-evaluated on next arrival) |
| Catalog sync | Reward rules used by next arrival recommendation |

## Loading And Error States

- Foursquare signature mismatch: return `400`, no DB write.
- Dedup hit on `foursquare_event_id`: return `WebhookAckResponse { received:true, deduplicated:true }`.
- User has no active cards: skip recommendation + notification, still ack `200`.
- Gate fails (master off, type off, quiet hours): skip notification insert, ack `200`.
- Merchant cannot be resolved from Foursquare payload: log `finance.location_events` only, skip notification, ack `200`.
- Push delivery failure: handled by existing `PushFanOutConsumer` retry path.

## Permission States

The location permission reported to `POST /api/v1/permissions` uses `lookup.permission_states` codes ([db-design-extended.md](../low-level-design/DB/db-design-extended.md#permission_states)), surfaced to mobile via `GET /api/v1/lookups/permission-states`. Geo-arrival behavior per code:

| `permission_states.code` | Platform meaning | Geo-arrival behavior |
|---|---|---|
| `not_determined` | OS prompt not shown yet | No Foursquare tracking; prompt during onboarding 2.4 or first-arrival nudge |
| `denied` | User declined | Disable Foursquare; hide geo-arrival in 7.3 |
| `restricted` | OS/admin blocks location (e.g. parental control, MDM) | Same as `denied` |
| `authorized_when_in_use` | Foreground location only | Foreground recommendations still work; geo-arrival push **disabled** (Foursquare background needs Always) |
| `authorized_always` | Background location | **Required** for geo-arrival push; Foursquare SDK runs in background |
| `authorized_once` | iOS one-shot session grant | Treated as `authorized_when_in_use` until next prompt |
| `provisional` / `limited` / `authorized` | Notification-only / Android coarse / generic granted | Treated case-by-case; geo-arrival requires effective background access |

Onboarding 2.4 ([02-onboarding.md](02-onboarding.md)) requests `authorized_when_in_use` for Phase 1 foreground; the upgrade to `authorized_always` is prompted later from 7.3 with a value-prop explainer the first time the user enables the `best_card_alert` type, since "Always" acceptance is materially higher when paired with the feature it unlocks.

## Design Gaps

| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Pending | Privacy Disclosure | Workflow | Foursquare receives anonymized geofence pings; no current mention in [13-privacy-data.md](13-privacy-data.md) or marketing privacy copy | Cover in the new privacy policy doc being added at end of workflow review | Compliance + user trust |
