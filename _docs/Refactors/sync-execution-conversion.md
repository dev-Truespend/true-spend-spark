# Sync Execution Conversion

Status: **planning** (not started)
Owner: solo dev
Date opened: 2026-06-05

## Goal

Convert the async event-publish/consume pattern (outbox table + polling consumer + handlers) to **inline post-commit calls** inside the producing business classes. Preserve all existing event-publish code, handlers, dispatcher, and consumer code by **commenting out and archiving** — no file or directory deletions. Same pass bundles removal of manual transaction add/edit/delete from the app.

## Why

- Solo dev, pre-revenue MVP. Outbox + consumer is correct for scale but premature now.
- Cuts one deployable (`truespend.eventconsumer` container) from MVP ops.
- Removes polling lag on user-visible side-effects (push, cache invalidation).
- All event-publish wiring stays in the codebase (archived) so re-enabling async later is a flip, not a rewrite.

## Scope

| In scope | Out of scope |
|---|---|
| Archive every `EnqueueOutboxEventAsync(...)` call site in `truespend.domain/Business/...` and `truespend.workerservice/Jobs/...` | Deleting any file, folder, or DB table |
| Add inline calls to the handler-target businesses (`INotificationsDispatchBusiness`, `IAnalyticsComputeBusiness`, cache invalidators, etc.) | Removing `truespend.eventconsumer` from the .sln or build |
| Comment out the `OutboxPollingConsumer` hosted-service registration | Touching `event_outbox`, `event_deliveries`, `event_subscriptions` schemas |
| Archive `TransactionsController` create/update/delete actions + ViewModels + mappers + validators | Read endpoints, list endpoints, Plaid-driven transaction writes |
| Archive `ui-mobile` screens, routes, hooks, and mutations for manual transaction add/edit/delete | Mobile cards/billing/notifications/recommendations features |
| Update unit tests: archive old `Verify(EnqueueOutboxEventAsync)`, add new `Verify` for inline collaborators | Integration tests |
| Update `mvp-architecture.md`, `api-design-patterns.md`, and affected workflow docs | Pattern docs for DB or mobile |

## Conventions

