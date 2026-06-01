# 11. Sync Status

## Scope

Phase 1 workflow for the Sync status screen. Online behavior is primary; offline behavior is noted only where the Phase 1 screen and stories require it.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 8.5 | Sync & offline | Last sync, cached items, pending uploads, conflicts, recent events, retry |
| 6.1 | Insights transactions | Shows pending sync state for locally changed items |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Partial | User can open the mobile app while offline | 8.5 | Offline startup is minimized in this online-first guide |
| Partial | User can view cached data while offline | 8.5 | Cache behavior only |
| Full | User can see when data is waiting to sync | 8.5 | `GET /sync/status` |
| Full | User can see when sync succeeds | 8.5 | Recent sync events |
| Full | User can see when sync fails | 8.5 | Recent sync events/errors |
| Partial | User can see transactions while offline from local cache | 6.1, 8.5 | Transaction workflow owns list cache |
| Full | User can see pending sync status for offline-created or offline-edited items | 6.1, 8.5 | Status/counts/conflicts |

## Preconditions

User is authenticated and device is registered when push/sync device identity is needed.

## Primary API Sequence

1. Open sync status: `GET /api/v1/sync/status`.
2. Pull latest server changes: `GET /api/v1/sync/pull?cursor=`.
3. Push pending local changes: `POST /api/v1/sync/push`.
4. Load conflicts: `GET /api/v1/sync/conflicts`.
5. Resolve conflict: `POST /api/v1/sync/conflicts/{conflictId}/resolve`.
6. Retry sync: `POST /api/v1/sync/retry`, then refresh status.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load sync status | `GET /api/v1/sync/status` | `SyncStatusResponse`: `online`, `lastSyncAt`, `pendingCount`, `cachedCounts` (`SyncCachedEntityCountVm[]`), `recentEvents` (`SyncEventVm[]`) | Sync API | None | Read `sync.states`, `sync.outbox`, `sync.events`, `sync.conflicts`, `lookup.entity_types`, `lookup.event_types` | Mobile memory cache; refresh on screen focus |
| Pull server changes | `GET /api/v1/sync/pull?cursor=` | `SyncPullResponse`: `cursor`, `cards`, `transactions`, `notifications`, `notificationReminders` | Sync API | `sync.pull_completed` event recorded | Read domain tables; write `sync.states`, `sync.events` | Update mobile persistent caches for returned entities |
| Push pending changes | `POST /api/v1/sync/push` | `SyncPushRequest.changes` -> `SyncPushResponse`: `accepted`, `conflicts`, `cursor` | Sync API + Event | `sync.push_completed`, `sync.conflict_detected` | Write domain tables, `sync.outbox`, `sync.conflicts`, `sync.states`, `sync.events` | Invalidate changed entity caches |
| Load conflicts | `GET /api/v1/sync/conflicts` | `SyncConflictsResponse.conflicts` | Sync API | None | Read `sync.conflicts`, lookup tables | Mobile memory cache |
| Resolve conflict | `POST /api/v1/sync/conflicts/{conflictId}/resolve` | `ResolveConflictRequest`: `resolutionCode`, `mergedPayload` -> `SyncConflictsResponse` | Sync API + Event | Writes `sync.events` row with `event_type = 'conflict_resolved'` and publishes `sync.conflict_resolved` outbox event for entity-specific update handling | Write `sync.conflicts`, `sync.events`; update affected domain table | Invalidate affected entity cache |
| Retry sync | `POST /api/v1/sync/retry` | Empty -> `SyncStatusResponse` | Sync API + Event | `sync.retry_scheduled` or immediate retry handler | Read/write `sync.outbox`, `sync.events`, `sync.states` | Refresh sync status and affected caches |
| Reconnect provider from failure | Existing Plaid workflow API | Plaid connection contracts | Sync API / Webhook Driven | Provider-specific | `finance.plaid_items`, `finance.plaid_accounts` | Owned by cards/Plaid workflow |

## Contracts Used

| Contract | Fields Used |
|---|---|
| `SyncStatusResponse` | `online`, `lastSyncAt`, `pendingCount`, `cachedCounts` (`SyncCachedEntityCountVm[]`), `recentEvents` (`SyncEventVm[]`) |
| `SyncCachedEntityCountVm` | `entityType` (from `lookup.entity_types`), `count` |
| `SyncEventVm` | `type` (from `lookup.event_types`), `severity`, `message`, `occurredAt`, optional `action: { code, label }` |
| `SyncPullResponse` | `cursor`, `cards`, `transactions`, `notifications`, `notificationReminders` |
| `SyncPushRequest` | `changes` |
| `SyncPushResponse` | `accepted`, `conflicts`, `cursor` |
| `SyncConflictsResponse` | `conflicts` |
| `ResolveConflictRequest` | `resolutionCode`, `mergedPayload` |
| `SyncConflictVm` | Conflict item details when returned |

## Tables Involved

| Role | Tables |
|---|---|
| Sync state | `sync.states`, `sync.outbox`, `sync.conflicts`, `sync.events` |
| Device identity | `messaging.devices` |
| Sync lookups | `lookup.entity_types`, `lookup.operations`, `lookup.outbox_statuses`, `lookup.conflict_resolutions`, `lookup.event_types` |
| Synced entities | `finance.user_cards`, `finance.transactions`, `finance.card_reward_overrides`, `messaging.notifications`, `messaging.notification_reminders` |
| Provider status shown in events | `finance.plaid_items` |

## Cache Strategy

- Sync status is mobile memory cached and refreshed on screen focus or retry.
- Pull results update existing mobile persistent caches for cards, transactions, notifications, and reminders.
- Lookup APIs for sync entity types, operations, statuses, resolutions, and event types are cached by default.
- New lookup/reference values must be written to DB first, then server cache invalidated/updated.

## Sync vs Async Decisions

- Status, conflicts, and conflict resolution are synchronous user-facing calls.
- Pull/push can run synchronously from the Retry button, with events recorded for audit/status.
- Heavy entity-specific side effects after accepted changes can be event-backed by the owning workflow.
- Provider reconnect remains owned by the Plaid/cards workflow.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| Successful pull | Entity caches included in pull response |
| Accepted push changes | Affected entity caches and sync status |
| Conflict detected/resolved | Conflict list, affected entity cache, sync status |
| Retry completed | Sync status, recent events, affected entity caches |
| Plaid status change | Sync status recent events and cards/Plaid state |

## Loading And Error States

- Initial load: show last cached status while fetching.
- Offline: show cached data and disable network-only retry until online.
- Push conflict: show conflict row with resolve action.
- Retry failure: keep pending items visible and append recent error if returned.
- Provider failure: show reconnect action that routes to the Plaid/cards workflow.

## Design Gaps

None currently open.
