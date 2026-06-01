# 08. Profile And Preferences

## Scope

Phase 1 online workflow for Profile main and Edit profile. Covers profile details, app preferences, permission status, basic navigation entry points, biometric preference, and sign out handoff.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 8.1 | Profile | Account summary, linked areas, permissions, preferences, subscription, sign out |
| 8.2 | Edit profile | Display name, phone, region/currency, sign-in methods, biometric unlock |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can view their profile details | 8.1 | `GET /profile` |
| Full | User can see account initials, display name, and email | 8.1 | Initials derived client-side |
| Full | User can view current plan status | 8.1, 8.3 | Profile plus subscription/entitlements |
| Full | User can navigate to Plaid connection management from profile | 8.1, 5.4 | Navigation only here |
| Full | User can navigate to cards management from profile | 8.1, 5.1 | Navigation only here |
| Full | User can view and manage location permission status from profile | 8.1 | App permission state reported to API |
| Full | User can view camera permission status from profile | 8.1 | App permission state reported to API |
| Full | User can navigate to notification preferences from profile | 8.1, 7.3 | Notification workflow owns settings |
| Full | User can update display name | 8.2 | `POST /profile` |
| Full | User can update phone number | 8.2 | `POST /profile` |
| Full | User can update primary spending currency | 8.2 | `currencyCode` on profile, picked from `GET /api/v1/lookups/currencies` |
| Partial | User can view connected sign-in methods | 8.2 | Supabase Auth owns sign-in method list; mobile reads from Supabase session, not TrueSpend API |
| Partial | User can add phone OTP as a sign-in method | 8.2 | Supabase Auth flow; no TrueSpend API required |
| Full | User can enable or disable biometric unlock | 8.2 | Stored as preference; device enrollment is local |
| Partial | User can use biometric unlock when enabled | 8.2 | Device/local auth behavior |
| Full | User can change profile photo | 8.2 | Default is provider photo (Google/Apple); user upload via `POST /profile/avatar` writes to Supabase Storage and updates `avatar_url` |
| Partial | User can sign out from profile settings | 8.1 | Auth SDK action; no app API required |

## Preconditions

User is authenticated. Device has reported current permission states when possible.

## Primary API Sequence

1. Load profile tab: `GET /api/v1/profile`, `GET /api/v1/preferences`, `GET /api/v1/permissions`, `GET /api/v1/billing/subscription`, `GET /api/v1/entitlements`.
2. Open edit profile: reuse cached profile/preferences; refresh if stale.
3. Save profile fields: `POST /api/v1/profile`.
4. Save app preference fields: `POST /api/v1/preferences`.
5. Report permission state changes: `POST /api/v1/permissions`.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load profile summary | `GET /api/v1/profile` | `ProfileResponse`: `displayName`, `email`, `phone`, `avatarUrl`, `countryCode`, `currencyCode`, `currentPlanCode` | Sync API | None | Read `app.profiles`, `billing.countries`, `lookup.currencies` | Mobile persistent cache; refresh on app foreground |
| Load preferences | `GET /api/v1/preferences` | `PreferencesResponse`: `theme`, `locale`, `timezone`, `hideAmounts`, `biometricUnlockEnabled` | Sync API | None | Read `app.user_preferences` | Mobile persistent cache |
| Load permission states | `GET /api/v1/permissions` | `PermissionsResponse`: `location`, `camera`, `notifications`, `device`, `lastReportedAt` | Sync API | None | Read `app.user_permissions`, current `app.user_device_permissions`, `lookup.permission_states` | Mobile persistent cache; lookup cached by default |
| Load plan badge | `GET /api/v1/billing/subscription`, `GET /api/v1/entitlements` | `SubscriptionResponse`, `EntitlementsResponse` | Sync API | None | Read `billing.subscriptions`, `billing.plans`, `billing.plan_features` | Short mobile cache; server entitlement cache |
| Save profile | `POST /api/v1/profile` | `UpdateProfileRequest`: `displayName`, `phone`, `countryCode`, `currencyCode` -> `ProfileResponse` | Sync API + Event | `app.profile.updated` -> audit/analytics consumer if needed | Write `app.profiles`; read `billing.countries`, `lookup.currencies` | Update mobile profile cache after success |
| Upload profile photo | `POST /api/v1/profile/avatar` | multipart `file` -> `ProfileResponse` | Sync API | None | Upload to Supabase Storage; write `app.profiles.avatar_url` | Update mobile profile cache after success |
| Save preferences | `POST /api/v1/preferences` | `UpdatePreferencesRequest`: `theme`, `locale`, `timezone`, `hideAmounts`, `biometricUnlockEnabled` -> `PreferencesResponse` | Sync API | None | Write `app.user_preferences` | Update mobile preferences cache after success |
| Report permissions | `POST /api/v1/permissions` | `UpdatePermissionsRequest`: `deviceId`, `location.state`, `location.accuracy`, `camera.state`, `notifications.state`, `rawPlatformPayload` -> `PermissionsResponse` | Sync API | None | Write `app.user_device_permissions`; update `app.user_permissions`; read `lookup.permission_states` | Update mobile permissions cache; lookup cached |
| Navigate to related settings | Existing workflow APIs | Cards, Plaid, notification, billing workflows | Sync API | None | Owned by target workflow | Use target workflow cache |
| Sign out | Auth SDK / local session clear | Not in app API | Sync local/provider action | Optional `POST /api/v1/devices/delete` for push token cleanup | Update `messaging.devices` when token removed | Clear user-scoped mobile cache |

