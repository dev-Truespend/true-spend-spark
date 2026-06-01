# Transactions Workflow

## Scope

Phase 1 online workflow for the Insights Transactions sub-tab: list/search/filter transactions, create or edit manual transactions, import Plaid transactions, open detail, delete, view reward result, and mark missed rewards as not a miss.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 6.1 | Insights -> Transactions | List, search, filters, missed-reward callout |
| 6.1b | Manual transaction | Create form |
| 6.2 | Transaction detail | Reward detail, edit, delete |
| 7.2 | Notification detail | Deep-links into transaction detail |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can open the Insights tab from bottom navigation | 6.1 | Transactions sub-tab |
| Full | User can switch between Transactions and Insights sub-tabs | 6.1, 6.3 | This doc covers Transactions |
| Full | User can manually log a transaction from the Transactions sub-tab via the floating `+` action | 6.1, 6.1b |  |
| Full | User can enter merchant, amount, card, date, time, location, and category when manually logging a transaction | 6.1b |  |
| Full | User can pick the card used for a manually logged transaction from their linked + manual cards | 6.1b, 6.2 |  |
| Full | User can see a reward check while logging a manual transaction if a better card appears available | 6.1b | Via create/detail response |
| Full | User can view recent manually logged and Plaid-imported transactions on mobile | 6.1 |  |
| Full | User can see transactions imported from linked Plaid cards | 6.1, 6.2 | Imported by scheduled/background sync |
| Full | User can refresh linked-card transactions | 6.1 | Runs Plaid transaction sync when available |
| Full | User can see merchant, amount, card, date, and category for each transaction | 6.1, 6.2 |  |
| Full | User can search transactions by merchant or description | 6.1 | `q` query |
| Full | User can filter transactions by category | 6.1 | `categoryCode` query |
| Full | User can filter transactions by card | 6.1 | `cardId` query |
| Full | User can see earned points or cash back computed from card rules for each manually logged transaction | 6.1 |  |
| Full | User can see missed rewards on a manually logged transaction | 6.1, 6.2 |  |
| Full | User can see when a better card could have been used | 6.1, 6.2 |  |
| Full | User can open transaction details | 6.1, 6.2 |  |
| Full | User can edit a transaction category | 6.2 |  |
| Full | User can change the card associated with a transaction | 6.2 |  |
| Full | User can delete a transaction | 6.2 |  |
| Partial | User can navigate from a notification to the related transaction | 7.2, 6.2 | Notification workflow owns source navigation |
| Out of scope | User can see transactions while offline from local cache | 6.1, 8.5 | Offline minimized for Phase 1 workflow docs |

## Preconditions

- User is authenticated and authorized for the selected transaction.
- User has at least one active `finance.user_cards` row to select a card for manual transactions.
- Plaid transaction import requires an active `finance.plaid_items` connection and linked `finance.plaid_accounts`.
- Category/card dropdown data may already be cached on mobile.

## Primary API Sequence

