# 12. Cross-Cutting Cold-Start And Infrastructure

> **MVP execution note** — The `truespend.eventconsumer` container is not deployed in the MVP. Side-effects run inline post-commit in producer business classes. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Progress

| User story | Status | Notes |
|---|---|---|
| User can receive push notifications on iOS | Done | Pre-existing device upsert + push channel from workflow 07 |
| User can receive push notifications on Android | Done | Pre-existing device upsert + push channel from workflow 07 |
| User can recover from missing permissions | Done | Pre-existing permission report from workflows 02 and 08 |
| User can navigate from a notification to the related transaction | Done | `ExpoPushDeliveryService.FlattenPayload` now expands the producer's JSON payload onto Expo's `data` map so the mobile router reads top-level keys; `PushPayloadBuilder` (`Models/Notifications/PushPayloadBuilder.cs`) emits typed payloads per the discriminated-union spec; `FoursquareWebhookBusiness` (best_card_alert), `MissedRewardNotificationBusiness` (missed_rewards), and `NotificationsProductionBusiness` (reminders → system) all backfill `notificationId` via `UpdateNotificationPayloadAsync` after insert. **Audit fix (2026-06-04):** `OutboxPollingConsumer` was a stub — now polls `messaging.event_outbox` + `event_deliveries` via `OutboxDispatchBusiness`/`OutboxDispatchService`; `EventDispatcher` routes by `(event_type, consumer_name)`; `messaging_event_subscriptions.sql` seeded with all consumer subscriptions including `EntitlementCacheInvalidator`, `PushFanOutConsumer`, etc. **Audit fix #2 (2026-06-04):** `OutboxDispatchService.MarkEventNoSubscribersAsync` was marking outbox rows with no consumers (e.g. `app.profile.updated`, `finance.plaid_connection.synced`, `finance.user_card.updated`) as `EventStatusFailed`, polluting the failure metric; now marks them `EventStatusSucceeded`. `Program.cs` registers `CorrelationIdMiddleware` + `ExceptionMiddleware`. Plaid event handlers (`PlaidReauthNotificationHandler`, `PlaidNewAccountsNotificationHandler`, `PlaidCardsCacheInvalidatorHandler`, `PlaidConnectionDisconnectedHandler`) now route through `PlaidEventMapper` per the handler-mapper rule. Duplicated `IsUniqueViolation` helpers across 6 business classes consolidated into `Services/Persistence/PostgresErrors`. Dead `AuthMiddleware` removed. |
| User can stay signed in across app restarts | Done | Pre-existing bootstrap from workflow 01. **Audit fix (2026-06-04):** `AuthBootstrapService` now upserts `messaging.devices` instead of inserting a new row every cold start. |

## Scope

Phase 1 behaviors that aren't owned by a single screen: bootstrap hydration after a valid session, device upsert, OS-permission state reporting, entitlement refresh, lookup warm-up, push deep-link routing, and network-reconnect-triggered sync.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 1.1 | Splash | Bootstrap runs here after `01-auth-session.md` restores the session |
| any | All authenticated screens | These calls run on cold start and app foreground |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can receive push notifications on iOS | 7.3 | Requires `messaging.devices` row |
| Full | User can receive push notifications on Android | 7.3 | Requires `messaging.devices` row |
| Full | User can recover from missing permissions | 2.4 | Permission state report keeps server in sync |
| Full | User can navigate from a notification to the related transaction | 7.2, 6.2 | Push deep-link routing |
| Full | User can stay signed in across app restarts | 1.1 | Bootstrap runs once session is valid |

## Preconditions

- Valid Supabase session restored by `01-auth-session.md`.
- App has read OS-side permission states and (if granted) the push token before calling these endpoints.

## Primary API Sequence

