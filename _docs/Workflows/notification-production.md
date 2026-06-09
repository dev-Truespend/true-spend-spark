# Notification Production

> **MVP execution note** — Every producer (`MissedRewardNotificationBusiness`, `UnusualTransactionNotificationBusiness`, `WeeklySummaryNotificationBusiness`, `NotificationsProductionBusiness`, `PlaidReauthNotificationBusiness`, `PlaidNewAccountsNotificationBusiness`, `AdminNotificationDispatchBusiness`) calls `INotificationsDispatchBusiness.DispatchPushAsync` and `INotificationInboxCacheInvalidatorBusiness.InvalidateAsync` **inline post-commit**, in place of the archived `NotificationCreated` outbox event. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Progress

| User story | Status | Notes |
|---|---|---|
| Producer-side gating (master + per-type + quiet hours) before inbox insert | Done | `NotificationGateService` returns `NotificationGate.ShouldProduce()`; applied in MissedReward/PlaidReauth/PlaidNewAccounts/Reminders/WeeklySummary/UnusualTransaction |
| MissedReward producer triggers off `finance.missed_reward_event.created` | Done | `MissedRewardEventCreatedHandler` calls `MissedRewardNotificationBusiness.ProduceForMissedRewardEventAsync`; emitted by `TransactionsInsertBusiness`/`TransactionsUpdateBusiness`/`PlaidUpdateBusiness` |
| `honors_quiet_hours` flag on notification_types so system/plaid_reauth can bypass | Done | Column added; seed flips `system` to `false` |
| WeeklySummaryProducer (cron Sun 09:00 user TZ) | Done | `WeeklySummaryJob` + `WeeklySummaryScheduler` run hourly; converts to user TZ; idempotent via ISO week key |
| UnusualTransactionProducer with static Phase 1 thresholds | Done | `UnusualTransactionJob` scans last `UnusualTransactionLookback` for transactions ≥ `UnusualTransactionThresholdAmount` |
| SubscriptionExpiryProducer (cron daily 09:00 UTC, 2-day + 1-day reminders for trial/plan expiry) | Done | `SubscriptionExpiryNotificationJob` + `SubscriptionExpiryNotificationScheduler`; `SubscriptionExpiryNotificationBusiness` reads `GetExpiringSubscriptionsAsync`, dedups one-per-UTC-day; covers trial_end + cancel_at_period_end |
| ReminderFiringJob honours per-type preference | Done | Now uses `NotificationGateService.GetGateAsync` per reminder before insert. **Audit fix (2026-06-04):** reminder push payload now inherits the source notification's payload type (missed_rewards / best_card_alert / unusual_transaction / weekly_summary / system) instead of always emitting a `system` payload — `NotificationsProductionBusiness.BuildReminderPayload` clones the source `Payload` JSON, swaps `notificationId` to the new reminder id, and tags `reminder:true` + `sourceNotificationId`. New `INotificationProductionService.GetSourceNotificationsAsync` returns `SourceNotificationInfo(SourceNotificationId, NotificationTypeId, NotificationTypeCode, Payload)`. |
| Email channel dispatch via Resend | Done | `NotificationsDispatchBusiness` invokes `IEmailDeliveryService` when `email_enabled = true`; `ResendEmailDeliveryService` is the real impl, `EmailDeliveryPlaceholderService` is the fallback |

## Scope

Producers that create `messaging.notifications` rows and the fan-out path that delivers them via APNs / FCM / email. The consumer side (inbox, settings, read state) is owned by `07-notifications.md`.

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can receive custom table-driven notifications | 7.1, 7.3 | Driven by `messaging.notification_types` |
| Full | User can receive push notifications on iOS | 7.3 | APNs path |
| Full | User can receive push notifications on Android | 7.3 | FCM path |
| Full | User can set a future reminder from notification detail | 7.2 | Reminder firing job |

## Producer Catalog

| Producer | Trigger | `notification_types.code` | Push Payload | Recipient |
|---|---|---|---|---|
| `MissedRewardNotificationProducer` | Event `finance.missed_reward_event.created` | `missed_rewards` | `MissedRewardsPushPayload` | Owner of the transaction |
| `BestCardAlertProducer` | (a) Phase 1 in-app: handled inline by recommendation endpoints — no push. (b) Phase 1 geo-arrival push: produced inline by `POST /api/v1/webhooks/foursquare` when Foursquare fires `user.entered_geofence` / `user.entered_place`. See [10-geo-recommendations.md](10-geo-recommendations.md). | `best_card_alert` | `BestCardAlertPushPayload` | Owner of the user record matched from Foursquare `externalId` |
| `WeeklySummaryProducer` | Cron — Sunday 09:00 in `app.user_preferences.timezone` | `weekly_summary` | `WeeklySummaryPushPayload` | Active users with the type enabled |
| `UnusualTransactionProducer` | Cron sweep — scans `finance.transactions` created within `NotificationsConstants.UnusualTransactionLookback` whose `amount >= UnusualTransactionThresholdAmount` | `unusual_transaction` | `UnusualTransactionPushPayload` | Owner |
| `SubscriptionExpiryNotificationProducer` | Cron daily 09:00 UTC — `GetExpiringSubscriptionsAsync` finds trials (`trialing`, `trial_end`) and cancel-at-period-end plans (`active`, `cancel_at_period_end`) expiring within 2 days; fires at the 2-day and 1-day marks | `subscription_expiry` | `SubscriptionExpiryPushPayload` (`kind` ∈ {`trial`,`plan`}, `daysBefore` ∈ {2,1}, `expiresAt`) | Subscription owner. Idempotent: one expiry notification per user per UTC day via `HasNotificationOfTypeSinceAsync` |
| `PlaidReauthNotificationProducer` | Event `finance.plaid_item.status_changed` to `login_required` | `system` (subtype `plaid_reauth`) | `SystemPushPayload` with `subtype = 'plaid_reauth'` | Owner of the item |
| `ReminderFiringJob` | Cron sweep — `messaging.notification_reminders.remind_at <= now() and is_fired = false` | inherited from `source_notification_id` or `system` | Inherits the source notification's payload type | Owner |

