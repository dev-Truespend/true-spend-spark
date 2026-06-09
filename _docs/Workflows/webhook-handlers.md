# Webhook Handlers

> **MVP execution note** — Stripe and Plaid webhook handlers run their downstream side-effects (entitlement cache invalidation, payment-method cache invalidation, Plaid reauth notification + cards cache invalidation, Plaid new-accounts notification, geofence best-card notification dispatch) **inline post-commit** in place of the archived outbox events. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Progress

| User story | Status | Notes |
|---|---|---|
| Outbox polling consumer dispatches outbox rows to in-process handlers | Done | `OutboxPollingConsumer` fans out queued events to per-consumer deliveries via `OutboxDispatchBusiness` |
| Stripe webhook reflects entitlement changes after processing | Done | Route aligned to `/api/v1/webhooks/stripe`; `invoice.paid` re-uses subscription upsert path. **Audit fix (2026-06-04):** `StripeWebhookBusiness` now catches `23505` unique-violation on `billing.stripe_webhook_events.stripe_event_id` and acks `{received:true, deduplicated:true}` instead of throwing a 500 to Stripe when two concurrent webhooks race past the existence pre-check (same fix Foursquare already had). **Audit fix #2 (2026-06-04):** `StripeWebhooksController` was returning the raw `StripeWebhookResult { persisted, alreadyProcessed }` envelope on the wire, mismatching the documented `WebhookAckResponse { received, deduplicated }` contract used by Plaid + Foursquare. Added `IBillingMapper.ToWebhookAck(StripeWebhookResult)` and switched controller to `Respond(response, billingMapper.ToWebhookAck)` for parity. |
| Plaid webhook flips item status + emits domain events | Done | `PlaidWebhooksController` + `PlaidWebhookBusiness` write `finance.plaid_webhook_events`, update `finance.plaid_items.status_id`, publish `finance.plaid_item.status_changed` / `finance.plaid_item.new_accounts_available`. **Audit fix (2026-06-04):** webhook business now catches the dedup unique-violation race (parity with Stripe + Foursquare); `PlaidSignatureFilter` was only checking the JWS payload's `request_body_sha256` claim — it never verified the JWS signature against any key, so a forged header passed. Now resolves the EC P-256 JWK via `IPlaidWebhookKeyProvider` (real impl hits Plaid `/webhook_verification_key/get` with 24h `IMemoryCache`, placeholder fails closed), verifies ES256 over `header.payload`, then checks `iat` skew + body hash. |
| Plaid re-auth produces a system notification | Done | `PlaidReauthNotificationBusiness` triggered on `login_required` flips via `PlaidReauthNotificationHandler` |
| Plaid new-accounts produces a notification | Done | `PlaidNewAccountsNotificationBusiness` triggered by `finance.plaid_item.new_accounts_available` |
| Plaid status change invalidates cards cache | Done | `CardsCacheInvalidatorBusiness` triggered by `finance.plaid_item.status_changed` |
| Foursquare webhook branches by event type | Done | `user.entered_geofence`/`user.entered_place` → arrival path; `user.exited_geofence` → location log only |

## Scope

Inbound webhook endpoints for Stripe and Plaid. Each handler verifies provider signature, deduplicates against its provider-specific event log, updates local DB, then publishes a domain event to `messaging.event_outbox` for in-app fan-out. All downstream side effects (cache invalidation, notification production, mobile push) run as async consumers off the outbox.

## Endpoints Covered

| Provider | Endpoint | Idempotency Table |
|---|---|---|
| Stripe | `POST /api/v1/webhooks/stripe` | `billing.stripe_webhook_events` |
| Plaid | `POST /api/v1/webhooks/plaid` | `finance.plaid_webhook_events` |
| Foursquare | `POST /api/v1/webhooks/foursquare` | `finance.foursquare_webhook_events` |
| Foursquare exits | `POST /api/v1/webhooks/foursquare` (`user.exited_geofence`) | `finance.foursquare_webhook_events` — logs `finance.location_events` (`geofence_exited`), no notification |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can see entitlement changes reflected in the app shortly after Stripe webhook processing | 8.3, 5.1 | Stripe -> outbox -> entitlement invalidation |
| Full | User can reconnect a bank when Plaid requires re-authentication | 5.4, 8.5 | Plaid `ITEM_LOGIN_REQUIRED` -> push + status flip |

## Preconditions

- Stripe and Plaid project secrets configured server-side.
- `messaging.event_subscriptions` rows exist for each consumed `event_type`.

## Primary API Sequence

