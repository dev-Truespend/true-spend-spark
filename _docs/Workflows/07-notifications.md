# Notifications Workflow

> **MVP execution note** — `NotificationCreated` is no longer published to the outbox. Producers call `INotificationsDispatchBusiness.DispatchPushAsync(notificationId)` (push + email) and `INotificationInboxCacheInvalidatorBusiness.InvalidateAsync(userId)` **inline post-commit**. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Progress

| User story | Status | Notes |
|---|---|---|
| User can view all notifications in the mobile app | Done | |
| User can filter notifications by all, unread, rewards, or security | Done | |
| User can mark all notifications as read | Done | |
| User can open a notification detail | Done | |
| User can see missed-reward detail from a notification | Done | MissedReward returned in detail response |
| User can compare the card used and the card that should have been used | Done | MissedReward.actualCard and betterCard in detail |
| User can see how many rewards were captured versus missed | Done | actualReward, potentialReward, missedReward in detail |
| User can set a future reminder from notification detail | Done | POST /notification-reminders |
| User can add a related reminder to the home screen | Done | ReminderFiringJob delivers as inbox notification at remind_at |
| User can view the related transaction from notification detail | Done | relatedTransaction in detail response |
| User can mark a missed-reward alert as not a miss | Done | Uses existing POST /missed-rewards/{id}/not-a-miss |
| User can enable or disable all notifications with a master setting | Done | |
| User can toggle push notifications | Done | |
| User can toggle email notifications | Done | |
| User can toggle best-card alerts | Done | UpdateNotificationTypePreference endpoint |
| User can toggle missed-rewards alerts | Done | UpdateNotificationTypePreference endpoint |
| User can toggle weekly summary notifications | Done | UpdateNotificationTypePreference endpoint |
| User can toggle unusual transaction notifications | Done | UpdateNotificationTypePreference endpoint |
| User can receive custom table-driven notifications | Done | Table-driven via messaging.notification_types |
| User can configure quiet hours for notifications | Done | |
| User can receive push notifications on iOS | Done | `expo-notifications` wired; device registers push token via `useRegisterDevice`/`ensurePushToken` |
| User can receive push notifications on Android | Done | `expo-notifications` wired with default channel; permission requested via `requestPushPermission` |
| User can recover from missing notification permissions | Done | Re-toggling push in settings re-requests permission via `useUpdateNotificationSettings` |

## Scope

Phase 1 online workflow for notification inbox, filters, detail, read state, missed-reward actions, reminders, notification settings, quiet hours, and push/email preferences.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 7.1 | Notifications | Inbox, filters, mark all read |
| 7.2 | Notification detail | Missed-rewards detail, reminder, transaction deep link |
| 7.3 | Notification settings | Channels, notification types, quiet hours |
| 6.2 | Transaction detail | Related transaction deep link |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can view all notifications in the mobile app | 7.1 |  |
| Full | User can filter notifications by all, unread, rewards, or security | 7.1 | `filter` query |
| Full | User can mark all notifications as read | 7.1 |  |
| Full | User can open a notification detail | 7.2 |  |
| Full | User can see missed-reward detail from a notification | 7.2 |  |
| Full | User can compare the card used and the card that should have been used | 7.2 | Related missed reward |
| Full | User can see how many rewards were captured versus missed | 7.2 |  |
| Full | User can set a future reminder from notification detail | 7.2 |  |
| Full | User can add a related reminder to the home screen | 7.2 | Delivered as a push notification at `remind_at` via `ReminderFiringJob` -> `messaging.notifications` -> `PushFanOutConsumer`; the reminder also lands in the inbox. No separate Home screen rendering. |
| Full | User can view the related transaction from notification detail | 7.2 | Opens 6.2 |
| Full | User can mark a missed-reward alert as not a miss | 7.2 | Uses missed-rewards API |
| Full | User can enable or disable all notifications with a master setting | 7.3 |  |
| Full | User can toggle push notifications | 7.3 |  |
| Full | User can toggle email notifications | 7.3 |  |
| Full | User can toggle best-card alerts | 7.3 |  |
| Full | User can toggle missed-rewards alerts | 7.3 |  |
| Full | User can toggle weekly summary notifications | 7.3 |  |
| Full | User can toggle unusual transaction notifications | 7.3 |  |
| Full | User can receive custom table-driven notifications | 7.1, 7.3 | `messaging.notification_types` |
| Full | User can configure quiet hours for notifications | 7.3 |  |
| Full | User can receive push notifications on iOS | 7.3 | Expo push token registered via `POST /api/v1/devices` |
| Full | User can receive push notifications on Android | 7.3 | Expo push token + default Android channel |
| Full | User can recover from missing notification permissions | 7.3 | Re-toggling push re-requests permission and re-registers the token |