All payload shapes are defined in [api-design-extended.md § Push Payloads](../low-level-design/Service/api-design-extended.md#push-payloads).

## Primary Flow

```text
Source change occurs
  Producer checks gates (master_enabled, per-type pref, quiet hours)
  Producer inserts messaging.notifications
  Producer inserts messaging.event_outbox (messaging.notification.created) in same tx

PushFanOutConsumer claims messaging.notification.created
  For each active messaging.devices row for user_id:
    Call APNs (ios) or FCM (android)
    Insert messaging.notification_deliveries with channel='push' + status
  If notification_preferences.email_enabled and the type has email channel:
    Send via Resend
    Insert messaging.notification_deliveries with channel='email'

InboxCacheInvalidator claims same event
  Invalidate per-user inbox cache + unread count
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Produce notification | Internal producer | `messaging.notifications` row | Async Job | Reads `messaging.notification_preferences`, `messaging.notification_type_preferences`; writes `messaging.notifications`, `messaging.event_outbox` | `messaging.notifications`, `messaging.event_outbox` | Invalidation enqueued via outbox |
| Fan out to devices | `PushFanOutConsumer` | Provider-specific (APNs/FCM/Resend) | Async Job | Consumes `messaging.notification.created` | Read `messaging.devices`, `messaging.notification_preferences`; write `messaging.notification_deliveries` | None |
| Fire reminder | `ReminderFiringJob` cron | None | Async Job | Produces `messaging.notification.created` | Update `messaging.notification_reminders.is_fired`; write `messaging.notifications`, `messaging.event_outbox` | Invalidate via outbox |
| Invalidate inbox | `InboxCacheInvalidator` | None | Async Job | Consumes `messaging.notification.created` | None | Drop per-user inbox cache |

## Gating Rules

Producer must skip insert (and not enqueue an event) when any of the following are false for the recipient:

1. `messaging.notification_preferences.master_enabled = true`.
2. `messaging.notification_type_preferences (user_id, notification_type_id).is_enabled = true`, or absent (defaults to `notification_types.default_enabled`).
3. Current time is outside `quiet_hours_start..quiet_hours_end` in user's timezone — applies only to non-critical types (security/`plaid_reauth` ignore quiet hours; see design gap).

`PushFanOutConsumer` separately checks `notification_preferences.push_enabled` before APNs/FCM and `email_enabled` before Resend.

## Tables Involved

| Role | Tables |
|---|---|
| Notification records | `messaging.notifications`, `messaging.notification_types` |
| Preferences gate | `messaging.notification_preferences`, `messaging.notification_type_preferences` |
| Fan-out | `messaging.devices`, `messaging.notification_deliveries`, `lookup.notification_channels`, `lookup.delivery_statuses` |
| Reminders | `messaging.notification_reminders` |
| Source data | `finance.transactions`, `finance.missed_reward_events`, `finance.plaid_items`, `finance.recommendations` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions`, `lookup.event_outbox_statuses`, `lookup.event_delivery_statuses` |

## Cache Strategy

- Inbox cache invalidation happens via outbox (`messaging.notification.created` -> `InboxCacheInvalidator`).
- Push tokens are not cached; always read live from `messaging.devices`.
- Preference checks happen inside the producer transaction; no separate cache.

## Sync vs Async Decisions

- All production is async (consumers off the outbox or cron triggers).
- Producers must respect master/per-type toggles + quiet hours before inserting.
- Delivery (APNs/FCM/email) retries per `event_subscriptions.retry_backoff_seconds`, dead-letters after `max_retries`.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| `messaging.notification.created` | Per-user inbox cache + unread count |
| `messaging.notification.read` (from `07-notifications.md`) | Inbox cache filters |
| `messaging.notification_preferences.updated` | Producer eligibility (effective on next produce attempt) |

## Loading And Error States

- Gate check fails: noop, no row inserted, no event published, no error logged beyond debug.
- Push delivery failure: `messaging.notification_deliveries` row with `status='failed'` and `error_code`. APNs `Unregistered` -> set `messaging.devices.is_active = false`.
- Email delivery failure: same pattern with `channel='email'`.
- Reminder firing failure: keep `is_fired = false`; cron retries next sweep.
- Outbox dead-letter on `messaging.notification.created`: notification row exists but inbox cache may be stale until manual refresh; investigate via `messaging.event_deliveries`.

## Design Gaps

| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Open | Contract Shape Issue | API | No admin endpoint to inspect outbox / DLQ | Add `GET /api/v1/admin/events/outbox` + `POST /api/v1/admin/events/{id}/retry` (admin auth) | Ops visibility for stuck events |
