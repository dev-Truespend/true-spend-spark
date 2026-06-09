# 10. Privacy And Data

## Scope

Phase 1 online workflow for privacy settings, data export, location history download/clear, account deletion request, and account deletion cancellation.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 8.4 | Privacy & data | Export, location history, privacy toggles, delete account |
| 6.3 | AI insights | Privacy toggle affects personalized AI insights |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can export personal data | 8.4 | Async export request/status |
| Full | User can download location history | 8.4 | Signed download URL |
| Full | User can clear location history | 8.4 | Async clear request/status |
| Full | User can control anonymous analytics | 8.4 | Privacy settings |
| Full | User can control personalized AI insights | 8.4 | Privacy settings |
| Full | User can opt out of personalized AI insights via the Privacy toggle | 8.4, 6.3 | Stops/gates AI generation |
| Full | User can request account deletion | 8.4 | Requires confirmation before API call; `purge_after = now + Privacy:DeletionGraceDays` (14) |
| Full | User can cancel pending account deletion | 8.4 | Cancel API |
| Full | User signing in during the grace window is offered reactivation | 1.x, 8.4 | Bootstrap returns `accountDeletion` when a pending request exists; app routes to the locked `AccountReactivationScreen` (Reactivate → cancel API + re-bootstrap, or Sign out) until reactivated or purge runs |
| Full | User can see sensitive account actions require confirmation | 8.4 | Client confirmation before destructive request |

## Preconditions

User is authenticated. Sensitive actions require explicit in-app confirmation before calling the API.

## Primary API Sequence

1. Load privacy screen: `GET /privacy-settings`, `GET /account-deletion`.
2. Toggle privacy setting: `POST /privacy-settings`.
3. Export data: `POST /data-export`, then poll `GET /data-export/{requestId}`.
4. Download location history: `GET /location-history/download`.
5. Clear location history: `POST /location-history/clear`, then poll `GET /location-history/clear/{requestId}`.
6. Delete account: `POST /account-deletion`; cancel pending deletion with `POST /account-deletion/cancel`.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load privacy settings | `GET /api/v1/privacy-settings` | `PrivacySettingsResponse`: analytics, AI, location history, data sharing toggles | Sync API | None | Read `privacy.settings` | Mobile persistent cache; refresh on foreground |
| Load deletion status | `GET /api/v1/account-deletion` | `AccountDeletionStatusResponse`: `status`, `requestedAt`, `purgeAfter` | Sync API | None | Read `privacy.account_deletion_requests` | Short mobile cache |
| Update privacy toggles | `POST /api/v1/privacy-settings` | `UpdatePrivacySettingsRequest` -> `PrivacySettingsResponse` | Sync API + Event | `privacy.settings.updated` -> audit/AI gating consumers | Write `privacy.settings`, `privacy.audit_events` | Update mobile cache; invalidate AI insight cache when disabled |
| Request data export | `POST /api/v1/data-export` | `RequestDataExportRequest.format` -> `DataExportStatusResponse` | Async Job | `privacy.data_export.requested` -> DataExportJob | Write `privacy.data_export_requests`, `privacy.audit_events`; read user domain tables | Do not cache export URL beyond expiry |
| Check export status | `GET /api/v1/data-export/{requestId}` | `DataExportStatusResponse`: `requestId`, `status`, `exportUrl`, `expiresAt` | Sync API | None | Read `privacy.data_export_requests` | Short status polling cache only |
| Download location history | `GET /api/v1/location-history/download` | `LocationHistoryResponse.downloadUrl` | Sync API | None | Read `finance.location_events` | Do not cache signed URL beyond expiry |
| Clear location history | `POST /api/v1/location-history/clear` | `ClearLocationHistoryRequest.deleteBefore` -> `LocationHistoryClearStatusResponse` | Async Job | `privacy.location_history_clear.requested` -> LocationHistoryClearJob | Write `privacy.location_deletion_requests`, `privacy.audit_events`; delete/read `finance.location_events` | Invalidate location-derived caches after completion |
| Check clear status | `GET /api/v1/location-history/clear/{requestId}` | `LocationHistoryClearStatusResponse`: `status`, `deletedEventCount` | Sync API | None | Read `privacy.location_deletion_requests` | Short status polling cache only |
| Request account deletion | `POST /api/v1/account-deletion` | Empty -> `AccountDeletionStatusResponse` | Sync API + Event | `privacy.account_deletion.requested` -> AccountDeletionPurgeJob after grace period | Write `privacy.account_deletion_requests`, `privacy.audit_events` | Invalidate account deletion status cache |
| Cancel deletion | `POST /api/v1/account-deletion/cancel` | Empty -> `AccountDeletionStatusResponse` | Sync API + Event | `privacy.account_deletion.cancelled` -> audit consumer | Write `privacy.account_deletion_requests`, `privacy.audit_events` | Invalidate account deletion status cache |