## Preconditions

- User is authenticated.
- Device registration is completed for push delivery where push is enabled.
- Notification types are table-driven and cached as reference data.

## Primary API Sequence

1. Load inbox: `GET /api/v1/notifications?filter=all`.
2. Open detail: `GET /api/v1/notifications/{notificationId}` and optionally mark read.
3. Take detail action: create reminder, view transaction, or mark missed reward as not a miss.
4. Load settings: `GET /api/v1/notification-settings` and `GET /api/v1/notification-settings/types`.
5. Update settings/type preferences via notification settings APIs.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load inbox | `GET /api/v1/notifications?filter=` | `NotificationsResponse`: `notifications`. `filter` is one of `all`, `unread`, `rewards`, `security` (defaults to `all`) | Sync API | None | Read: `messaging.notifications`, `messaging.notification_types`, related transaction/missed IDs | Mobile memory/persistent inbox cache; short server per-user cache optional |
| Filter inbox | Same API | Query `filter` ∈ {`all`, `unread`, `rewards`, `security`} | Sync API | None | Same as inbox | Mobile memory cache by filter |
| Open detail | `GET /api/v1/notifications/{notificationId}` | `NotificationDetailResponse`: `notification`, `relatedTransaction`, `relatedMissedReward` | Sync API | None | Read: `messaging.notifications`, `finance.transactions`, `finance.missed_reward_events` | Mobile detail cache; refresh if opened from push |
| Mark one read | `POST /api/v1/notifications/{notificationId}/read` | Empty -> `NotificationsResponse` | Sync API + Event | Optional `messaging.notification.read` audit/product analytics | Update: `messaging.notifications` | Update cached inbox/detail unread state |
| Mark all read | `POST /api/v1/notifications/read-all` | Empty -> `NotificationsResponse` | Sync API + Event | Optional `messaging.notifications.read_all` audit/product analytics | Update: `messaging.notifications` | Replace cached inbox for all filters |
| View related transaction | `GET /api/v1/transactions/{transactionId}` | `TransactionDetailResponse` | Sync API | None | Read transaction detail tables | Uses transaction detail cache |
| Mark missed alert not a miss | `POST /api/v1/missed-rewards/{missedRewardId}/not-a-miss` | Empty -> `TransactionDetailResponse` | Sync API + Event | Produce `finance.missed_reward.not_a_miss` -> notification reconciliation, analytics refresh | Update: `finance.missed_reward_events`; related `messaging.notifications` may be updated by consumer | Invalidate notification detail/inbox, transaction detail, analytics |
| Create reminder | `POST /api/v1/notification-reminders` | `CreateNotificationReminderRequest` -> `NotificationRemindersResponse` | Sync API | `ReminderFiringJob` cron sweep ([notification-production.md](notification-production.md#producer-catalog)) picks up the row at `remind_at` and produces a `messaging.notifications` row, which fans out via `messaging.notification.created` -> `PushFanOutConsumer` | Write: `messaging.notification_reminders`; Read: `messaging.notifications` | Update reminders cache; no separate home cache (reminder delivers as push + inbox row) |
| Load settings | `GET /api/v1/notification-settings`; `GET /api/v1/notification-settings/types` | `NotificationSettingsResponse`; `NotificationTypesResponse` | Sync API | None | Read: `messaging.notification_preferences`, `messaging.notification_type_preferences`, `messaging.notification_types` | Mobile persistent settings; notification types cached by default on mobile + server |
| Update channel/quiet hours | `POST /api/v1/notification-settings` | `UpdateNotificationSettingsRequest` -> `NotificationSettingsResponse` | Sync API + Event | Optional `messaging.notification_preferences.updated` | Update: `messaging.notification_preferences` | Replace mobile settings cache; invalidate server user settings cache |
| Update type preference | `POST /api/v1/notification-settings/types` | `UpdateNotificationTypePreferenceRequest` -> `NotificationSettingsResponse`. Saved one toggle per call — settings screen fires this on each switch change. | Sync API + Event | Optional `messaging.notification_type_preference.updated` | Upsert: `messaging.notification_type_preferences`; Read: `messaging.notification_types` | Replace settings cache; keep type reference cache |
| Register push device | `POST /api/v1/devices` | `RegisterDeviceRequest` -> `DeviceResponse` | Sync API | None | Write/update: `messaging.devices`; Read: `lookup.device_platforms` | No durable client cache beyond local device id/token metadata |

## Contracts Used

- `NotificationVm`: `id`, `typeCode`, `title`, `body`, `isRead`, `createdAt`, `relatedTransactionId`, `relatedMissedRewardEventId`.
- `NotificationDetailResponse`: `notification`, `relatedTransaction`, `relatedMissedReward`.
- `NotificationSettingsResponse`: `masterEnabled`, `pushEnabled`, `emailEnabled`, `quietHoursEnabled`, `quietHoursStart`, `quietHoursEnd`, `types`.
- `NotificationTypeVm`: `code`, `displayName`, `enabled`.
- `CreateNotificationReminderRequest`: `sourceNotificationId`, `remindAt`, `title`, `body`.
- `RegisterDeviceRequest`: `platformCode`, `pushToken`, `deviceName`, `appVersion`, `osVersion`.

## Tables Involved

| Role | Tables |
|---|---|
| Inbox/detail | `messaging.notifications`, `messaging.notification_types` |
| Settings | `messaging.notification_preferences`, `messaging.notification_type_preferences` |
| Reminders | `messaging.notification_reminders` |
| Delivery/device | `messaging.devices`, `messaging.notification_deliveries` |
| Related domain data | `finance.transactions`, `finance.missed_reward_events`, `finance.transaction_reward_results` |
| Dropdown/reference | `messaging.notification_types`, `lookup.notification_channels`, `lookup.delivery_statuses`, `lookup.device_platforms` |

## Cache Strategy

- Cache inbox on mobile by filter; refresh on app foreground, push open, read-state writes, and pull-to-refresh.
- Cache notification settings persistently on mobile.
- Cache `GET /api/v1/notification-settings/types` by default on mobile and server.
- If a new notification type is added, write `messaging.notification_types` first, commit, then invalidate/update server cache.

## Sync vs Async Decisions

- Inbox/detail/settings reads are synchronous.
- Read state, settings changes, reminders, and not-a-miss actions return synchronously.
- Delivery fanout, reminder firing, notification creation from missed rewards, and analytics/audit side effects are async consumers.

## Invalidation Triggers

- `messaging.notification.created`: invalidate inbox and unread counts.
- `messaging.notification.read` or `messaging.notifications.read_all`: invalidate inbox filters and detail.
- `messaging.notification_preferences.updated`: invalidate notification settings.
- `messaging.notification_type_preference.updated`: invalidate settings and delivery eligibility cache.
- `finance.missed_reward.not_a_miss`: invalidate related notification detail/inbox and analytics.
- New notification type: invalidate server/mobile notification type cache.

## Loading And Error States

- Inbox: loading skeleton; empty state when no notifications exist for selected filter.
- Detail: show not-found/deleted fallback if notification no longer exists.
- Settings: disabled toggles while saving; restore prior value if save fails.
- Push permission missing: show platform permission recovery path; API settings may still save.
- Reminder create: validate future `remindAt`.

## Design Gaps

None currently open.
