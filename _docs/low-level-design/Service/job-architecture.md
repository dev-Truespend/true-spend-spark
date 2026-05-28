# Job Architecture

This guide covers scheduled and background worker services. These jobs are not HTTP endpoints and should not be exposed through the mobile API.

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

## CreditKarmaCardCatalogJob

Purpose: refresh the card catalog and reward metadata used by recommendations and manual-card dropdowns.

Schedule: nightly by default; weekly is acceptable if provider limits, contract terms, or reward-change frequency make nightly unnecessary.

Recommended cadence:

- Nightly at low traffic time for reward/category refresh.
- Weekly full reconciliation.
- Manual admin-triggered run after catalog schema or provider mapping changes.

Important note: Credit Karma should be treated as a partner/private integration unless a documented public API contract exists. Do not build the product around client-side scraping or unofficial endpoints.

### Responsibilities

- Pull available credit card products from the provider.
- Pull each card's current reward categories, multipliers, caps, exclusions, and effective dates.
- Normalize issuer names, product names, card networks, reward units, and categories.
- Match provider cards to existing internal catalog records.
- Create new catalog records for newly discovered cards.
- Update changed reward rules.
- Expire reward rules that are no longer active.
- Preserve historical reward rules for old recommendations and missed-reward calculations.
- Flag low-confidence mappings for admin review.

### External Calls

Provider: Credit Karma partner/private API, if available.

Expected provider calls:

```http
GET /cards
GET /cards/{providerCardId}
GET /cards/{providerCardId}/rewards
GET /cards/{providerCardId}/terms
```

If the actual partner API differs, keep the internal job contract stable and adapt only the provider client.

### Worker Configuration

```json
{
  "jobName": "CreditKarmaCardCatalogJob",
  "enabled": true,
  "schedule": "0 2 * * *",
  "mode": "incremental",
  "provider": "creditKarma",
  "lookbackHours": 48,
  "dryRun": false,
  "batchSize": 100,
  "maxRetries": 3
}
```

### Worker Result

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "provider": "creditKarma",
  "mode": "incremental",
  "processed": 420,
  "cardsCreated": 8,
  "cardsUpdated": 97,
  "rewardRulesCreated": 64,
  "rewardRulesUpdated": 213,
  "rewardRulesExpired": 12,
  "mappingReviewRequired": 5,
  "failed": 0
}
```

### Full Reconciliation Worker Configuration

```json
{
  "jobName": "CreditKarmaCardCatalogReconcileJob",
  "enabled": true,
  "schedule": "0 3 * * 0",
  "provider": "creditKarma",
  "includeInactiveCards": true,
  "dryRun": true,
  "batchSize": 100
}
```

### Full Reconciliation Result

```json
{
  "jobRunId": "uuid",
  "status": "completed_with_warnings",
  "provider": "creditKarma",
  "processed": 2400,
  "wouldCreate": 12,
  "wouldUpdate": 318,
  "wouldExpire": 44,
  "mappingReviewRequired": 9,
  "warnings": [
    {
      "code": "LOW_CONFIDENCE_CARD_MATCH",
      "providerCardId": "ck-card-123",
      "message": "Provider card matched multiple internal products."
    }
  ]
}
```

## Data Imported

The job should import catalog-level data, not user credential data.

Card product:

```json
{
  "provider": "creditKarma",
  "providerCardId": "ck-card-123",
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
  "providerCardId": "ck-card-123",
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
  "providerCardId": "ck-card-123",
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
- `RewardsController` reward estimates and missed rewards.
- Admin review screens for low-confidence provider mappings.

## PlaidInstitutionCatalogJob

Purpose: refresh the bank/institution catalog used by the Plaid onboarding dropdown.

Schedule: nightly by default; twice weekly is acceptable if provider limits require it.

Responsibilities:

- Pull supported Plaid institutions and their display metadata.
- Store institution name, Plaid institution id, country, OAuth support, supported products, logo, and health/status metadata when available.
- Normalize bank names for search.
- Mark institutions inactive when they are no longer returned by Plaid.
- Keep user-facing Plaid onboarding search fast by serving dropdown results from internal tables.

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
- Plaid onboarding common-bank list.
- Admin provider-health review.

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
  "provider": "creditKarma",
  "processed": 120,
  "failed": 1,
  "error": {
    "code": "PROVIDER_AUTH_FAILED",
    "message": "Credit Karma provider credentials were rejected."
  }
}
```

## Admin Review Jobs

### CardCatalogMappingReviewJob

Trigger: automatically after catalog sync, or manually from an admin-only operations screen.

Purpose: rebuild mapping confidence and queue ambiguous cards for manual admin review.

Worker configuration:

```json
{
  "jobName": "CardCatalogMappingReviewJob",
  "enabled": true,
  "provider": "creditKarma",
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

## CustomNotificationDispatchJob

Purpose: send queued custom notifications from internal notification tables.

Schedule: twice daily.

Recommended cadence:

- Morning batch, for example `0 9 * * *`.
- Evening batch, for example `0 18 * * *`.
- Alternate notification groups between batches to avoid sending every custom notification at once.

Responsibilities:

- Read pending custom notifications from internal tables.
- Select the active batch window.
- Alternate notification segments, categories, or campaigns between morning and evening sends.
- Respect user notification preferences and quiet hours.
- Send push and email through the configured provider.
- Mark notifications as sent, skipped, failed, or deferred.
- Avoid duplicate sends through idempotency keys.

Worker configuration:

```json
{
  "jobName": "CustomNotificationDispatchJob",
  "enabled": true,
  "schedules": ["0 9 * * *", "0 18 * * *"],
  "batchMode": "alternating",
  "maxNotificationsPerRun": 5000,
  "channels": ["push", "email"],
  "respectQuietHours": true,
  "dryRun": false
}
```

Worker result:

```json
{
  "jobRunId": "uuid",
  "status": "succeeded",
  "batchName": "morning",
  "processed": 1800,
  "sent": 1604,
  "deferred": 130,
  "skipped": 52,
  "failed": 14
}
```

## Job List

| Job | Cadence | Purpose | External calls |
|---|---:|---|---|
| `CreditKarmaCardCatalogJob` | Nightly | Incremental card and reward catalog refresh | Credit Karma partner/private API |
| `CreditKarmaCardCatalogReconcileJob` | Weekly | Full provider-to-internal catalog reconciliation | Credit Karma partner/private API |
| `CardCatalogMappingReviewJob` | After catalog sync | Queue low-confidence card/reward mappings for admin review | None |
| `PlaidInstitutionCatalogJob` | Nightly | Refresh bank/institution dropdown data for Plaid onboarding | Plaid institutions APIs |
| `PlaidTransactionSyncJob` | Webhook + scheduled fallback | Sync linked user transactions | Plaid `/transactions/sync` |
| `CustomNotificationDispatchJob` | Twice daily | Send custom table-driven notifications in alternating batches | FCM/APNS/email provider |
| `NotificationDispatchJob` | Continuous/queued | Send realtime/system push/email notifications | FCM/APNS/email provider |
| `AccountPurgeJob` | Daily | Purge accounts scheduled for deletion | None |
| `OcrQueueJob` | Phase 2 | Process receipt OCR queue | OCR provider |
