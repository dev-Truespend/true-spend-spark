# Job Architecture

This guide covers scheduled and background worker services. These jobs are not HTTP endpoints and should not be exposed through the mobile API.

## Hosting Model

All background work runs as **.NET Worker Service** containers in **Azure Container Apps**, alongside the API container. The same hosting model covers two trigger types:

| Trigger type | Source | Examples |
|---|---|---|
| Scheduled (cron) | In-process scheduler library | `RewardsCcCardProductSyncJob`, `PlaidTransactionSyncJob`, `SubscriptionExpiryNotificationJob`, `ReminderFiringJob`, `AdminNotificationDispatchJob`, `InvalidDeviceTokenCleanupJob`, `AccountDeletionPurgeJob`, outbox dispatcher |
| Queue-triggered | Azure Service Bus listener inside the same worker | `AIInsightGenerationJob`, event-driven consumers from `messaging.event_outbox` |

A single long-running worker process handles both — there is no separate Windows Service, VM, or per-job container in Phase 1. Container Apps health probes, auto-restart, and rolling deploys cover availability.

### Scheduler library — TBD

The cron/scheduler library is **not locked in yet**. Hangfire is the current leading candidate because it stores state in Postgres (already in the stack via Supabase), ships a dashboard, and has retries built in — but alternatives will be evaluated before commit:

| Candidate | Notes |
|---|---|
| **Hangfire** (current lead) | Postgres-backed state, web dashboard, retry attributes, mature OSS |
| Quartz.NET | Lower-level, very flexible cron, less batteries-included |
| Coravel | Lightweight, fluent API, in-memory by default (less persistence) |
| Native `IHostedService` + `PeriodicTimer` | Zero deps; we write retries/persistence ourselves |
| Azure Container Apps Jobs | Per-job containers; no library needed but more deploy surfaces |

Decision deferred until a short spike compares Hangfire and Quartz.NET footprints inside Azure Container Apps. Until then, treat the worker codebase as scheduler-agnostic — jobs implement a thin interface so swapping libraries doesn't touch business logic.

### Worker process layout (current plan)

```text
TrueSpend.Worker (1 container, runs 24/7 in Azure Container Apps)
├── Scheduler component (library TBD)
│   ├── Catalog jobs            (RewardsCcIssuerSyncJob, RewardsCcCardProductSyncJob,
│   │                            RewardsCcRewardRuleSyncJob, RewardsCcCatalogReconcileJob,
│   │                            CardCatalogMappingReviewJob, PlaidInstitutionCatalogJob)
│   ├── Plaid sync              (PlaidTransactionSyncJob)
│   ├── Notification producers  (ReminderFiringJob, AdminNotificationDispatchJob,
│   │                            SubscriptionExpiryNotificationJob; UnusualTransactionJob disabled in MVP)
│   ├── Hygiene                 (InvalidDeviceTokenCleanupJob, AccountDeletionPurgeJob)
│   └── Outbox dispatcher       (publishes messaging.event_outbox → Service Bus topics)
├── Service Bus listener
│   ├── AIInsightGenerationJob  (queue-triggered)
│   └── Event consumers         (AnalyticsRecomputeConsumer, EntitlementCacheInvalidator,
│                                PushFanOutConsumer, ...)
└── /health endpoint            (Container Apps probes)
```

If telemetry later shows a noisy job (catalog refresh that bursts CPU, AI insight runs that monopolize the worker), it can be split into its own container — the worker code stays the same, only deployment manifests change.

## Manual Trigger (worker HTTP)

The worker is hosted as a `WebApplication` (not a bare `Host`) so it can expose a small HTTP surface alongside the schedulers. This is how a job is run on demand without waiting for its cron tick.

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness probe for Container Apps |
| `/jobs` | GET | List manually-triggerable job names |
| `/jobs/{name}/run` | POST | Run one job once, in its own DI scope |

- Job names match the `WorkerConfig` section keys (e.g. `PlaidTransactionSync`, `AccountDeletionPurge`); mapping lives in `JobRegistry`.
- A manual run executes **regardless of the job's `Enabled` flag or cron** — this is the intended way to exercise jobs that ship disabled (all jobs are `Enabled: false` in Development).
- **No auth.** Intended for local/Postman and internal ops only. Bind to an internal port; never expose on a public ingress.
- Local port is set via `Urls` in `appsettings.Development.json` (default `http://localhost:5080`). Example: `POST http://localhost:5080/jobs/PlaidTransactionSync/run`.
- Unlike the scheduler path, the manual trigger does not take the distributed lock — don't fire a manual run while the same job's cron tick may be active.

## Job Standards

Execution model:

