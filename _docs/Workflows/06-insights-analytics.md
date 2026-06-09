# Insights And Analytics Workflow

> **MVP execution note** — Any step below that mentions an outbox event runs **inline post-commit** in the MVP. Analytics recompute is triggered by `IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId)` invoked inline from transaction/reward producers. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Scope

Phase 1 online workflow for the Insights sub-tab: rewards summary, missed-rewards summary, daily/category breakdowns, top missed rewards, AI-generated reward optimization insights, and AI insight dismissal.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 6.3 | Insights -> Insights | Rewards, missed rewards, charts, top missed events, AI insight |
| 6.2 | Transaction detail | Open top missed-reward event |
| 8.4 | Privacy & data | Personalized AI insights toggle affects this workflow |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can open the Insights tab from bottom navigation | 6.3 | Insights sub-tab |
| Full | User can switch between Transactions and Insights sub-tabs | 6.1, 6.3 | This doc covers Insights |
| Full | User can view rewards earned over week, month, quarter, and year from transactions | 6.3 | `periodCode` |
| Full | User can view missed-rewards totals over week, month, quarter, and year | 6.3 |  |
| Full | User can compare earned and missed rewards to a prior period | 6.3 | Delta fields |
| Full | User can see a daily earnings chart | 6.3 | `dailyBreakdown` |
| Full | User can see category contribution breakdowns | 6.3 | `categoryBreakdown` |
| Full | User can see top missed-reward events | 6.3 | `topMissedRewards` |
| Full | User can open a top missed-reward event from analytics | 6.3, 6.2 | Uses transaction detail |
| Full | User can see AI-generated reward optimization insights powered by Azure OpenAI | 6.3 | Async generation |
| Full | User can opt out of personalized AI insights via the Privacy toggle | 8.4, 6.3 | Toggle implemented in `PrivacyDataScreen` (privacy workflow owns the setting write); generation respects `privacy.settings.personalized_ai_insights_enabled` |

## Preconditions

- User is authenticated.
- Analytics are derived from manual and Plaid-imported Phase 1 transactions.
- AI insight generation must respect `privacy.settings.personalized_ai_insights_enabled`.

## Primary API Sequence