## Contracts Used

| Contract | Fields Used |
|---|---|
| `ProfileResponse` | `displayName`, `email`, `phone`, `avatarUrl`, `countryCode`, `currencyCode`, `currentPlanCode` |
| `UpdateProfileRequest` | `displayName`, `phone`, `countryCode`, `currencyCode` |
| `PreferencesResponse` / `UpdatePreferencesRequest` | `theme`, `locale`, `timezone`, `hideAmounts`, `biometricUnlockEnabled` |
| `PermissionsResponse` / `UpdatePermissionsRequest` | `deviceId`, `location`, `camera`, `notifications`, `rawPlatformPayload`, `lastReportedAt` |
| `SubscriptionResponse` | `planCode`, `status`, `trialEnd`, `currentPeriodEnd`, `cancelAtPeriodEnd` |
| `EntitlementsResponse` | `planCode`, `cardLinkLimit`, `aiInsightsEnabled`, `unlimitedCards` |

## Tables Involved

| Role | Tables |
|---|---|
| Profile/preferences | `app.profiles`, `app.user_preferences`, `app.user_permissions`, `app.user_device_permissions` |
| Billing badge | `billing.subscriptions`, `billing.plans`, `billing.plan_features`, `billing.features` |
| Reference/dropdown | `billing.countries`, `lookup.currencies`, `lookup.permission_states` |
| Avatar storage | Supabase Storage (URL persisted in `app.profiles.avatar_url`) |
| Device cleanup | `messaging.devices`, `lookup.device_platforms` |

## Cache Strategy

- Mobile persistent cache: profile, preferences, permissions, plan badge.
- Permission cache is replaced from the canonical response after per-device permission writes update the user-level summary.
- Server cache: entitlements and billing reference data.
- Dropdown/reference APIs, including countries/currencies/permission states, are cached by default; new reference values must be written to DB first, then cache invalidated/updated.

## Sync vs Async Decisions

- Profile, preference, and permission updates are synchronous because the UI needs immediate saved state.
- Sign out is local/Auth SDK driven; push token deletion can happen synchronously when network is available.
- Profile update may publish a lightweight audit/analytics event, but user-visible state must not depend on it.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| Profile update success | Mobile profile cache |
| Preference update success | Mobile preferences cache |
| Permission update success | Mobile permissions cache |
| Stripe webhook subscription update | Plan badge, entitlements, billing cache |
| Sign out | All user-scoped mobile caches |

## Loading And Error States

- Initial load: skeleton profile header and disabled settings rows.
- Save validation error: keep user edits and show field-level error.
- Permission denied/restricted: show OS state and deep-link to system settings.
- Billing load failure: show profile data and a retryable plan badge.
- Sign out failure for device cleanup: clear local auth session; retry token cleanup later if supported.

## Design Gaps

None currently open.