## Contracts Used

| Contract | Fields Used |
|---|---|
| `PrivacySettingsResponse` / `UpdatePrivacySettingsRequest` | `anonymousAnalyticsEnabled`, `personalizedAIInsightsEnabled`, `locationHistoryEnabled`, `dataSharingForImprovementEnabled` |
| `RequestDataExportRequest` | `format` |
| `DataExportStatusResponse` | `requestId`, `status`, `exportUrl`, `expiresAt` |
| `LocationHistoryResponse` | `downloadUrl` |
| `ClearLocationHistoryRequest` | `deleteBefore` |
| `LocationHistoryClearStatusResponse` | `requestId`, `status`, `deletedEventCount` |
| `AccountDeletionStatusResponse` | `status`, `requestedAt`, `purgeAfter` |

## Tables Involved

| Role | Tables |
|---|---|
| Privacy settings | `privacy.settings` |
| Export/delete jobs | `privacy.data_export_requests`, `privacy.location_deletion_requests`, `privacy.account_deletion_requests` |
| Audit | `privacy.audit_events` |
| Location data | `finance.location_events` |
| AI side effects | `insights.insight_generation_runs`, `insights.ai_insights` |

## Cache Strategy

- Privacy settings: mobile persistent cache; update after successful write.
- Export and clear status: short polling cache only.
- Signed download/export URLs: do not persist beyond `expiresAt`.
- Disabling personalized AI insights invalidates mobile/server AI insight caches and prevents future generation.

## Sync vs Async Decisions

- Privacy setting updates are synchronous because toggles must reflect saved state immediately.
- Data export and location clear are async jobs.
- Account deletion request is synchronous for status creation; hard purge is async after the grace period.
- Account deletion cancellation is synchronous while status is still pending.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| Privacy settings update | Mobile privacy cache |
| Personalized AI disabled | AI insights list/detail cache; pending personalized generation |
| Location history clear completed | Location history download/cache and location-derived recommendation context |
| Data export completed/expired | Export status cache |
| Account deletion requested/cancelled | Account deletion status cache |

## Loading And Error States

- Initial load: show cached privacy toggles disabled until refreshed if stale.
- Toggle failure: revert switch to previous saved state and show retry.
- Export/clear queued: show pending status and poll with backoff.
- Signed URL expired: request status/download again.
- Account deletion: require confirmation; show pending banner with cancel action.

## Design Gaps

| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Open | Async/Event Gap | API | Async jobs are represented by status APIs but consumer/job contracts are not defined | Document DataExportJob, LocationHistoryClearJob, and AccountDeletionPurgeJob | Workflow depends on async processing |
| Open | Contract Shape Issue | API | `GET /location-history/download` has no date range/format request | Add optional query or confirm all retained history is intended | Screen says last 90 days |
| Open | Missing Response Field | API | `AccountDeletionStatusResponse` lacks cancellation eligibility/error fields | Add `canCancel` or document status rules | UI shows pending deletion and cancel option |