1. Load period summary: `GET /api/v1/analytics/rewards-summary?periodCode=month`.
2. Load missed summary when needed: `GET /api/v1/analytics/missed-rewards-summary?periodCode=month`.
3. Load AI insights: `GET /api/v1/ai-insights`. Generation is **worker-only** (nightly `AIInsightGenerationJob`); there is no client-triggered generation in the MVP.
4. Open top missed item: `GET /api/v1/transactions/{transactionId}`.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load rewards dashboard | `GET /api/v1/analytics/rewards-summary?periodCode=` | `RewardsSummaryResponse`: `earned`, `missed`, `earnedDelta`, `missedDelta`, `dailyBreakdown` (`RewardBreakdownItemVm[]`), `categoryBreakdown` (`RewardBreakdownItemVm[]`), `topMissedRewards` (`MissedRewardVm[]`) | Precomputed Read Model | None on read | Read: `insights.analytics_snapshots`, `finance.missed_reward_events`, optional transaction detail joins | Server per-user/period short TTL; mobile memory cache per period |
| Load missed-rewards summary | `GET /api/v1/analytics/missed-rewards-summary?periodCode=` | `MissedRewardsSummaryResponse`: `missed`, `missedDelta`, `topMissedRewards` (`MissedRewardVm[]`) | Precomputed Read Model | None on read | Read: `insights.analytics_snapshots`, `finance.missed_reward_events` | Same as rewards summary |
| Change period | Same analytics APIs | Query `periodCode` from `lookup.analytics_periods` | Sync API / Precomputed Read Model | None | Read: `lookup.analytics_periods`, `insights.analytics_snapshots` | `analytics_periods` cached by default; summary cached by period |
| Load AI insights | `GET /api/v1/ai-insights` | `AIInsightsResponse`: `insights` | Sync API | None | Read: `insights.ai_insights`, `insights.insight_generation_runs`, `lookup.ai_insight_types`, `lookup.priority_levels`, `privacy.settings` | Mobile memory/persistent latest insight cards; server short TTL per user |
| Generate AI insights (worker-only) | Nightly `AIInsightGenerationJob` → `GenerateForAllEligibleUsersAsync` | n/a (no client endpoint in MVP) | Async Job | Worker creates + processes runs in one pass ([job-architecture.md](../low-level-design/Service/job-architecture.md#aiinsightgenerationjob)) | Write: `insights.insight_generation_runs`, `insights.ai_insights`; Read: `privacy.settings`, entitlements gate | Invalidate AI insights cache for user on completion |
| Read generation run | `GET /api/v1/ai-insights/generation/{runId}` | `AIInsightGenerationResponse` | Sync API | None | Read: `insights.insight_generation_runs` | Retained read-only status endpoint; no client-side polling loop in MVP |
| Complete AI generation | `AIInsightGenerationJob` (worker) | Writes `insights.ai_insights` rows + publishes `insights.ai_generation.completed` | Async Job | Worker -> `AIInsightsCacheInvalidator` consumes `insights.ai_generation.completed` | Write: `insights.ai_insights`, `messaging.event_outbox`; update `insights.insight_generation_runs`; Read: `privacy.settings`, `insights.analytics_snapshots`, transaction/reward tables, lookups | Invalidate AI insights cache for user |
| Dismiss insight | `POST /api/v1/ai-insights/{insightId}/dismiss` | Empty -> `AIInsightsResponse` | Sync API + Event | Optional `insights.ai_insight.dismissed` audit/product analytics | Update: `insights.ai_insights` | Replace cached insights list |
| Open top missed event | `GET /api/v1/transactions/{transactionId}` | `TransactionDetailResponse` | Sync API | None | Read transaction/reward/missed tables | Uses transaction detail cache rules |

## Contracts Used

- `RewardsSummaryResponse`: `earned`, `missed`, `earnedDelta`, `missedDelta`, `earnedCurrencyCode`, `dailyBreakdown`, `categoryBreakdown`, `topMissedRewards`.
- `MissedRewardsSummaryResponse`: `missed`, `missedDelta`, `earnedCurrencyCode`, `topMissedRewards`.
- `RewardBreakdownItemVm`: `key`, `label`, `earned`, `missed` — shared by `dailyBreakdown` and `categoryBreakdown`.
- `MissedRewardVm`: used in `topMissedRewards`.
- `AIInsightVm`: `id`, `typeCode`, `priority`, `title`, `body`, `generatedAt`.
- `AIInsightGenerationResponse`: `runId`, `status`.

`earnedCurrencyCode` is the `lookup.reward_currencies.code` carried on `insights.analytics_snapshots.earned_currency_code`. Mobile uses it to render `earned`/`missed` totals in the right currency unit (cash back vs points).

## Tables Involved

| Role | Tables |
|---|---|
| Read models | `insights.analytics_snapshots` |
| AI writes | `insights.insight_generation_runs`, `insights.ai_insights` |
| Source data | `finance.transactions`, `finance.transaction_reward_results`, `finance.missed_reward_events`, `finance.user_cards`, `finance.merchants`, `catalog.categories` |
| Privacy gate | `privacy.settings` |
| Dropdown/reference | `lookup.analytics_periods`, `lookup.generation_statuses`, `lookup.ai_insight_types`, `lookup.priority_levels` |

## Cache Strategy

- Cache analytics summaries by `userId + periodCode + period_start` server-side with short TTL.
- Mobile caches the active period in memory and may persist the last viewed summary.
- Cache dropdown/reference APIs by default, especially `GET /api/v1/lookups/analytics-periods` and `GET /api/v1/lookups/ai-insight-types`.
- AI insights are DB-backed; mobile may cache latest non-dismissed insights until dismissal, privacy change, or generation completion.

## Sync vs Async Decisions

- Analytics reads are synchronous but backed by precomputed read models.
- Analytics recomputation is async via `AnalyticsRecomputeConsumer` subscribed to `finance.transaction.created|updated|deleted|imported` and `finance.missed_reward.not_a_miss`. No dedicated `insights.analytics.*` event — the existing transaction/missed-reward outbox events drive the consumer.
- AI insight generation is async and should not block the dashboard.
- Dismissing an AI insight is synchronous.

## Invalidation Triggers

- `finance.transaction.created|imported|updated|deleted`: `AnalyticsRecomputeConsumer` refreshes `insights.analytics_snapshots`, then invalidates analytics summaries and AI insight eligibility.
- `finance.missed_reward.not_a_miss`: `AnalyticsRecomputeConsumer` refreshes missed totals and top missed events.
- `insights.ai_generation.completed`: invalidate AI insights list (consumed by `AIInsightsCacheInvalidator`).
- `privacy.settings.personalized_ai_insights_enabled=false`: hide/invalidate personalized AI insights and block generation.

## Loading And Error States

- Initial dashboard: chart/stat skeletons.
- Period change: keep current period visible while loading next period.
- Empty: show zero rewards/missed rewards when no transactions exist.
- AI disabled: hide AI insight card or show privacy-controlled disabled state.
- AI generation failure: show non-blocking retry; analytics remain usable.

## Progress

| User story | Status | Notes |
|---|---|---|
| User can open the Insights tab from bottom navigation | Done | Tab wired in `(tabs)/_layout.tsx` |
| User can switch between Transactions and Insights sub-tabs | Done | `InsightsScreen` top-level tab switcher |
| User can view rewards earned over week, month, quarter, and year | Done | `PeriodSelector` + `useRewardsSummary` + `RewardSummaryCard` |
| User can view missed-rewards totals over week, month, quarter, and year | Done | `missed` field in `RewardSummaryCard` |
| User can compare earned and missed rewards to a prior period | Done | Delta fields rendered in `RewardSummaryCard` |
| User can see a daily earnings chart | Done | `dailyBreakdown` rendered via `DailyBreakdownChart` |
| User can see category contribution breakdowns | Done | `CategoryBreakdownList` component |
| User can see top missed-reward events | Done | `MissedRewardCard` list in Analytics sub-tab |
| User can open a top missed-reward event from analytics | Done | Navigates to `/(app)/transactions/{id}` from `InsightsScreen` |
| User can see AI-generated reward optimization insights | Done | `AIInsightCard` list in AI sub-tab; generation is worker-only (nightly), no client generate trigger |
| User can opt out of personalized AI insights via the Privacy toggle | Done (Partial) | Privacy gate enforced server-side; toggle UI owned by workflow 08 |

## Design Gaps

None currently open.