1. Load Transactions tab: `GET /api/v1/transactions`.
2. Load form dropdowns: `GET /api/v1/cards`, `GET /api/v1/card-catalog/categories`.
3. Save transaction: `POST /api/v1/transactions`.
4. Open detail: `GET /api/v1/transactions/{transactionId}`.
5. Edit or delete: `POST /api/v1/transactions/{transactionId}` or `POST /api/v1/transactions/{transactionId}/delete`. Add and edit both support merchant, amount, card, category, date/time, and location fields.
6. Plaid import: daily `PlaidTransactionSyncJob` runs Plaid transactions/sync for active connections and upserts imported rows into `finance.transactions`.
7. User refresh: `POST /api/v1/plaid/transactions/sync` can refresh a linked connection when the user explicitly requests it.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load transaction list | `GET /api/v1/transactions?q=&categoryCode=&cardId=` | `TransactionsResponse`: `transactions`, `emptyState` | Sync API | None | Read: `finance.transactions`, `finance.transaction_reward_results`, `finance.missed_reward_events`, `finance.user_cards`, `finance.merchants`, `catalog.categories` | Mobile memory/persistent recent list; invalidate after transaction writes |
| Search/filter list | `GET /api/v1/transactions/search` | `TransactionsResponse` | Sync API | None | Same as list | Short mobile memory cache by query; no server cache by default |
| Load create form dropdowns | `GET /api/v1/cards`; `GET /api/v1/card-catalog/categories` | `CardsResponse`; `CategoriesResponse` | Sync API | None | Read: `finance.user_cards`, `catalog.card_products`, `catalog.card_issuers`, `catalog.categories` | Cards mobile cache; categories cached by default on mobile + server |
| Save manual transaction | `POST /api/v1/transactions` | `CreateTransactionRequest` -> `TransactionDetailResponse` | Sync API + Outbox Event | Produce `finance.transaction.created` -> `AnalyticsRecomputeConsumer`, `MissedRewardNotificationProducer`, AI eligibility consumers | Write: `finance.transactions`, `finance.transaction_reward_results`, optional `finance.missed_reward_events`, `messaging.event_outbox`; Read: `finance.user_cards`, `finance.merchants`, `catalog.categories`, `catalog.reward_rules`, `finance.card_reward_overrides`, `lookup.reward_currencies` | Update/replace transaction detail in mobile cache; invalidate list, analytics, missed rewards |
| Sync Plaid transactions | `POST /api/v1/plaid/transactions/sync` or `PlaidTransactionSyncJob` | `SyncPlaidTransactionsRequest` -> `PlaidTransactionSyncResponse` | Sync API or Scheduled Job + Outbox Event | Produce `finance.transaction.imported` / `finance.transaction.updated` for changed rows -> `AnalyticsRecomputeConsumer`, `MissedRewardNotificationProducer` | Read Plaid provider; upsert `finance.transactions` by `plaid_transaction_id`; update `finance.plaid_items.transaction_sync_cursor`, `last_transaction_sync_at`; write reward/missed rows and `messaging.event_outbox` | Invalidate transaction list/detail, analytics, missed rewards |
| Open transaction detail | `GET /api/v1/transactions/{transactionId}` | `TransactionDetailResponse`: `transaction`, `rewardResult`, `missedReward` | Sync API | None | Read: `finance.transactions`, `finance.transaction_reward_results`, `finance.missed_reward_events`, `finance.user_cards`, `finance.merchants`, `catalog.categories` | Mobile detail cache; refresh when opened from notification |
| Refresh reward result | `GET /api/v1/transactions/{transactionId}/reward-result` | `TransactionRewardResultResponse`: `earnedReward`, `missedReward` | Sync API | None | Read: `finance.transaction_reward_results`, `finance.missed_reward_events`, reward tables | Short mobile memory cache; invalidate after transaction/card/category edit |
| Edit transaction | `POST /api/v1/transactions/{transactionId}` | `UpdateTransactionRequest` -> `TransactionDetailResponse` | Sync API + Outbox Event | Produce `finance.transaction.updated` -> `AnalyticsRecomputeConsumer`, missed-reward notification reconciliation, AI eligibility consumers | Update: `finance.transactions`, `finance.transaction_reward_results`, `finance.missed_reward_events`, `messaging.event_outbox`; Read reward tables | Replace cached detail; invalidate list, analytics, missed rewards |
| Delete transaction | `POST /api/v1/transactions/{transactionId}/delete` | Empty -> `TransactionsResponse` | Sync API + Outbox Event | Produce `finance.transaction.deleted` -> `AnalyticsRecomputeConsumer`, notification cleanup/reconciliation | Update/delete: `finance.transactions`; write `messaging.event_outbox`; related reward/missed rows handled per DB policy | Remove from mobile cache; invalidate list, analytics, related notification details |
| Mark missed reward as not a miss | `POST /api/v1/missed-rewards/{missedRewardId}/not-a-miss` | Empty -> `TransactionDetailResponse` | Sync API + Outbox Event | Produce `finance.missed_reward.not_a_miss` -> `AnalyticsRecomputeConsumer`, notification reconciliation | Update: `finance.missed_reward_events`; write `messaging.event_outbox`; Read: transaction detail tables | Replace cached detail; invalidate missed rewards, analytics, notifications |