| Convention | Choice |
|---|---|
| Archive marker (C#) | `#region archive — <reason>` … `#endregion` |
| Archive marker (markdown) | `<!-- region: archive — <reason> -->` … `<!-- endregion -->` |
| Archive placement (C#) | Inside the class's closing brace, after the live methods (Option A) |
| Archive placement (markdown) | At end of file, after live content |
| Archive content | Original code prefixed `// ` per line, plus 1-line header naming origin method and what it published / why it was archived |
| Old enqueue removed from live method body | Yes — code is pulled out of the live path completely, only the archive copy remains |
| Constructor params no longer used (e.g. `messagingInsertService`) | **Keep.** Add inline comment `// archived: kept for future async migration`. Do not touch DI registrations. |
| New collaborators | Add to primary constructor; add DI registrations in `truespend.api/Extensions/...` and `truespend.workerservice/Extensions/...` if missing |
| Side-effect placement | After `unitOfWork.CommitAsync(ct)` succeeds; never inside the txn |
| Side-effect failure policy | Best-effort. Wrap each call in `try/catch (Exception ex) { logger.LogWarning(ex, "..."); }`. Never re-throw to the caller. |
| Multiple subscribers per event | Producer calls each handler-target inline, one `try/catch` per call |
| `INotificationsDispatchBusiness.DispatchPushAsync(notifId)` scope | Despite the name, this method handles **both push and email** in one call (see [NotificationsDispatchBusiness.cs:13-86](../../service/truespend.domain/Business/Notifications/NotificationsDispatchBusiness.cs#L13-L86)): loads prefs, checks master-off + quiet hours, fans out to all active push targets via APNs/FCM, writes one `notification_deliveries` row per device, then sends email via Resend if `pref.EmailEnabled`. Do not add a second inline call for email. |
| Per-user dedupe in batch producers | When a producer writes N rows for the same user in one operation (e.g. Plaid transaction sync), call `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` **once per user** at the end of the batch — not per row. The handler is full-snapshot, so per-row calls multiply work N× without changing the outcome. |

## Delivery

| Item | Value |
|---|---|
| Commits | One big commit for code + tests; one commit for docs (if desired separate) |
| Workflow state | Set [.claude/.workflow-state](../../.claude/.workflow-state) to `active` at start, `idle` at end |
| Build/test gate | Stop hook fires once after `idle` flip, runs full lint/typecheck/build/tests |

## Phase plan

Order matters: DI registrations (Phase 2) must precede producer edits (Phase 3) because the new ctor deps won't resolve at app startup otherwise. Within the single big commit you can interleave, but if you compile in stages you'll hit DI errors.

| # | Phase | Output |
|---|---|---|
| 1 | Discovery — grep all `EnqueueOutboxEventAsync` callers, read the 4 TBD producers, fill the gaps in the producer table below | Complete producer table in this doc |
| 2 | DI registrations — add new inline-collaborator registrations to api + workerservice | All injectable resolved at startup before any producer is edited |
| 3 | Producer business classes — service domain | All ~24 files archived + inline calls added |
| 4 | Worker jobs — `truespend.workerservice` | Jobs archived + inline calls added |
| 5 | Manual-transaction service archival — controller, ViewModels, mappers, validators | Endpoints unreachable; types preserved |
| 6 | Manual-transaction mobile archival — screens, routes, hooks, mutations, fixtures | Mobile UI no longer surfaces manual add |
| 7 | Infrastructure archive — `OutboxPollingConsumer` hosted-service registration | Consumer doesn't run; project still builds |
| 8 | Tests — archive old `Verify` calls, add new `Verify` for inline calls | All tests green |
| 9 | Docs — archive async-messaging bullets in `mvp-architecture.md` + `api-design-patterns.md`; add inline-execution subsection; per-workflow doc notes; add Refactors row to `CLAUDE.md §2` | Docs reflect MVP reality; guide discoverable |
| 10 | Workflow state → `idle`; let Stop hook fire | Lint/typecheck/build/test pass |

## Producer file map

| File | Event(s) archived | Inline replacement(s) | New ctor deps | Status |
|---|---|---|---|---|
| [Business/Cards/CardsInsertBusiness.cs](../../service/truespend.domain/Business/Cards/CardsInsertBusiness.cs) | `UserCardCreated` | none (handler was log-only) | none | Not started |
| [Business/Cards/CardsUpdateBusiness.cs](../../service/truespend.domain/Business/Cards/CardsUpdateBusiness.cs) | `UserCardUpdated`, `RewardOverrideUpserted` | `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` on reward override | `IAnalyticsComputeBusiness` | Not started |
| [Business/Cards/CardsDeleteBusiness.cs](../../service/truespend.domain/Business/Cards/CardsDeleteBusiness.cs) | `UserCardDeleted`, `RewardOverrideDeleted` | `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` on reward override | `IAnalyticsComputeBusiness` | Not started |
| [Business/Catalog/CatalogInsertBusiness.cs](../../service/truespend.domain/Business/Catalog/CatalogInsertBusiness.cs) | `CardProductRequestCreated` | none (handler was log-only) | none | Not started |
| [Business/Geo/FoursquareWebhookBusiness.cs](../../service/truespend.domain/Business/Geo/FoursquareWebhookBusiness.cs) | `NotificationCreated` (2 subs) | `INotificationsDispatchBusiness.DispatchPushAsync(notifId)` + `INotificationInboxCacheInvalidatorBusiness.InvalidateAsync(userId)` | both | Not started |
| [Business/Transactions/TransactionsInsertBusiness.cs](../../service/truespend.domain/Business/Transactions/TransactionsInsertBusiness.cs) | `TransactionCreated` | `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` | `IAnalyticsComputeBusiness` | Not started |
| [Business/Transactions/TransactionsUpdateBusiness.cs](../../service/truespend.domain/Business/Transactions/TransactionsUpdateBusiness.cs) | `TransactionUpdated`, `MissedRewardNotAMiss` | `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` | `IAnalyticsComputeBusiness` | Not started |
| [Business/Transactions/TransactionsDeleteBusiness.cs](../../service/truespend.domain/Business/Transactions/TransactionsDeleteBusiness.cs) | `TransactionDeleted` | `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` | `IAnalyticsComputeBusiness` | Not started |
| [Business/NotificationSettings/NotificationSettingsUpdateBusiness.cs](../../service/truespend.domain/Business/NotificationSettings/NotificationSettingsUpdateBusiness.cs) | `NotificationPreferencesUpdated`, `NotificationTypePreferenceUpdated` | none (no subscriber in EventDispatcher routes today) | none | Not started |
| [Business/Merchants/MerchantsInsertBusiness.cs](../../service/truespend.domain/Business/Merchants/MerchantsInsertBusiness.cs) | `MerchantVisitCreated` | none (handler was log-only) | none | Not started |
| [Business/Notifications/MissedRewardNotificationBusiness.cs](../../service/truespend.domain/Business/Notifications/MissedRewardNotificationBusiness.cs) | `MissedRewardEventCreated` | Call own `ProduceForMissedRewardEventAsync(rowId, ct)` after the insert | none | Not started |
| [Business/Notifications/AdminNotificationDispatchBusiness.cs](../../service/truespend.domain/Business/Notifications/AdminNotificationDispatchBusiness.cs) | `NotificationCreated` (2 subs) | `INotificationsDispatchBusiness.DispatchPushAsync(notifId)` + `INotificationInboxCacheInvalidatorBusiness.InvalidateAsync(userId)` | both | Not started |
| [Business/Profile/ProfileUpdateBusiness.cs](../../service/truespend.domain/Business/Profile/ProfileUpdateBusiness.cs) | `AppProfileUpdated` | none (no subscriber in EventDispatcher routes today) | none | Not started |
| [Business/Plaid/PlaidInsertBusiness.cs](../../service/truespend.domain/Business/Plaid/PlaidInsertBusiness.cs) | `UserCardCreated` (per created card) | none (handler was log-only) | none | Not started |
| [Business/Plaid/PlaidUpdateBusiness.cs](../../service/truespend.domain/Business/Plaid/PlaidUpdateBusiness.cs) | `PlaidConnectionDisconnected` | none (handler was no-op; effects already inlined per existing code comment) | none | Not started |
| [Business/Plaid/PlaidWebhookBusiness.cs](../../service/truespend.domain/Business/Plaid/PlaidWebhookBusiness.cs) | `PlaidItemStatusChanged` (2 subs), `PlaidItemNewAccountsAvailable` | `IPlaidReauthNotificationBusiness.ProduceForStatusChangeAsync(...)` + `ICardsCacheInvalidatorBusiness.InvalidateAsync(userId)` for status; `IPlaidNewAccountsNotificationBusiness.ProduceForNewAccountsAsync(...)` for new accounts | three interfaces | Not started |
| [Business/Notifications/UnusualTransactionNotificationBusiness.cs](../../service/truespend.domain/Business/Notifications/UnusualTransactionNotificationBusiness.cs) | `NotificationCreated` (2 subs) | `DispatchPushAsync` + `InboxCacheInvalidator.InvalidateAsync` | both | Not started |
| [Business/Notifications/PlaidReauthNotificationBusiness.cs](../../service/truespend.domain/Business/Notifications/PlaidReauthNotificationBusiness.cs) | `NotificationCreated` (2 subs) | same pair | both | Not started |
| [Business/Notifications/NotificationsUpdateBusiness.cs](../../service/truespend.domain/Business/Notifications/NotificationsUpdateBusiness.cs) | `NotificationRead`, `NotificationsReadAll` | none (handlers were log-only) | none | Not started |
| [Business/Notifications/NotificationsProductionBusiness.cs](../../service/truespend.domain/Business/Notifications/NotificationsProductionBusiness.cs) | `NotificationCreated` (2 subs) | same pair | both | Not started |
| [Business/Notifications/WeeklySummaryNotificationBusiness.cs](../../service/truespend.domain/Business/Notifications/WeeklySummaryNotificationBusiness.cs) | `NotificationCreated` (2 subs) | same pair | both | Not started |
| [Business/Notifications/PlaidNewAccountsNotificationBusiness.cs](../../service/truespend.domain/Business/Notifications/PlaidNewAccountsNotificationBusiness.cs) | `NotificationCreated` (2 subs) | same pair | both | Not started |
| [Business/Billing/StripeWebhookBusiness.cs](../../service/truespend.domain/Business/Billing/StripeWebhookBusiness.cs) | `BillingSubscriptionUpdated`, `BillingPaymentMethodUpdated` | `IEntitlementCacheInvalidatorBusiness.InvalidateAsync(userId)` + `IBillingPaymentMethodCacheInvalidatorBusiness.InvalidateAsync(userId)` | both | Not started |
| [Business/AIInsights/AIInsightsGenerationBusiness.cs](../../service/truespend.domain/Business/AIInsights/AIInsightsGenerationBusiness.cs) | `AIGenerationCompleted` | `IAIInsightsCacheInvalidatorBusiness.InvalidateForUserAsync(userId, runId)` | one | Not started |

## Worker job map

| File | Event(s) archived | Inline replacement | Status |
|---|---|---|---|
| [Jobs/PlaidTransactionSyncJob.cs](../../service/truespend.workerservice/Jobs/PlaidTransactionSyncJob.cs) | `TransactionImported`, `TransactionUpdated`, `TransactionDeleted` | `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` **once per user, after the sync loop finishes** — not per row. Accumulate distinct userIds in a `HashSet<int>` during the sync loop, call once per user post-commit. Per-row would multiply work N× because the handler is full-snapshot. | Not started |
| [Jobs/AIInsightGenerationJob.cs](../../service/truespend.workerservice/Jobs/AIInsightGenerationJob.cs) | `AIGenerationCompleted` | `IAIInsightsCacheInvalidatorBusiness.InvalidateForUserAsync(userId, runId)` | Not started |
| [Jobs/WeeklySummaryJob.cs](../../service/truespend.workerservice/Jobs/WeeklySummaryJob.cs) | `NotificationCreated` (via WeeklySummaryNotificationBusiness, already covered) | no job-level change | Not started |
| [Jobs/UnusualTransactionJob.cs](../../service/truespend.workerservice/Jobs/UnusualTransactionJob.cs) | `NotificationCreated` (via UnusualTransactionNotificationBusiness, already covered) | no job-level change | Not started |
| [Jobs/ReminderFiringJob.cs](../../service/truespend.workerservice/Jobs/ReminderFiringJob.cs) | `NotificationCreated` (via NotificationsProductionBusiness.FireDueRemindersAsync, already covered in producer table) | no job-level change | Not started |
| [Jobs/AdminNotificationDispatchJob.cs](../../service/truespend.workerservice/Jobs/AdminNotificationDispatchJob.cs) | `NotificationCreated` (via AdminNotificationDispatchBusiness, already covered) | no job-level change | Not started |
| [Jobs/AccountDeletionPurgeJob.cs](../../service/truespend.workerservice/Jobs/AccountDeletionPurgeJob.cs) | none — business writes `privacy_audit` rows via `PrivacyAuditEventTypes`, not the `messaging.event_outbox`. No archival needed. | n/a | Not started |

## Manual-transaction archival map

| Layer | File(s) | Action | Status |
|---|---|---|---|
| Service controller | `truespend.api/Controllers/TransactionsController.cs` create/update/delete actions | `#region archive` around the three action methods | Not started |
| Service ViewModels | `CreateTransactionRequestVm.cs`, `UpdateTransactionRequestVm.cs` (and matching response Vms) | Archive each whole class inside its file via `#region archive` around the class body, leave file present | Not started |
| Service mapper | Mapper methods for the archived ViewModels | Archive those methods only; leave others alone | Not started |
| Service validator | `TransactionsValidator.cs` methods used only by create/update/delete | Archive those methods only | Not started |
| Mobile screens | `ui-mobile/app/(app)/transactions/add.tsx` and any edit/delete screens | Archive component bodies; leave the file with a placeholder `null` export so routes don't 404 at build time | Not started |
| Mobile routes | `ui-mobile/app/(app)/(tabs)/_layout.tsx` or wherever the add-transaction route is registered | Archive the route entry | Not started |
| Mobile hooks/mutations | `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` (or equivalents) | Archive function bodies | Not started |
| Mobile fixtures/tests | Any mock data + test files for the archived screens/hooks | Archive test bodies | Not started |
| User stories | [_docs/UserStory/mobile-user-stories.md](../UserStory/mobile-user-stories.md) — manual transaction add stories | Move story rows into an archive section at end of file with `<!-- region: archive -->`; mark Status as `Archived — manual entry not in MVP` | Not started |

## Infrastructure files (leave alone unless noted)

| File | Action |
|---|---|
| [service/truespend.domain/Services/Messaging/MessagingInsertService.cs](../../service/truespend.domain/Services/Messaging/MessagingInsertService.cs) | Untouched. No live callers after Phase 2; class still compiles. |
| [service/truespend.domain/Services/Messaging/OutboxDispatchService.cs](../../service/truespend.domain/Services/Messaging/OutboxDispatchService.cs) | Untouched. |
| [service/truespend.eventconsumer/Consumers/OutboxPollingConsumer.cs](../../service/truespend.eventconsumer/Consumers/OutboxPollingConsumer.cs) | Untouched. |
| [service/truespend.eventconsumer/Extensions/EventConsumerExtensions.cs](../../service/truespend.eventconsumer/Extensions/EventConsumerExtensions.cs) | Archive only the `builder.Services.AddHostedService<OutboxPollingConsumer>();` line (line 88). Move to `#region archive` at end of method or class. Leave handler/dispatcher registrations live (harmless). |
| `truespend.eventconsumer` project, .csproj, .sln entry | Untouched. Builds in CI; not deployed. |
| [docker/docker-compose.local.yml](../../docker/docker-compose.local.yml) | `eventconsumer` service block archived via `# region: archive` YAML comments; header note added so devs skip the SB emulator infra unless re-enabling async. |
| [docker/docker-compose.prod.yml](../../docker/docker-compose.prod.yml) | `worker` service switched from bundled `truespend.worker.Dockerfile` to standalone `truespend.workerservice.Dockerfile`; the bundled `dockerfile:` line is archived inline so re-enable is a single swap. Cuts the eventconsumer process from the prod image. |
| [docker/docker-compose.infra.yml](../../docker/docker-compose.infra.yml) | Untouched at the service level; header note added explaining SB emulator + SQL Edge are no longer required at runtime in MVP but kept for the future re-enable. |
| [docker/truespend.worker.Dockerfile](../../docker/truespend.worker.Dockerfile), [docker/truespend.eventconsumer.Dockerfile](../../docker/truespend.eventconsumer.Dockerfile) | Untouched. Files preserved for re-enable; no compose file references `truespend.worker.Dockerfile` in MVP. |
| Handlers, Dispatchers, Mappers, Config under `truespend.eventconsumer/` | Untouched. Compile but never invoked. |
| DI registrations of `IMessagingInsertService`, `IOutboxDispatchService`, `IOutboxDispatchBusiness` | Untouched. Resolving an unused service is free; keeps diff small. |
| DB tables `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions`, lookup tables | Untouched. |
| `EventTypes.cs`, `MessagingConstants.cs`, `truespend.domain/Events/*` | Untouched. Constants/contracts may be referenced by the archived code; leave them resolvable. |

## Tests pattern

For each unit test file whose System Under Test publishes events today:

1. Add mocks for the new inline collaborator interfaces.
2. In the live `Arrange/Act/Assert`, replace `messagingInsertService.Verify(EnqueueOutboxEventAsync(...))` with `<collaborator>.Verify(InlineMethod(...))`.
3. Inside the class, after the live test methods, open a `#region archive — async event-publish (disabled in MVP)` block. Paste the removed `Verify(...)` lines as comments, prefixed with a 1-line header naming the test method they were in.
4. Leave the `Mock<IMessagingInsertService>` field in place (constructor still expects it). Add `// archived: kept for future async migration` next to the field.

## Doc archival pattern

`.md` files don't support `#region`. Use HTML comments:

```markdown
<!-- region: archive — async event-publish path (disabled in MVP)

[original bullets / table rows / paragraphs go here]

endregion -->
```

Per affected doc:

| Doc | Action |
|---|---|
| [_docs/high-level-design/mvp-architecture.md](../high-level-design/mvp-architecture.md) | Add "MVP execution mode" subsection stating side-effects run inline post-commit. Move the `Topic` / `DLQ` / `Consumer` diagram blocks and the related bullets into an archive HTML-comment block at the end of the file. |
| [_docs/low-level-design/Service/api-design-patterns.md](../low-level-design/Service/api-design-patterns.md) | Add "Post-commit side-effects" subsection. Move the `truespend.eventconsumer` section, the Event Fan-Out section, the Events Pattern under domain, and the "Insert outbox/event rows…" rule into an archive HTML-comment block. |
| [CLAUDE.md](../../CLAUDE.md) §2 Spec doc index | Add a new "Refactors" row pointing at this guide so future sessions discover it: `\| Refactors \| [sync-execution-conversion.md](_docs/Refactors/sync-execution-conversion.md) \| One-time conversion of async event-publish/consume to inline post-commit calls in MVP \|` |
| Workflow docs that reference events (verified in Phase 1) | Add a one-line note at affected steps: "Side-effect runs inline post-commit (see api-design-patterns.md § Post-commit side-effects)." Do not rewrite event terminology; archive nothing in workflow docs. Candidate files (Phase 1 confirms): [_docs/Workflows/04-cards.md](../Workflows/04-cards.md), [_docs/Workflows/05-transactions.md](../Workflows/05-transactions.md), [_docs/Workflows/06-insights-analytics.md](../Workflows/06-insights-analytics.md), [_docs/Workflows/07-notifications.md](../Workflows/07-notifications.md), [_docs/Workflows/10-geo-recommendations.md](../Workflows/10-geo-recommendations.md), [_docs/Workflows/12-cross-cutting.md](../Workflows/12-cross-cutting.md), [_docs/Workflows/notification-production.md](../Workflows/notification-production.md), [_docs/Workflows/webhook-handlers.md](../Workflows/webhook-handlers.md). |

## Progress

| Phase | Status | Notes |
|---|---|---|
| 1. Discovery | Done | TBD producer rows filled (Foursquare: NotificationCreated 2-sub; NotificationSettingsUpdate: no subscriber; Profile: no subscriber; PlaidInsert: log-only). TBD worker job rows filled (ReminderFiring covered via NotificationsProductionBusiness; AccountDeletionPurge writes to `privacy_audit` not outbox). |
| 2. DI registrations | Done | API: `IAnalyticsComputeBusiness` + `IAIInsightsCacheInvalidatorBusiness` in `InsightsWorkflowExtensions`; `ICardsCacheInvalidatorBusiness` + `IPlaidReauthNotificationBusiness` + `IPlaidNewAccountsNotificationBusiness` in `PlaidWebhookExtensions`. Worker: Analytics services + compute, AI insights cache invalidator, `INotificationsDispatchBusiness`, `INotificationInboxCacheInvalidatorBusiness`, push + email delivery. |
| 3. Producer business classes | Done | All ~22 files archived + inline collaborators wired. `WeekKey` helper in `WeeklySummaryNotificationBusiness` collapsed into the archive comment (idempotency now enforced by DB unique constraint on the notification). |
| 4. Worker jobs | Done | Job files are thin wrappers around the now-converted businesses; no enqueue calls live in the job files themselves. |
| 5. Service manual-transaction archive | Done | `TransactionsController` Create/Update/Delete actions archived; `CreateTransactionRequestVm` + `UpdateTransactionRequestVm` class bodies archived; `ITransactionsMapper` ToDomain methods archived in interface + impl. Validator/business methods left live (still resolvable via DI). |
| 6. Mobile manual-transaction archive | Done | `new.tsx` + `[id]/edit.tsx` routes replaced with null placeholders. `TransactionFormScreen` archived. `TransactionsScreen` FAB removed. `TransactionDetailScreen` Edit + Delete buttons removed. `useCreateTransaction` / `useUpdateTransaction` / `useDeleteTransaction` hooks return rejecting no-op mutations. `transactions.api.ts` create/update/delete archived. Three hook test files archived (`describe.skip` wrappers preserve archive intent). Manual-tx user-story rows moved to archive section. |
| 7. Infrastructure archive (hosted-service line) | Done | `builder.Services.AddHostedService<OutboxPollingConsumer>()` archived in `EventConsumerExtensions.cs`. |
| 8. Tests | Done | All `Verify(EnqueueOutboxEventAsync(...))` calls archived; new `Verify` on the inline collaborators added where the inline call replaces it. `messaging.Verify(..., Times.Never)` asserts the outbox is no longer touched for log-only / no-subscriber events. |
| 9. Docs (includes CLAUDE.md §2 Refactors row) | Done | CLAUDE.md §2 Refactors row added. `mvp-architecture.md` MVP execution mode subsection added. `api-design-patterns.md` § Post-commit side-effects added; § Events Pattern, § truespend.eventconsumer, § Event Fan-Out marked "Archived in MVP" with pointer back. Workflow docs (04, 05, 06, 07, 09, 10, 12, 13, notification-production, webhook-handlers) have one-line MVP execution notes. |
| 10. Workflow-state flip + Stop-hook run | Done | `.claude/.workflow-state` is `idle`; Stop hook runs the full lint/typecheck/build/test on next stop. |

## Risks

| Risk | Mitigation |
|---|---|
| Stripe webhook now does Redis cache invalidation in the request thread | Cache invalidation is ~1 Redis DEL, acceptable. Watch latency. |
| Plaid webhook → reauth notification → APNs in request thread | Acceptable for MVP. If Plaid retries fire, move push to fire-and-forget `Task.Run` later (still no outbox). |
| Two-subscriber events (`NotificationCreated`, `PlaidItemStatusChanged`) need two inline calls per producer | Producer table flags subscriber count; review against [EventDispatcher.Routes](../../service/truespend.eventconsumer/Dispatchers/EventDispatcher.cs) before each edit |
| Unused-field warnings on archived ctor params | Inline `// archived: kept for future async migration` comment; suppress only if compiler escalates to error |
| DI registration drift (collaborator registered in eventconsumer but not api/workerservice) | Phase 7 build pass; resolve per-error |
| Tests assert old event publish | Phase 8 archives old assertions, adds new ones |
| Future re-enable | Reverse the archive: uncomment enqueue, comment new inline calls, re-enable `AddHostedService<OutboxPollingConsumer>()`. No schema work needed because tables were never touched. |

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-05 | Inline calls in producing business class, no outbox row written | User clarified "sync" means do the work inline, no events |
| 2026-06-05 | No file or code deletions; archive via `#region archive` (C#) or `<!-- region: archive -->` (markdown) | Preserve full re-enable path |
| 2026-06-05 | Bundle manual-transaction removal in the same effort | One mechanical pass through the codebase |
| 2026-06-05 | One big commit for code + tests; doc commit optional separate | User preference |
| 2026-06-05 | Update unit tests in same effort | Keep tests truthful about current behavior |
| 2026-06-05 | Set `.claude/.workflow-state` to `active` during the work | Silence Stop hook until the very end |
| 2026-06-05 | Archive placement: inside class closing brace (Option A) | Scoped to class; collapses in IDEs |
| 2026-06-05 | Keep `truespend.eventconsumer` project in build/sln; just don't deploy and don't host the polling consumer | "Don't delete anything" |

## Re-enable async path later

1. Reverse Phase 6: un-archive `AddHostedService<OutboxPollingConsumer>()` in `EventConsumerExtensions.cs`.
2. Reverse Phase 2/3: un-archive `EnqueueOutboxEventAsync` calls; archive the inline collaborator calls in the same `#region` style.
3. Redeploy `truespend.eventconsumer` as a Container App.
4. Reverse Phase 9 doc archival.

No DB migration required (tables were preserved).
