# Job Schedule & Manual-Trigger Review

Status: **in progress**
Date opened: 2026-06-09

## Goal

Settle every worker job's schedule and MVP on/off state, add an unauthenticated manual-trigger HTTP surface on the worker, and keep all job code in the repo (disable, never delete). Full job reference: [job-architecture.md](../low-level-design/Service/job-architecture.md).

## Manual trigger

Worker is hosted as a `WebApplication`. Routes (no auth — local/ops only, never public ingress):

| Route | Purpose |
|---|---|
| `GET /health` | Liveness probe |
| `GET /jobs` | List triggerable job names |
| `POST /jobs/{name}/run` | Run one job once, in its own DI scope |

- Runs regardless of `Enabled`/cron, and regardless of whether today's scheduled run already happened or is pending.
- Independent of the scheduler loop, so it never shifts the cron schedule (today or going forward).
- Idempotent jobs still won't re-emit a side-effect they already produced — by design.

## Final schedule & status (Production cron; Dev all off + manual)

| Job | Cron | Status |
|---|---|---|
| RewardsCcCatalogSyncOrchestrationJob | `0 0 * * *` | On |
| AIInsightGenerationJob | `0 1 * * *` | On |
| AccountDeletionPurgeJob | `0 3 * * *` | On |
| PlaidTransactionSyncJob | `0 4 * * *` | On |
| InvalidDeviceTokenCleanupJob | `0 4 * * *` | On |
| SubscriptionExpiryNotificationJob | `0 9 * * *` | On |
| AdminNotificationDispatchJob | `0 9 * * *` | On |
| CardCatalogMappingReviewJob | chained in rewards sync | On (chained) |
| ReminderFiringJob | `* * * * *` | Off |
| WeeklySummaryJob | `0 * * * *` | Off |
| UnusualTransactionJob | `*/5 * * * *` | Off |
| PlaidInstitutionCatalogJob | `0 1 * * *` | Off |
| RewardsCcCatalogReconcileJob | `0 4 * * 0` | Off |

## Done

| Item | Notes |
|---|---|
| Manual-trigger API | `Program.cs` → `WebApplication`; `Jobs/JobRegistry.cs`, `Extensions/JobTriggerEndpoints.cs`; csproj `FrameworkReference Microsoft.AspNetCore.App`; `Urls` dev port `5080` |
| Dockerfile | Worker base image `dotnet/runtime` → `dotnet/aspnet` (now hosts HTTP) |
| Disable (code kept) | ReminderFiring, WeeklySummary, UnusualTransaction, PlaidInstitutionCatalog, RewardsCcCatalogReconcile — `Enabled:false`, still in registry |
| Timings | AI 01:00, Rewards sync 00:00, Plaid sync 04:00, AdminDispatch 09:00 — set in both appsettings |
| Guide | job-architecture.md updated: Job List, schedules, disabled banners, manual-trigger section |
| AI insights → nightly batch over all eligible Basic/Pro users | `IEntitlementGuard.HasFeatureAsync` (non-throwing); `AIInsightsReadService.GetNightlyGenerationCandidatesAsync`; `AIInsightsGenerationBusiness.GenerateForAllEligibleUsersAsync`; job calls it. Tests added. On-demand `ProcessPendingRunsAsync` kept but no longer scheduled |
| Plaid sync → Basic/Pro only | `PlaidUpdateBusiness.SyncAllActiveConnectionsAsync` skips users without `plaid_linking_enabled` via `HasFeatureAsync` (quiet skip instead of throw+error-log). Test added |

## Open — account deletion (blocked)

Confirmed: account-deletion request creation does **not exist in the .NET service** (no controller, no `PurgeAfter =` assignment, no SQL default in [privacy.sql](../../supabase/migrations/privacy.sql)). The purge job only *reads* `purge_after`. So the 14-day-configurable window and the full cascade depend on first establishing the creation path.

| Item | Blocker |
|---|---|
| 14-day configurable grace window | Where is `POST /api/v1/account-deletion` handled? Likely Supabase client-side insert. Must be set at creation, not the worker |
| Full cascade incl. `auth.users` | `AccountDeletionPurgeBusiness` cascade audit — verify all user-owned schemas covered once creation path is settled |

## Open questions

- Where is `POST /api/v1/account-deletion` actually handled (missing .NET controller / Supabase insert)? Determines where the 14-day window lives.
- On-demand AI insights: keep the user-requested `generate` path, or is nightly-for-all sufficient for MVP?