```text
Cold start (after session restore)
  POST /api/v1/auth/bootstrap     includes device metadata when available
  POST /api/v1/devices            upsert push token + app/os/locale/timezone if changed
  POST /api/v1/permissions        latest OS-reported states
  GET  /api/v1/entitlements
  GET  /api/v1/lookups/bundle     all reference data in one call (proposed)

App foreground
  POST /api/v1/permissions        only if OS state changed
  GET  /api/v1/entitlements       only if cache stale

Network reconnect
  Trigger sync flow (see 11-sync-status.md)

Push tap
  Parse payload -> route to target screen
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Upsert device | `POST /api/v1/devices` or auth bootstrap device payload | `RegisterDeviceRequest` -> `DeviceResponse` | Sync API | None | Upsert `messaging.devices`; read `lookup.device_platforms` | Persist `deviceId` locally; no broader cache |
| Report permissions | `POST /api/v1/permissions` | `UpdatePermissionsRequest`: `deviceId`, platform states, raw platform payload -> `PermissionsResponse` | Sync API | None | Upsert `app.user_device_permissions`; update `app.user_permissions`; read `lookup.permission_states` | Replace mobile permission cache |
| Refresh entitlements | `GET /api/v1/entitlements` | `EntitlementsResponse` | Sync API | Consumed by `EntitlementCacheInvalidator` on `billing.subscription.updated` | Read `billing.subscriptions`, `billing.plan_features`, `billing.features` | Server entitlement cache per user (short TTL); mobile cache |
| Warm lookups | `GET /api/v1/lookups/bundle` (proposed) or per-table `GET /api/v1/lookups/*` | `LookupsBundleResponse` (proposed) / `LookupsResponse` per table | Sync API | None | Read `lookup.*` | Server cache long TTL; mobile persistent cache; bust on version bump |
| Route push tap | Client only; may follow with `GET` for target | Push payload schema (below) | Client navigation | None | None | None |
| Reconnect-driven sync | See `11-sync-status.md` | `SyncStatusResponse`, `SyncPullResponse`, `SyncPushResponse` | Sync API + Event | `sync.push_completed`, `sync.pull_completed` | `sync.*` tables | Per `11-sync-status.md` |

## Contracts Used

- `RegisterDeviceRequest`, `DeviceResponse` (also used by `02-onboarding.md`, `07-notifications.md`)
- `UpdatePermissionsRequest`, `PermissionsResponse` (also `02-onboarding.md`, `08-profile-preferences.md`)
- `EntitlementsResponse` (also `04-cards.md`, `08-profile-preferences.md`, `09-billing-entitlements.md`)
- `LookupsResponse` (all areas)

Push payloads are now defined per type as a discriminated union — `BasePushPayloadVm` + 5 type-specific schemas (`MissedRewardsPushPayload`, `BestCardAlertPushPayload`, `WeeklySummaryPushPayload`, `UnusualTransactionPushPayload`, `SystemPushPayload`). See [api-design-extended.md § Push Payloads](../low-level-design/Service/api-design-extended.md#push-payloads). The discriminator `type` matches `messaging.notification_types.code`.

## Tables Involved

| Role | Tables |
|---|---|
| Device | `messaging.devices`, `lookup.device_platforms` |
| Permissions | `app.user_device_permissions`, `app.user_permissions`, `lookup.permission_states` |
| Entitlements | `billing.subscriptions`, `billing.plans`, `billing.plan_features`, `billing.features` |
| Lookups | all `lookup.*` |

## Cache Strategy

- `messaging.devices`: no client cache beyond the local `deviceId`.
- Permissions: persistent mobile cache; refresh after every report. Device-specific state is stored in `app.user_device_permissions`; `app.user_permissions` is the user-level summary for screens.
- Entitlements: server cache per user, short TTL; invalidated on `billing.subscription.updated`.
- Lookups: persistent mobile + server cache; invalidate on reference-data write (DB first).

## Sync vs Async Decisions

- Device upsert, permission report, and entitlement refresh are synchronous; failures are non-fatal and retry on next foreground.
- Auth bootstrap can create/update the device row before onboarding; later push-token changes still use `POST /api/v1/devices`.
- Lookup warm-up runs in parallel and does not block first-screen render — bind UI to mobile cache, refresh in background.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| OS-side permission change | Re-report; replace mobile permission cache |
| `billing.subscription.updated` (Stripe webhook -> outbox) | Entitlement server + mobile cache |
| Reference-data write (DB first) | Affected lookup cache server + mobile |
| Push tap | None; navigation only |
| Network reconnect | Trigger sync workflow |

## Loading And Error States

- Bootstrap failure: show retryable banner on splash; never strand the user.
- Device upsert failure: non-fatal; retry on next foreground.
- Permission report failure: queue and retry; mobile cache still updates locally.
- Lookup load failure: fall back to last-known cache; surface only if a screen requires a missing lookup.

## Design Gaps

| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Won't fix | Missing API | API | 25+ `GET /api/v1/lookups/*` require many round-trips on cold start | Deferred — HTTP/2 multiplexing + persistent mobile cache + per-table invalidation already make this acceptable. Revisit only if cold-start telemetry shows real latency or partial-load issues. | YAGNI for Phase 1 |
