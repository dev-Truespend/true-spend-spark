# MVP Feature Additions — Plan

Status: **implemented** (all five workstreams landed)
Date opened: 2026-06-09

Five workstreams. Specs migrate into the owner workflow docs at implementation time.

## Status

| # | Workstream | Status | Key entry points |
|---|---|---|---|
| 3 | AI insights worker-only | Done | `AIInsightsController` (generate archived), `GenerateForAllEligibleUsersAsync` (only generator); mobile generate flow removed |
| 2 | Account deletion + reactivation | Done | `AccountDeletionController`, `AccountDeletionRequestBusiness`, bootstrap `PendingDeletion`, mobile `AccountReactivationScreen` |
| 1 | Rewards CC seed vs full | Done | `IRewardsCcProvider.ListAllCardsAsync`, `RewardsCcCatalogSyncBusiness` branches on seed presence |
| 4 | Pro re-sync quota | Done | `app.user_daily_usage`, `ManualResyncQuotaBusiness`, `GET /plaid/resync-quota`; mobile `useResyncQuota` |
| 5 | Feature-gating UI | Done (Insights validated; roll out remaining tabs incrementally) | `shared/components/FeatureGate.tsx`, `shared/navigation/featureCatalog.ts` |

## Decisions (locked)

| Topic | Decision |
|---|---|
| Login during deletion grace | **Reactivate prompt** — recognize the user, offer to cancel deletion & restore; decline stays scheduled |
| Pro re-sync daily counter | **Per-user usage table** (`user_id`, `usage_date`, `plaid_resync_count`; extensible for future counters) |
| Rewards CC seed vs full | **Derive from seed** — seed configured → seed mode; seed empty → full catalog |
| Feature-gating UI rollout | **Incremental per tab** — build the shared component first, validate on one tab, then roll out |

## 1. Rewards CC — seed vs full catalog

| Aspect | Detail |
|---|---|
| Seed mode (MVP) | Seed configured → per configured card: `SearchCardByNameAsync` → `GetCardDetailAsync` |
| Full mode (prod) | Seed empty → `ListAllCardsAsync` → per card `GetCardDetailAsync` |
| Two independent switches | **Seed** decides *what* it pulls (seeded cards vs full catalog); **`Enabled`** decides *whether* it runs on cron. **Manual trigger always available** regardless. No seed-aware scheduler code — scheduling stays the normal `Enabled` + `Cron` path used by every job |
| Behavior matrix | seed present + `Enabled:false` → manual-only, seeded · seed present + `Enabled:true` → scheduled + manual, seeded · seed empty + `Enabled:true` → scheduled + manual, full catalog · seed empty + `Enabled:false` → manual-only, full catalog |
| New code | Add `ListAllCardsAsync(ct)` to `IRewardsCcProvider` (+ real + placeholder); branch in `RewardsCcCatalogSyncBusiness`/orchestration job: `seed.Count > 0 ? SyncSeededCardsAsync : SyncFullCatalogAsync` |
| Config | `RewardsCc:Seed` (exists, 100 cards in Dev) = mode switch; `WorkerConfig:RewardsCcCatalogSync.Enabled` + `Cron` = schedule switch (set per environment). Dev today: seed present + `Enabled:false` = manual-only |
| Job | `RewardsCcCatalogSyncOrchestrationJob` — picks seeded vs full from seed presence; scheduled iff `Enabled` |
| Owner | job-architecture.md, catalog/recommendations workflow |

## 2. Account deletion — delete API + reactivation

| Aspect | Detail |
|---|---|
| Create | **New** `POST /api/v1/account-deletion` → insert `privacy.account_deletion_requests` (status `pending`, `purge_after = now + DeletionGraceDays`) via new controller → insert business → service |
| Reactivate | **New** `POST /api/v1/account-deletion/cancel` → status `cancelled` (purge job already skips cancelled) |
| Login in grace | Post-auth check for pending deletion → app routed to reactivate/cancel screen; app locked to that screen until reactivated or purge runs |
| Config | `Privacy:DeletionGraceDays = 14` |
| Purge | Existing `AccountDeletionPurgeJob` (verify cascade covers all user-owned schemas + `auth.users`) |
| UI | Delete-profile button (Profile/Privacy); reactivate screen on login |
| Owner | 14-privacy-data.md, 01-auth-session.md |

## 3. AI insights — worker-only

| Aspect | Detail |
|---|---|
| Remove | Archive `POST /api/v1/ai-insights/generate` ([AIInsightsController.cs:23](../../service/truespend.api/Controllers/AIInsightsController.cs#L23)) + insert-business method + mapper; remove mobile generate flow (screen 6.3) |
| Dead path | Archive `ProcessPendingRunsAsync` + pending-runs draining (nothing creates pending runs now) |
| Keep | `GET /api/v1/ai-insights` (read); nightly `GenerateForAllEligibleUsersAsync` is the only generator |
| Owner | 06-insights-analytics.md |

## 4. Manual re-sync — Pro only, daily quota

| Aspect | Detail |
|---|---|
| Gate | User-initiated sync (PlaidController sync endpoints) → Pro only (new `manual_resync_enabled` entitlement or plan==Pro). Automatic nightly sync (Basic+) unaffected |
| Quota | Per-user per-day count checked + incremented in business before sync; default **5/day**, configurable (`ProResyncDailyLimit`) |
| Counter table | `app.user_daily_usage(user_id uuid, usage_date date, plaid_resync_count int, PK(user_id, usage_date))` — daily reset via `usage_date`; extensible for future counters. Supabase migration + EF entity + read/update service |
| Over limit | Clear "limit reached / upgrade" response; UI shows remaining count |
| Owner | 05-transactions.md, 09-billing-entitlements.md, 13-feature-gating.md |

## 5. Feature-gating UI — locked features + upsell

| Aspect | Detail |
|---|---|
| Hook | `useEntitlements()` context from `GET /entitlements` |
| Catalog | Central feature → (min plan, lock label, upsell copy, paywall target) map |
| Component | Reusable `<FeatureGate feature="...">` — renders children when entitled; lock + subtle hint + tap→paywall otherwise |
| Rollout | Build component/hook/catalog → validate on one tab → roll out tab-by-tab |
| Owner | 13-feature-gating.md |

## Suggested sequence

1. AI generate removal (3) → 2. Account deletion + reactivation (2) → 3. Rewards CC mode (1) → 4. Pro re-sync quota (4) → 5. Feature-gating UI (5, largest; parallelizable).

## Resolved decisions

- Quota-counted endpoints: `POST /plaid/connections/sync` and `POST /plaid/transactions/sync` (both single-connection and the pull-to-refresh sweep). The automatic nightly sweep bypasses the gate by calling `SyncSingleConnectionAsync` directly.
- `manual_resync_enabled` is a **code-backed feature** (no `billing.plan_features` row): `EntitlementGuard.IsFeatureEnabled` maps it to `plan==Pro`. `RequireFeatureAsync` therefore yields the standard 403 upgrade-to-Pro response.
- Feature-gating catalog lives in `shared/navigation/featureCatalog.ts`: `ai_insights_enabled`, `geofencing_enabled`, `manual_resync_enabled`, `unlimited_cards` (Pro); `plaid_linking_enabled`, `plaid_transactions_view_enabled` (Basic). Unknown codes default to Pro.