- Jobs run from a .NET Worker Service, scheduler, queue worker, or hosted background service.
- Jobs use internal service credentials, not user JWTs.
- Jobs must be idempotent.
- Jobs must write run history, counts, failures, and correlation ids.
- Jobs should support dry-run mode for production validation.
- Jobs should support incremental sync when the provider exposes cursors or timestamps.
- Jobs should be configured through app settings, environment variables, scheduler metadata, or queue messages.
- Jobs should not require `/internal/jobs/...` routes on the **mobile API**. The worker hosts its own manual-trigger surface (see [Manual Trigger](#manual-trigger-worker-http)) for local/ops use — never on a public ingress.

Common worker context:

```json
{
  "jobRunId": "uuid",
  "trigger": "scheduled",
  "dryRun": false,
  "correlationId": "uuid"
}
```

Common worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "startedAt": "2026-05-26T02:00:00Z",
  "finishedAt": "2026-05-26T02:04:12Z",
  "processed": 1200,
  "created": 42,
  "updated": 1158,
  "deleted": 0,
  "failed": 0,
  "warnings": []
}
```

## RewardsCcIssuerSyncJob

Purpose: nightly incremental sync of credit card issuers from RewardsCC into `catalog.card_issuers`.

Schedule: nightly 02:00. Must run before `RewardsCcCardProductSyncJob` because card products carry an `issuer_id` foreign key.

Responsibilities:

- Pull active issuers from RewardsCC.
- Normalize issuer names (e.g. "Chase Bank, N.A." → "Chase").
- Insert new issuers; update changed display names / logos.
- Mark issuers inactive when no longer returned by the provider.

External calls: RewardsCC issuers endpoint (abstracted behind `IRewardsCcProvider`).

Worker configuration:

```json
{
  "jobName": "RewardsCcIssuerSyncJob",
  "enabled": true,
  "schedule": "0 2 * * *",
  "mode": "incremental",
  "batchSize": 200,
  "dryRun": false,
  "maxRetries": 3
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "provider": "rewardsCc",
  "processed": 240,
  "issuersCreated": 4,
  "issuersUpdated": 230,
  "issuersDeactivated": 1,
  "failed": 0
}
```

## RewardsCcCardProductSyncJob

Purpose: nightly incremental sync of credit card products from RewardsCC into `catalog.card_products`.

Schedule: nightly 02:30. Runs after `RewardsCcIssuerSyncJob`; must run before `RewardsCcRewardRuleSyncJob`.

Responsibilities:

- Pull active card products from RewardsCC.
- Resolve `issuer_id` from `catalog.card_issuers` by provider issuer id or normalized name.
- Normalize product name, network, annual fee, image URL.
- Insert new products; update changed metadata.
- Flag low-confidence issuer matches for `CardCatalogMappingReviewJob`.
- **Seed vs full mode** (`RewardsCcCatalogSyncBusiness.SyncSeededCardsAsync`): `RewardsCc:Seed` configured → seed mode (`SearchCardByNameAsync` → `GetCardDetailAsync` per configured card). Seed empty → full mode (`IRewardsCcProvider.ListAllCardsAsync` → `GetCardDetailAsync` per card). No separate mode flag; seed presence selects the path.

External calls: RewardsCC card products endpoint.

Worker configuration:

```json
{
  "jobName": "RewardsCcCardProductSyncJob",
  "enabled": true,
  "schedule": "30 2 * * *",
  "mode": "incremental",
  "batchSize": 200,
  "dryRun": false,
  "maxRetries": 3
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "provider": "rewardsCc",
  "processed": 1240,
  "productsCreated": 12,
  "productsUpdated": 1228,
  "productsDeactivated": 0,
  "mappingReviewRequired": 3,
  "failed": 0
}
```

## RewardsCcRewardRuleSyncJob

Purpose: nightly incremental sync of reward rules (multipliers, caps, categories, exclusions, effective dates) from RewardsCC into `catalog.reward_rules`.

Schedule: nightly 03:00. Runs after `RewardsCcCardProductSyncJob`.

Responsibilities:

- Pull each card's current reward rules from RewardsCC.
- Resolve `card_product_id` from `catalog.card_products`.
- Normalize category to `catalog.categories.code` (use `catalog.category_aliases` for fallback matching).
- Insert new rules; update changed multipliers / caps.
- Expire rules whose `effective_to` has passed or are no longer returned.
- Preserve historical rules referenced by past `finance.transaction_reward_results` and `finance.missed_reward_events`.

External calls: RewardsCC reward rules endpoint.

Worker configuration:

```json
{
  "jobName": "RewardsCcRewardRuleSyncJob",
  "enabled": true,
  "schedule": "0 3 * * *",
  "mode": "incremental",
  "batchSize": 100,
  "dryRun": false,
  "maxRetries": 3
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "provider": "rewardsCc",
  "processed": 5800,
  "rewardRulesCreated": 87,
  "rewardRulesUpdated": 5640,
  "rewardRulesExpired": 73,
  "categoryMatchFallbacks": 14,
  "failed": 0
}
```

## RewardsCcCatalogReconcileJob

> **Disabled in MVP (Phase 1).** Code, scheduler, and config retained but `Enabled = false`. For MVP the single nightly `RewardsCcCatalogSyncOrchestrationJob` is the only rewards-catalog job; the weekly full reconcile is deferred. Re-enable by flipping the flag. Still manually triggerable via `/jobs/RewardsCcCatalogReconcile/run`.

Purpose: weekly full reconciliation of issuers, card products, and reward rules. Dry-run by default — produces a diff report rather than writing.

Schedule: weekly Sunday 04:00.

Responsibilities:

- Pull the full RewardsCC catalog for issuers, card products, and reward rules.
- Compare against internal tables; produce a diff summary (`wouldCreate`, `wouldUpdate`, `wouldExpire`).
- When `dryRun = false`, apply the diff in the same order as the nightly trio (issuers → products → rules).
- Surface unresolved provider IDs and low-confidence mappings for `CardCatalogMappingReviewJob`.

Worker configuration:

```json
{
  "jobName": "RewardsCcCatalogReconcileJob",
  "enabled": true,
  "schedule": "0 4 * * 0",
  "includeInactiveCards": true,
  "dryRun": true,
  "batchSize": 200
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "completed_with_warnings",
  "provider": "rewardsCc",
  "processed": 7280,
  "wouldCreate": { "issuers": 1, "products": 8, "rewardRules": 35 },
  "wouldUpdate": { "issuers": 240, "products": 1228, "rewardRules": 5640 },
  "wouldExpire": { "rewardRules": 73 },
  "mappingReviewRequired": 11,
  "warnings": [
    {
      "code": "LOW_CONFIDENCE_PRODUCT_MATCH",
      "providerCardId": "rcc-card-123",
      "message": "Provider card matched multiple internal products."
    }
  ]
}
```

## Catalog Data Imported

The catalog jobs import catalog-level data only, never user credential or PII data.

Card product:

```json
{
  "provider": "rewardsCc",
  "providerCardId": "rcc-card-123",
  "issuerName": "Chase",
  "productName": "Freedom Flex",
  "network": "Mastercard",
  "annualFee": 0,
  "currency": "USD",
  "sourceUrl": "https://provider-card-detail-url",
  "lastSeenAt": "2026-05-26T02:00:00Z"
}
```

Reward rule:

```json
{
  "providerCardId": "rcc-card-123",
  "category": "grocery",
  "rewardType": "points",
  "multiplier": 5,
  "capAmount": 1500,
  "capPeriod": "quarterly",
  "exclusions": ["warehouse_clubs"],
  "effectiveFrom": "2026-04-01",
  "effectiveTo": "2026-06-30",
  "confidence": 0.92
}
```

Terms summary:

```json
{
  "providerCardId": "rcc-card-123",
  "termsVersion": "2026-05-01",
  "summary": "5x on rotating quarterly categories, 3x dining, 1x other purchases.",
  "requiresActivation": true,
  "lastReviewedAt": "2026-05-26T02:00:00Z"
}
```

## Downstream Consumers

The imported catalog powers:

- `CardCatalogController` issuer and product search.
- `CardsController` default reward assumptions for manual cards.
- `RecommendationsController` best-card calculations.
- Reward result computation in `TransactionsInsertBusiness` / `TransactionsUpdateBusiness`.
- Missed-reward detection in `MissedRewardNotificationProducer`.
- Admin review screens for low-confidence provider mappings.

## PlaidInstitutionCatalogJob

> **Disabled in MVP (Phase 1).** Code, scheduler, and config retained but `Enabled = false`. MVP uses Plaid Link's built-in institution picker, so the custom bank catalog/dropdown isn't needed. Re-enable if a custom bank picker returns. Still manually triggerable via `/jobs/PlaidInstitutionCatalog/run`.

Purpose: refresh the bank/institution catalog used by the Plaid onboarding common-banks grid and search-as-you-type on screen 2.2.

Schedule: nightly by default; twice weekly is acceptable if provider limits require it.

Responsibilities:

- Pull supported Plaid institutions and their display metadata.
- Store institution name, Plaid institution id, country, OAuth support, supported products, logo, and health / status metadata when available.
- Normalize bank names for search.
- Mark institutions inactive when they are no longer returned by Plaid.
- Keep user-facing Plaid onboarding search fast by serving dropdown results from internal tables instead of hitting Plaid per request.

External calls:

Provider: Plaid.

Expected provider calls:

```http
POST /institutions/get
POST /institutions/search
```

Worker configuration:

```json
{
  "jobName": "PlaidInstitutionCatalogJob",
  "enabled": true,
  "schedule": "0 1 * * *",
  "countryCodes": ["US"],
  "products": ["transactions"],
  "batchSize": 500,
  "dryRun": false,
  "maxRetries": 3
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "provider": "plaid",
  "processed": 12000,
  "institutionsCreated": 140,
  "institutionsUpdated": 11860,
  "institutionsMarkedInactive": 22,
  "failed": 0
}
```

Downstream consumers:

- `PlaidController` bank search dropdown.
- Plaid onboarding common-bank list on screen 2.2.
- Admin provider-health review.

## PlaidTransactionSyncJob

Purpose: incrementally sync linked-card transactions from Plaid for every active `finance.plaid_items` connection, upsert them into `finance.transactions`, and compute reward / missed-reward results inline.

Schedule: cron daily 04:00 (`0 4 * * *`). Also triggered out-of-band by `POST /api/v1/webhooks/plaid` on `TRANSACTIONS / SYNC_UPDATES_AVAILABLE`. **Basic/Pro users only** — free users are skipped (Plaid linking is a Basic+ entitlement).

Responsibilities:

- Read active Plaid connections from `finance.plaid_items` (joined to `app.profiles` for user email).
- For each connection, call Plaid `/transactions/sync` using the stored `transaction_sync_cursor`. Per-connection error isolation — failures are logged and the loop continues to the next connection.
- Upsert `added` rows by `plaid_transaction_id` into `finance.transactions`; merge `modified` rows preserving user-edited app fields (card override, category override, location label); apply `removed` rows by soft-delete.
- Resolve `transactions.category_id` from the Plaid leaf via `catalog.transaction_category_bridge` (see [category-bridge.md](../../Workflows/category-bridge.md)). Unbridged leaf → base reward rate, and flag the `(plaid_leaf, subcategory_group)` pair for `CardCatalogMappingReviewJob`. Merchant-locked reward rules contribute only when `merchant_name` matches the rule's brand alias set; otherwise base rate.
- Compute reward result via `TransactionRewardCalculator`; upsert `finance.transaction_reward_results` and `finance.missed_reward_events` per affected row.
- Advance `finance.plaid_items.transaction_sync_cursor` and `last_transaction_sync_at` in the same transaction as the upserts.
- Publish per-row outbox events: `finance.transaction.created` for `added`, `finance.transaction.updated` for `modified`, `finance.transaction.deleted` for `removed`. Downstream `AnalyticsRecomputeConsumer` + `MissedRewardNotificationProducer` fan out from there.
- Idempotent: re-running with the same cursor returns no new rows; row-level idempotency key is the Plaid `transaction_id`.

External calls:

Provider: Plaid.

Expected provider calls:

```http
POST /transactions/sync
```

Worker configuration:

```json
{
  "jobName": "PlaidTransactionSyncJob",
  "enabled": true,
  "schedule": "0 5 * * *",
  "perConnectionTimeoutSeconds": 60,
  "maxRetries": 3,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "provider": "plaid",
  "connectionsProcessed": 124,
  "connectionsFailed": 2,
  "transactionsAdded": 318,
  "transactionsUpdated": 47,
  "transactionsRemoved": 4,
  "rewardResultsComputed": 365,
  "missedRewardEventsCreated": 22
}
```

Downstream consumers:

- `AnalyticsRecomputeConsumer` — refreshes `insights.analytics_snapshots`.
- `MissedRewardNotificationProducer` — produces `messaging.notifications` for new missed-reward events.

### Category Bridge Population (gap)

`catalog.transaction_category_bridge` maps the closed 120-row Plaid PFC taxonomy → RewardsCC `subcategory_group`. Both sides are known before prod (Plaid pre-seeded; RewardsCC catalog pre-synced), so bridge rows are **pre-built, never computed at runtime**. `PlaidTransactionSyncJob` only does a deterministic lookup. No AI.

| Aspect | State |
|---|---|
| Plaid side | All 120 codes seeded in `finance.transaction_categories`. Complete. |
| RewardsCC side | Full `subcategory_group` vocabulary not yet available — only 5 strings confirmed from a sample payload (`All Dining`, `Grocery`, `All Gas Stations`, `Hotel`, `All Online Shopping`). |
| Bridge seed now | 7 rows sealed against the 5 confirmed strings. ~12 rewardable Plaid leaves stubbed (Plaid code pre-filled, `subcategory_group` pending). |
| Completion (pre-prod, one-time) | After `RewardsCcRewardRuleSyncJob` loads the full catalog, run `SELECT DISTINCT subcategory_group FROM catalog.categories`, then hand-fill the stub rows. Deterministic — no AI, no runtime discovery. |
| Runtime fallback | Unbridged leaf → base rate + flag `(plaid_leaf, subcategory_group)` for `CardCatalogMappingReviewJob`. Append one bridge row per confirmed gap. |

Ordering dependency: full RewardsCC catalog sync → bridge completion → accurate Plaid reward calc. Until the bridge is completed, transactions on stubbed leaves earn at base rate (under-credit, never a wrong bonus or phantom missed reward).

## Failure Handling

Retry policy:

- Retry transient provider errors with exponential backoff.
- Do not retry validation or mapping errors automatically.
- Stop the job if provider auth fails.
- Continue with warnings when individual cards fail but the provider remains healthy.

Failure response:

```json
{
  "jobRunId": "uuid",
  "status": "failed",
  "provider": "rewardsCc",
  "processed": 120,
  "failed": 1,
  "error": {
    "code": "PROVIDER_AUTH_FAILED",
    "message": "RewardsCC provider credentials were rejected."
  }
}
```

## CardCatalogMappingReviewJob

Trigger: automatically after the RewardsCC catalog trio completes, or manually from an admin-only operations screen.

Purpose: rebuild mapping confidence and queue ambiguous cards for manual admin review. Also queues unbridged Plaid leaves flagged by `PlaidTransactionSyncJob` so an admin can append the missing `catalog.transaction_category_bridge` row.

Worker configuration:

```json
{
  "jobName": "CardCatalogMappingReviewJob",
  "enabled": true,
  "provider": "rewardsCc",
  "minConfidence": 0.85,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "reviewItemsCreated": 9,
  "autoResolved": 32
}
```

## ReminderFiringJob

> **Disabled in MVP (Phase 1).** Code, scheduler, and config retained but `Enabled = false`; depends on a "Remind me later" snooze UI that isn't in the MVP. Re-enable by flipping the flag. Still manually triggerable via `/jobs/ReminderFiring/run`.

Purpose: fire user-set notification reminders at their `remind_at` time, delivering each as a push notification + inbox row. Source notifications for screen 7.2 ("Remind me later" action) end up here.

Schedule: cron sweep every 60 seconds (default `ReminderIntervalSeconds = 60`).

Responsibilities:

- Read due rows from `messaging.notification_reminders` where `remind_at <= now()` and `is_fired = false`.
- Resolve the source notification info (`SourceNotificationInfo: source_notification_id, notification_type_id, notification_type_code, payload`) in one batched lookup so the reminder push inherits the source's payload type — the mobile router can deep-link the reminder tap back into the same detail flow (missed reward, best card alert, etc.). Falls back to `system` (`subtype = "reminder"`) when there's no source.
- For each due reminder:
  - Check the gate via `NotificationGateService.GetGateAsync(userId, inheritedTypeId, now)` — master + per-type + quiet hours.
  - In one DB transaction: insert `messaging.notifications` (`title`, `body` from reminder), call `UpdateNotificationPayloadAsync` with the inherited typed payload (`notificationId` set, `reminder: true`, `sourceNotificationId` carried over), enqueue `messaging.notification.created` to `messaging.event_outbox` with idempotency key `reminder.fired.{reminderId}`, then `MarkReminderFiredAsync(reminderId, now)`.
- Idempotent: replays see `is_fired = true` and skip; the outbox idempotency key blocks duplicate fan-out.

External calls: none — delivery happens downstream via `PushFanOutConsumer`.

Worker configuration:

```json
{
  "jobName": "ReminderFiringJob",
  "enabled": true,
  "intervalSeconds": 60,
  "maxRetries": 3,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "remindersScanned": 18,
  "remindersFired": 14,
  "remindersGatedOut": 3,
  "failed": 1
}
```

Downstream consumers:

- `PushFanOutConsumer` — delivers via APNs / FCM.
- `InboxCacheInvalidator` — drops the per-user inbox cache.

## WeeklySummaryJob

> **Disabled in MVP (Phase 1).** Code, scheduler, and config retained but `Enabled = false`; the weekly engagement summary isn't needed in MVP. Re-enable by flipping the flag. Still manually triggerable via `/jobs/WeeklySummary/run`.

Purpose: weekly rewards-summary push. Runs hourly and only fires for users whose local time is Sunday 09:00 in that tick (timezone-aware), with an ISO-week idempotency key so each user gets exactly one per week. Writes the inbox row and dispatches push inline.

## UnusualTransactionJob

> **Disabled in MVP (Phase 1).** Code, scheduler, and config are retained but `Enabled = false` in all environments. Re-enable by flipping the flag. Still manually triggerable via `/jobs/UnusualTransaction/run`.

Purpose: detect and notify on transactions that landed in the last 15 minutes with `amount >= $500`. Phase 1 uses static thresholds; per-user baselines are a later refinement.

Schedule: cron sweep every 5 minutes (default `UnusualTransactionIntervalSeconds = 300`).

Responsibilities:

- Resolve the `unusual_transaction` notification type id; skip if not seeded.
- Read candidate transactions from `finance.transactions` created within `NotificationsConstants.UnusualTransactionLookback` (15 min) whose `amount >= NotificationsConstants.UnusualTransactionThresholdAmount` ($500).
- Cache the gate decision per user across candidates in the same run (one user with five large transactions still only triggers one gate check).
- For each candidate that passes the gate:
  - In one transaction: insert `messaging.notifications` (title `"Unusually large purchase detected"`, body formatted with the en-US currency), tag with `related_transaction_id`, set typed `UnusualTransactionPushPayload` via `PushPayloadBuilder.UnusualTransaction(notificationId, transactionId)`, enqueue `messaging.notification.created` with idempotency key `unusual_transaction.{transactionId}`.
- Idempotent per transaction — the unique idempotency key blocks duplicate notifications across overlapping sweeps.

External calls: none.

Worker configuration:

```json
{
  "jobName": "UnusualTransactionJob",
  "enabled": true,
  "intervalSeconds": 300,
  "thresholdAmount": 500.00,
  "lookbackMinutes": 15,
  "maxRetries": 3,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "candidatesScanned": 42,
  "notificationsProduced": 31,
  "gatedOut": 8,
  "duplicates": 3
}
```

Threshold tuning: when product wants per-user baselines (e.g. "unusual" means 3× rolling 30-day median per category) the calculator goes inside the business class, not the job. The job stays a thin scheduler tick.

Downstream consumers:

- `PushFanOutConsumer`, `InboxCacheInvalidator`.

## AdminNotificationDispatchJob

Purpose: generic engine for admin-, system-, and marketing-driven notification campaigns. Replaces what would otherwise be one ad-hoc job per use case (announcements, scheduled alerts, plan-change broadcasts, ops messages).

Schedule: cron daily 09:00 (`0 9 * * *`). A campaign's `scheduled_for` fires on the next 09:00 sweep, not within minutes — acceptable for MVP campaign volume.

Responsibilities:

- Read due rows from `messaging.admin_notification_campaigns` where `scheduled_for <= now()` and `status = 'queued'`.
- Resolve the campaign audience selector to a batch of user IDs.
- For each user, write a `messaging.notifications` row using the campaign's `notification_type_id`, `title_template`, and `body_template` (with simple `{{handlebars}}` token substitution from campaign `template_data`).
- Insert a `messaging.event_outbox` row with `event_type = messaging.notification.created` per user. Existing `PushFanOutConsumer` and `InboxCacheInvalidator` handle delivery and cache invalidation — no parallel pipeline.
- Honor the standard producer gates: `master_enabled`, per-type preference, quiet hours per [notification-production.md § Gating Rules](../../Workflows/notification-production.md#gating-rules). Campaigns can opt out of quiet hours by selecting a notification type with `honors_quiet_hours = false` (e.g. `system`).
- Process at most `maxNotificationsPerRun` per invocation; persist `audience_cursor` on the campaign row so a large audience resumes on the next sweep.
- Mark the campaign `succeeded` when the audience is exhausted, `partially_failed` on per-user errors, `dead_lettered` after `max_retries`.

Audience selectors (Phase 1):

- `all_active_users`
- `plan_code` — e.g. all Basic users
- `entitlement_flag` — e.g. all users where `aiInsightsEnabled = true`
- `explicit_user_ids` — fixed list

Worker configuration:

```json
{
  "jobName": "AdminNotificationDispatchJob",
  "enabled": true,
  "schedule": "*/5 * * * *",
  "maxNotificationsPerRun": 5000,
  "respectQuietHours": true,
  "maxRetries": 3,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "campaignsProcessed": 3,
  "notificationsCreated": 4860,
  "gatedOut": 140,
  "deferred": 0,
  "failed": 0
}
```

Required schema addition: `messaging.admin_notification_campaigns` (id, notification_type_id, title_template, body_template, template_data jsonb, audience_selector jsonb, scheduled_for, status, audience_cursor, idempotency_key, created_by, created_at, updated_at). Add to [db-design-extended.md § messaging](../DB/db-design-extended.md) before implementation.

## AIInsightGenerationJob

Purpose: generate personalized reward-optimization insights for a user via Azure OpenAI when the user requests them from screen 6.3.

Schedule: cron nightly 01:00 (`0 1 * * *`), staggered after the 00:00 catalog sync. MVP generates a batch for **all eligible Basic/Pro users**, not just user-requested runs — the async queue trigger is archived with the rest of the messaging path. Eligibility (`GetNightlyGenerationCandidatesAsync`) = active/trialing Basic or Pro subscription **and** personalized AI insights enabled in privacy settings; the per-user `ai_insights_enabled` entitlement is re-checked (non-throwing) before each run is created, so non-entitled users are skipped without a failed run.

> The nightly batch no longer drains user-requested `insights.insight_generation_runs` (the on-demand "generate" path). `ProcessPendingRunsAsync` still exists and is manually triggerable, but the scheduled job calls `GenerateForAllEligibleUsersAsync`. Revisit if on-demand generation stays in the MVP UI.

Responsibilities:

- Claim a queued `insights.insight_generation_runs` row and set `status = 'running'`, `started_at`.
- Re-check the gate: skip and mark `skipped` if `privacy.settings.personalized_ai_insights_enabled = false` or `entitlements.aiInsightsEnabled = false` for the user at run time.
- Read the user's recent transactions, reward results, missed-reward events, cards, and analytics snapshot inputs needed by the prompt.
- Call Azure OpenAI with the configured deployment and `prompt_version`; record `model_name`, `input_token_count`, `output_token_count`, `cost_estimate`.
- Write one row per generated insight into `insights.ai_insights` linked to the run, with `insight_type_id`, `priority_id`, `title`, `body`.
- Mark the run `succeeded` (or `failed` with `error_message`) and set `completed_at`.
- Publish `insights.ai_generation.completed` to `messaging.event_outbox` in the same transaction so the AI-insights cache is invalidated.

External calls:

Provider: Azure OpenAI.

Expected provider calls:

```http
POST {azureOpenAiEndpoint}/openai/deployments/{deploymentName}/chat/completions
```

Worker configuration:

```json
{
  "jobName": "AIInsightGenerationJob",
  "enabled": true,
  "trigger": "queue",
  "queueSource": "insights.insight_generation_runs",
  "deploymentName": "gpt-4o-mini",
  "promptVersion": "2026-05-01",
  "maxConcurrency": 8,
  "perUserCooldownMinutes": 60,
  "maxRetries": 2,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "generationRunId": 18421,
  "status": "succeeded",
  "userId": "uuid",
  "insightsCreated": 4,
  "inputTokens": 2480,
  "outputTokens": 612,
  "costEstimate": 0.0091,
  "failed": 0
}
```

Downstream consumers:

- `AIInsightsCacheInvalidator` consumes `insights.ai_generation.completed` and invalidates the per-user AI insights cache.
- `GET /api/v1/ai-insights` reads the newly written `insights.ai_insights` rows after invalidation.

## InvalidDeviceTokenCleanupJob

Purpose: deactivate APNs / FCM tokens that providers have marked invalid, so `PushFanOutConsumer` stops wasting calls on dead devices and `messaging.devices` stays clean.

Schedule: cron daily 04:00.

Responsibilities:

- Read `messaging.notification_deliveries` rows from the last `lookbackHours` where `channel = 'push'` and `status = 'failed'` with `error_code IN ('Unregistered', 'BadDeviceToken', 'InvalidRegistration', 'NotRegistered', 'MismatchSenderId')`.
- For each affected `device_id`, set `messaging.devices.is_active = false` and `deactivated_at = now()`.
- Log per-platform counts.

External calls: none — the providers already returned the error inline during the original push; this job acts on the persisted result.

Worker configuration:

```json
{
  "jobName": "InvalidDeviceTokenCleanupJob",
  "enabled": true,
  "schedule": "0 4 * * *",
  "lookbackHours": 48,
  "dryRun": false,
  "maxRetries": 3
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "deliveriesScanned": 1820,
  "devicesDeactivated": { "ios": 12, "android": 9 },
  "failed": 0
}
```

## AccountDeletionPurgeJob

Purpose: hard-delete user data for accounts past the deletion grace window. The Privacy & Data screen (`POST /api/v1/account-deletion`) only *schedules* deletion; the actual purge runs here, after the grace window (target **14 days**), with no UI session in the loop. The purge cascade must remove all user-owned rows across `finance.*`, `messaging.*`, `insights.*`, `app.*`, `security.*`, `privacy.*` (except the audit trail) **and** the Supabase `auth.users` row so a fresh signup is possible. See [14-privacy-data.md](../../Workflows/14-privacy-data.md).

Schedule: cron daily 03:00 (`0 3 * * *`).

> **Open gap — grace window source.** The purge job only *reads* `privacy.account_deletion_requests.purge_after`; it does not compute the window. `purge_after` is set when the deletion request is *created*, and that creation path is not currently implemented in the .NET API and has no SQL default in [privacy.sql](../../../supabase/migrations/privacy.sql). Making the window **14 days and configurable** must be done wherever the request gets created (a Privacy controller/business in `truespend.api`, or a Supabase function) — not in the worker, which would have no effect. Resolve before relying on the 14-day target.

Responsibilities:

- Read `privacy.account_deletion_requests` rows where `status = 'pending'` and `purge_after <= now()`.
- For each row, run the cascade in a single transaction:
  - Hard delete user-owned rows from `finance.*`, `messaging.*`, `insights.*`, `app.*`, `security.*`, and `privacy.*` (excluding the audit trail).
  - Delete the Supabase `auth.users` row via the service-role admin API.
  - Set `privacy.account_deletion_requests.status = 'completed'` and write a final `privacy.audit_events` row with the purge result.
- Honor cancellation: if the row flipped to `cancelled` between sweep and processing, skip.
- Publish `privacy.account_deletion.completed` to `messaging.event_outbox` for downstream audit consumers.
- Idempotent: a re-run sees `status = 'completed'` and skips.

External calls: Supabase Admin API for the auth user deletion.

Worker configuration:

```json
{
  "jobName": "AccountDeletionPurgeJob",
  "enabled": true,
  "schedule": "0 3 * * *",
  "batchSize": 50,
  "dryRun": false,
  "maxRetries": 1
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "purgesProcessed": 7,
  "purgesSkippedCancelled": 1,
  "failed": 0
}
```

Downstream consumers:

- Audit consumer subscribed to `privacy.account_deletion.completed` for compliance logging.

## Job List

Phase 1 (MVP). Cron is the Production schedule; in Development every job ships `Enabled: false` and is run by hand via the manual trigger. Disabled jobs keep their code and stay manually triggerable.

| Job | When (cron) | MVP status | Purpose | External calls |
|---|---|---|---|---|
| `RewardsCcCatalogSyncOrchestrationJob` | 12:00am `0 0 * * *` | On | One pass: fetch the card list, then per card its details + reward rules, then mapping review | RewardsCC catalog APIs |
| `AIInsightGenerationJob` | 1:00am `0 1 * * *` | On | Generate AI reward insights for **all eligible Basic/Pro users** via Azure OpenAI | Azure OpenAI |
| `AccountDeletionPurgeJob` | 3:00am `0 3 * * *` | On | Hard-purge accounts past the grace window (target **14 days**); deletes user data + Supabase auth user | Supabase Admin API |
| `PlaidTransactionSyncJob` | 4:00am `0 4 * * *` | On | Sync linked-card transactions for **Basic/Pro users only**; compute reward + missed-reward results | Plaid `/transactions/sync` |
| `InvalidDeviceTokenCleanupJob` | 4:00am `0 4 * * *` | On | Deactivate APNs / FCM tokens flagged invalid by providers | None |
| `SubscriptionExpiryNotificationJob` | 9:00am `0 9 * * *` | On | Warn 2/1 days before a trial or cancel-at-period-end plan expires; writes the inbox row **and** dispatches push/email inline | None |
| `AdminNotificationDispatchJob` | 9:00am `0 9 * * *` | On | Generic engine for admin / system / marketing campaigns | Push/email (inline dispatch) |
| `CardCatalogMappingReviewJob` | runs within rewards sync | chained | Queue low-confidence card mappings for admin review | None |
| `ReminderFiringJob` | `* * * * *` | **Off** | Fire user "remind me later" snoozes — no snooze UI in MVP | None |
| `WeeklySummaryJob` | `0 * * * *` | **Off** | Weekly Sunday rewards summary push — not needed in MVP | None |
| `UnusualTransactionJob` | `*/5 * * * *` | **Off** | Detect/notify on high-amount transactions — not needed in MVP | None |
| `PlaidInstitutionCatalogJob` | `0 1 * * *` | **Off** | Bank catalog for a custom picker — replaced by Plaid Link's built-in picker | Plaid institutions APIs |
| `RewardsCcCatalogReconcileJob` | `0 4 * * 0` | **Off** | Weekly full reconciliation — folded into the single nightly sync for MVP | RewardsCC catalog APIs |

> The three RewardsCC catalog sections below (`RewardsCcIssuerSyncJob`, `RewardsCcCardProductSyncJob`, `RewardsCcRewardRuleSyncJob`) document the **sub-steps** the single `RewardsCcCatalogSyncOrchestrationJob` runs in order at 00:00. They are not separately scheduled jobs.

Phase 2:

| Job | Cadence | Purpose | External calls |
|---|---:|---|---|
| `DataExportJob` | Queue-triggered | Backs `POST /api/v1/data-export`: build per-user data bundle, upload to Storage, return signed URL | Supabase Storage |
| `LocationHistoryClearJob` | Queue-triggered | Promoted from inline API delete when telemetry shows long deletes | None |
| `OcrQueueJob` | Queue-triggered | Process receipt OCR queue | OCR provider |
