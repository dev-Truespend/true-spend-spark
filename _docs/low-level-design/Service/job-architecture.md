# Job Architecture

This guide covers scheduled and background worker services. These jobs are not HTTP endpoints and should not be exposed through the mobile API.

## Hosting Model

All background work runs as **.NET Worker Service** containers in **Azure Container Apps**, alongside the API container. The same hosting model covers two trigger types:

| Trigger type | Source | Examples |
|---|---|---|
| Scheduled (cron) | In-process scheduler library | `RewardsCcCardProductSyncJob`, `PlaidTransactionSyncJob`, `WeeklySummaryJob`, `ReminderFiringJob`, `AdminNotificationDispatchJob`, `InvalidDeviceTokenCleanupJob`, `AccountDeletionPurgeJob`, outbox dispatcher |
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
│   ├── Notification producers  (WeeklySummaryJob, ReminderFiringJob, UnusualTransactionJob,
│   │                            AdminNotificationDispatchJob)
│   ├── Hygiene                 (InvalidDeviceTokenCleanupJob, AccountDeletionPurgeJob)
│   └── Outbox dispatcher       (publishes messaging.event_outbox → Service Bus topics)
├── Service Bus listener
│   ├── AIInsightGenerationJob  (queue-triggered)
│   └── Event consumers         (AnalyticsRecomputeConsumer, EntitlementCacheInvalidator,
│                                PushFanOutConsumer, ...)
└── /health endpoint            (Container Apps probes)
```

If telemetry later shows a noisy job (catalog refresh that bursts CPU, AI insight runs that monopolize the worker), it can be split into its own container — the worker code stays the same, only deployment manifests change.

## Job Standards

Execution model:

- Jobs run from a .NET Worker Service, scheduler, queue worker, or hosted background service.
- Jobs use internal service credentials, not user JWTs.
- Jobs must be idempotent.
- Jobs must write run history, counts, failures, and correlation ids.
- Jobs should support dry-run mode for production validation.
- Jobs should support incremental sync when the provider exposes cursors or timestamps.
- Jobs should be configured through app settings, environment variables, scheduler metadata, or queue messages.
- Jobs should not require `/internal/jobs/...` API routes.

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

Schedule: cron daily (default `PlaidTransactionSyncIntervalSeconds = 86400`). Also triggered out-of-band by `POST /api/v1/webhooks/plaid` on `TRANSACTIONS / SYNC_UPDATES_AVAILABLE`.

Responsibilities:

- Read active Plaid connections from `finance.plaid_items` (joined to `app.profiles` for user email).
- For each connection, call Plaid `/transactions/sync` using the stored `transaction_sync_cursor`. Per-connection error isolation — failures are logged and the loop continues to the next connection.
- Upsert `added` rows by `plaid_transaction_id` into `finance.transactions`; merge `modified` rows preserving user-edited app fields (card override, category override, location label); apply `removed` rows by soft-delete.
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

Purpose: rebuild mapping confidence and queue ambiguous cards for manual admin review.

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

Purpose: produce a weekly rewards summary push for users whose local time hits Sunday 09:00 within the current scheduler tick.

Schedule: cron hourly (default `WeeklySummaryIntervalSeconds = 3600`). The job runs every hour but only inserts for users whose timezone-converted `DayOfWeek == Sunday` and `Hour == 9`.

Responsibilities:

- Resolve the `weekly_summary` notification type id; skip the run if the type isn't seeded.
- Read active users + their preferred timezone from `app.profiles` / `app.user_preferences`.
- For each user where `IsFiringHour(now, user.timezone) == true`:
  - Compute ISO week key in user's timezone (`yyyy-Www`); idempotency key `weekly_summary:{userId}:{weekKey}` guarantees one summary per user per ISO week regardless of cron drift, container restarts, or clock skew.
  - Check the gate (master + per-type + quiet hours).
  - In one transaction: insert `messaging.notifications` with type `weekly_summary`, set typed `WeeklySummaryPushPayload` via `PushPayloadBuilder.WeeklySummary(notificationId)`, enqueue `messaging.notification.created` with the idempotency key above.
- Unique-violation on the outbox idempotency key is swallowed (a parallel pod already produced this week's row).

Timezone handling: invalid or unknown IANA timezone strings fall back to UTC silently so a bad value doesn't take down the whole run.

External calls: none.

Worker configuration:

```json
{
  "jobName": "WeeklySummaryJob",
  "enabled": true,
  "intervalSeconds": 3600,
  "fireDay": "Sunday",
  "fireHour": 9,
  "maxRetries": 3,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "usersConsidered": 12480,
  "usersAtFiringHour": 482,
  "summariesProduced": 461,
  "gatedOut": 18,
  "duplicates": 3
}
```

Downstream consumers:

- `PushFanOutConsumer`, `InboxCacheInvalidator`.

## UnusualTransactionJob

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

Schedule: cron every 5 minutes.

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

Schedule: queue-triggered. The job runs per `insights.insight_generation_runs` row created by `POST /api/v1/ai-insights/generate`; there is no cron cadence in Phase 1.

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

Purpose: hard-delete user data for accounts past the deletion grace window. The Privacy & Data screen (`POST /api/v1/account-deletion`) only *schedules* deletion; the actual purge runs here, 30 days later, with no UI session in the loop. See [14-privacy-data.md](../../Workflows/14-privacy-data.md).

Schedule: cron daily 03:00.

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

Phase 1:

| Job | Cadence | Purpose | External calls |
|---|---:|---|---|
| `RewardsCcIssuerSyncJob` | Nightly 02:00 | Sync issuers into `catalog.card_issuers` | RewardsCC issuers API |
| `RewardsCcCardProductSyncJob` | Nightly 02:30 | Sync card products into `catalog.card_products` | RewardsCC card products API |
| `RewardsCcRewardRuleSyncJob` | Nightly 03:00 | Sync reward rules into `catalog.reward_rules` | RewardsCC reward rules API |
| `RewardsCcCatalogReconcileJob` | Weekly Sun 04:00 | Full reconciliation across all three RewardsCC catalogs | RewardsCC full catalog APIs |
| `CardCatalogMappingReviewJob` | After catalog sync | Queue low-confidence mappings for admin review | None |
| `PlaidInstitutionCatalogJob` | Nightly | Refresh bank dropdown / common-banks grid on screen 2.2 | Plaid institutions APIs |
| `PlaidTransactionSyncJob` | Daily + webhook fallback | Sync linked-card transactions per user | Plaid `/transactions/sync` |
| `AIInsightGenerationJob` | Queue-triggered | Generate per-user AI reward insights via Azure OpenAI | Azure OpenAI |
| `WeeklySummaryJob` | Cron Sun 09:00 user TZ | Weekly rewards summary push | None |
| `UnusualTransactionJob` | Cron sweep | Detect and notify on high-amount transactions | None |
| `ReminderFiringJob` | Cron sweep | Fire user-set notification reminders at `remind_at` | None |
| `AdminNotificationDispatchJob` | Cron every 5 min | Generic engine for admin / system / marketing campaigns | FCM / APNs (via existing `PushFanOutConsumer`) |
| `InvalidDeviceTokenCleanupJob` | Daily 04:00 | Deactivate APNs / FCM tokens flagged invalid by providers | None |
| `AccountDeletionPurgeJob` | Daily 03:00 | Hard-purge accounts past the deletion grace window | Supabase Admin API |

Phase 2:

| Job | Cadence | Purpose | External calls |
|---|---:|---|---|
| `DataExportJob` | Queue-triggered | Backs `POST /api/v1/data-export`: build per-user data bundle, upload to Storage, return signed URL | Supabase Storage |
| `LocationHistoryClearJob` | Queue-triggered | Promoted from inline API delete when telemetry shows long deletes | None |
| `OcrQueueJob` | Queue-triggered | Process receipt OCR queue | OCR provider |