```text
Stripe
  POST /api/v1/webhooks/stripe
    Verify Stripe-Signature; reject 400 on mismatch
    Insert billing.stripe_webhook_events (unique on stripe_event_id) -> if conflict return deduplicated:true
    Update billing.subscriptions / payment_methods / stripe_customers per event.type
    Insert messaging.event_outbox in same tx (event_type per mapping below)
    Return WebhookAckResponse

Plaid
  POST /api/v1/webhooks/plaid
    Verify Plaid-Verification JWT; reject 400 on mismatch
    Insert finance.plaid_webhook_events (unique on plaid_event_id) -> if conflict return deduplicated:true
    Update finance.plaid_items.status_id / last_error per webhook_code
    Insert messaging.event_outbox in same tx
    Return WebhookAckResponse
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Stripe webhook receive | `POST /api/v1/webhooks/stripe` | raw Stripe event -> `WebhookAckResponse` | Webhook Driven | Publishes `billing.subscription.updated`, `billing.payment_method.updated`, `billing.invoice.paid` | Write `billing.stripe_webhook_events`, `billing.subscriptions`, `billing.payment_methods`, `billing.stripe_customers`, `messaging.event_outbox` | None at handler |
| Plaid webhook receive | `POST /api/v1/webhooks/plaid` | raw Plaid webhook -> `WebhookAckResponse` | Webhook Driven | Publishes `finance.plaid_item.status_changed` (incl. `login_required`), `finance.plaid_item.new_accounts_available` | Write `finance.plaid_webhook_events`, `finance.plaid_items`, `messaging.event_outbox` | None at handler |
| Foursquare webhook receive | `POST /api/v1/webhooks/foursquare` | raw Foursquare event -> `WebhookAckResponse` | Webhook Driven | Resolves merchant + generates recommendation inline, writes `messaging.notifications`, publishes `messaging.notification.created` | Write `finance.foursquare_webhook_events`, `finance.location_events`, `finance.recommendations`, `messaging.notifications`, `messaging.event_outbox` | None at handler |

## Stripe Event Mapping

| Stripe `event.type` | DB write | Outbox `event_type` |
|---|---|---|
| `customer.subscription.created` | upsert `billing.subscriptions` | `billing.subscription.updated` |
| `customer.subscription.updated` | upsert `billing.subscriptions` | `billing.subscription.updated` |
| `customer.subscription.deleted` | mark `billing.subscriptions.status` cancelled | `billing.subscription.updated` |
| `invoice.paid` | upsert period boundaries on `billing.subscriptions` | `billing.subscription.updated` |
| `payment_method.attached` / `.detached` / `.updated` | upsert `billing.payment_methods` | `billing.payment_method.updated` |
| `checkout.session.completed` | upsert `billing.stripe_customers` if needed | none (subscription event arrives separately) |

## Plaid Webhook Mapping

| `webhook_type` / `webhook_code` | DB write | Outbox `event_type` |
|---|---|---|
| `ITEM` / `ITEM_LOGIN_REQUIRED` | set `plaid_items.status_id = login_required` | `finance.plaid_item.status_changed` |
| `ITEM` / `PENDING_EXPIRATION` | set `plaid_items.status_id = login_required` (preemptive) | `finance.plaid_item.status_changed` |
| `ITEM` / `ERROR` | set `plaid_items.status_id = error`, `last_error` | `finance.plaid_item.status_changed` |
| `ITEM` / `NEW_ACCOUNTS_AVAILABLE` | no item state change | `finance.plaid_item.new_accounts_available` |
| `ITEM` / `USER_PERMISSION_REVOKED` | set `plaid_items.status_id = disconnected` | `finance.plaid_item.status_changed` |

## Foursquare Webhook Mapping

| Foursquare `event` | Handler action | Outbox `event_type` |
|---|---|---|
| `user.entered_geofence` | Resolve `finance.merchants` from geofence `tag`/`externalId`, generate recommendation (context `geofence_arrival`), insert `messaging.notifications` (type `best_card_alert`), log `finance.location_events` (`geofence_entered`) | `messaging.notification.created` |
| `user.entered_place` | Same as above when the place matches a known merchant; ignored otherwise | `messaging.notification.created` (when matched) |
| `user.exited_geofence` | No notification; optional `finance.location_events` row | none |

Gates: skip the notification when the user's `messaging.notification_preferences.master_enabled = false`, their `best_card_alert` type preference is off, or quiet hours apply — same rules as [notification-production.md § Gating Rules](notification-production.md#gating-rules).

## Consumers Triggered

| Event Type | Consumer | Effect |
|---|---|---|
| `billing.subscription.updated` | `EntitlementCacheInvalidator` | Invalidate per-user entitlement server cache + mobile push refresh hint |
| `billing.payment_method.updated` | `BillingPaymentMethodCacheInvalidator` | Invalidate payment methods cache |
| `finance.plaid_item.status_changed` | `PlaidReauthNotificationProducer` | Insert `messaging.notifications` (type `system`, subtype `plaid_reauth`) when status flips to `login_required`. Push payload: `SystemPushPayload` with `plaidItemId` ([api-design-extended.md](../low-level-design/Service/api-design-extended.md#push-payloads)). |
| `finance.plaid_item.status_changed` | `CardsCacheInvalidator` | Invalidate cards/connections cache for affected user |
| `finance.plaid_item.new_accounts_available` | `PlaidNewAccountsNotificationProducer` | Optional notification prompting user to re-link |

## Tables Involved

| Role | Tables |
|---|---|
| Provider idempotency | `billing.stripe_webhook_events`, `finance.plaid_webhook_events`, `finance.foursquare_webhook_events` |
| State updates | `billing.subscriptions`, `billing.payment_methods`, `billing.stripe_customers`, `finance.plaid_items`, `finance.merchants`, `finance.recommendations`, `finance.location_events`, `messaging.notifications` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions` |
| Lookups | `lookup.subscription_statuses`, `lookup.payment_method_types`, `lookup.plaid_item_statuses`, `lookup.recommendation_contexts`, `lookup.location_event_types`, `lookup.event_outbox_statuses` |

## Cache Strategy

- Handlers never read from cache; source-of-truth DB write only.
- Cache invalidation happens via outbox consumers, not inline, to keep the handler fast and ack the provider quickly.

## Sync vs Async Decisions

- DB write + outbox row insert is transactional and synchronous so the `200` ack returns quickly.
- All side effects (cache invalidation, notifications, push fan-out) run as async consumers.

## Invalidation Triggers

Driven entirely by the consumers table above; the handler itself invalidates nothing inline.

## Loading And Error States

- Signature verification failure: return `400` with no DB write.
- Idempotency collision: return `WebhookAckResponse { received: true, deduplicated: true }` with no further side effects.
- DB transaction failure: return `5xx`; provider retries per its own policy.

## Design Gaps

None currently open.