## Contracts Used

- `TransactionVm`: `id`, `merchantName`, `amount`, `card`, `categoryCode`, `categoryName`, `transactionDate`, `transactionTime`, `locationLabel`, `source`, `isPending`, `earnedReward`, `missedReward`, `syncStatus`.
- `CreateTransactionRequest`: `merchantName`, `amount`, `cardId`, `categoryCode`, `transactionDate`, `transactionTime`, `locationLabel`, `locationLat`, `locationLng`.
- `UpdateTransactionRequest`: `merchantName`, `amount`, `cardId`, `categoryCode`, `transactionDate`, `transactionTime`, `locationLabel`, `locationLat`, `locationLng`.
- `SyncPlaidTransactionsRequest`: `connectionId`, `force`.
- `PlaidTransactionSyncResponse`: `connectionId`, `importedCount`, `updatedCount`, `removedCount`, `lastTransactionSyncAt`.
- `TransactionDetailResponse`: `transaction`, `rewardResult`, `missedReward`.
- `MissedRewardVm`: `actualCard`, `betterCard`, `actualReward`, `potentialReward`, `missedReward`, `isDismissed`.

## Tables Involved

| Role | Tables |
|---|---|
| Primary writes | `finance.transactions` |
| Reward writes | `finance.transaction_reward_results`, `finance.missed_reward_events` |
| Plaid import | `finance.plaid_items`, `finance.plaid_accounts`, `finance.transactions` |
| Reads | `finance.user_cards`, `finance.merchants`, `catalog.categories`, `catalog.reward_rules`, `finance.card_reward_overrides`, `lookup.reward_currencies` |
| Dropdown/reference | `catalog.categories`, `lookup.reward_currencies` |
| Downstream | `insights.analytics_snapshots`, `messaging.notifications` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions` |

## Cache Strategy

- Cache transaction list/detail on mobile for fast tab/detail return; refresh on foreground or explicit pull-to-refresh.
- Plaid-imported transaction writes update DB first, then outbox consumers invalidate transaction, analytics, and missed-reward caches.
- Cache card and category dropdowns by default. New reference values must be DB-first, then server cache invalidation/update.
- Do not server-cache user transaction lists broadly; use per-user short TTL only if needed.
- Reward rule/category/reference reads may use server cache.

## Sync vs Async Decisions

- Transaction create/update/delete is synchronous for the user-visible saved state.
- Plaid transaction import runs daily as a scheduled job and can also be triggered by explicit user refresh. Import is idempotent by `plaid_transaction_id`.
- Reward result should be computed synchronously when cheap; analytics, AI eligibility, and notification side effects trail via durable outbox events.
- Plaid import should preserve user-edited app fields where possible, such as corrected card/category/location, while updating provider-owned fields like amount/date/merchant when Plaid sends changes.
- Analytics recomputation is async/read-model backed and belongs to `06-insights-analytics.md`.

## Invalidation Triggers

- `finance.transaction.created|updated|deleted|imported`: invalidate transaction list/detail, analytics summaries, missed rewards, AI insights eligibility.
- `finance.missed_reward.not_a_miss`: invalidate transaction detail, missed rewards, analytics, related notifications.
- Plaid transaction sync complete: invalidate transaction list, sync status, analytics, missed rewards.
- Card/reward/category changes: invalidate reward result and list rows that display earned/missed reward values.

## Loading And Error States

- Initial list: loading skeleton; empty state when no transactions exist.
- Search/filter: preserve previous results while refreshing.
- Create/update: field validation errors for missing amount, merchant, card, category, or invalid date/time.
- Plaid sync failure: keep existing imported transactions, show last sync time, and allow retry/reconnect from Plaid connection management.
- Delete/not-a-miss: optimistic UI allowed after success only; rollback on failure.
- Authorization/not found: return to list and show recoverable error.

## Design Gaps

None currently open.
