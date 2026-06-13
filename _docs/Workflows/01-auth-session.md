# Auth And Session Workflow

## Scope

Phase 1 online auth/session behavior for splash, sign-in, OTP, deep-link return, session restore, first-login provisioning, routing to onboarding or home, expired auth recovery, and sign-out entry from profile. Supabase Auth owns provider authentication; TrueSpend APIs start after the mobile app has a valid Supabase session.

## Progress

| User story | Status | Notes |
|---|---|---|
| User can see the TrueSpend splash screen when opening the mobile app | Done |  |
| User can start sign-in from the welcome screen | Done |  |
| User can sign in with Apple from the mobile app | Done | **Native** flow (no browser): `expo-apple-authentication` sheet → identity token + nonce → `supabase.auth.signInWithIdToken({ provider: "apple" })`. Requires `ios.usesAppleSignIn` + Apple provider in Supabase. |
| User can sign in with Google from the mobile app | Done | **Native** flow (no browser): `@react-native-google-signin` → idToken → `supabase.auth.signInWithIdToken({ provider: "google" })`. Configured with `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Supabase-registered) + `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `_IOS_URL_SCHEME`. Replaced the browser OAuth (`signInWithOAuth` + `openExternalUrl`) which reused the system-browser cookie → wrong-account login, no Apple return, "open this app?" prompt. `signInWithProvider` returns the `Session` (or null on cancel); `useSignIn` calls `completeSignedInSession`. |
| User can sign in with phone OTP from the mobile app | Done |  |
| User can sign in with email OTP from the mobile app | Done |  |
| User can create a new passwordless account | Done |  |
| User can stay signed in across app restarts | Done | Session persists in SecureStore (Keychain/Keystore), which survives uninstall. On a fresh install (no AsyncStorage marker) `purgeSecureStorageIfFreshInstall` clears it with `signOut({ scope: "local" })` (network-free, so a stale/invalid token is dropped even offline) → reinstall lands on sign-in, not the previous account. |
| User can be redirected to onboarding after first sign-in | Done |  |
| User can be redirected to the home recommendation screen after onboarding | Done |  |
| User can recover from expired authentication | Done | Auto sign-out covers every "session no longer valid" path via one guarded `forceSignOut` (local-scope clear + route to login): (1) API `401` after a failed token refresh (axios interceptor → `unauthorizedHandler`); (2) Supabase `onAuthStateChange` `SIGNED_OUT` — fires when a background refresh fails because the account was **deleted/revoked** server-side; (3) on **foreground**, a server-side `supabase.auth.getUser()` check (cold-start `getSession` is a local read, so a deleted user's cached JWT looks valid until expiry) — auth API error → sign out, network error ignored. |
| User can complete email OTP deep links from mobile | Done |  |
| User can complete OAuth callback deep links from mobile | Done |  |
| User can use app navigation after returning from external auth | Done |  |
| User can see a loading state during sign-in | Done |  |
| User can sign out from profile settings | Done |  |

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 1.1 | Splash | Restore session and bootstrap app state |
| 1.2 | Sign in | Apple, Google, phone OTP, email OTP entry points |
| 1.3 | OTP entry | Submit one-time code and handle deep links |
| 8.1 | Profile | Sign-out entry point |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can see the TrueSpend splash screen when opening the mobile app | 1.1 | Session restore starts here |
| Partial | User can start sign-in from the welcome screen | 1.2 | Supabase Auth owns provider flow |
| Partial | User can sign in with Apple from the mobile app | 1.2 | OAuth handled by Supabase Auth |
| Partial | User can sign in with Google from the mobile app | 1.2 | OAuth handled by Supabase Auth |
| Partial | User can sign in with phone OTP from the mobile app | 1.2, 1.3 | OTP handled by Supabase Auth |
| Partial | User can sign in with email OTP from the mobile app | 1.2, 1.3 | OTP handled by Supabase Auth |
| Full | User can create a new passwordless account | 1.2, 1.3 | `POST /api/v1/auth/bootstrap` creates required app rows and returns initial state |
| Full | User can stay signed in across app restarts | 1.1 | Restore Supabase session, then run auth bootstrap |
| Full | User can be redirected to onboarding after first sign-in | 1.1, 1.2 | Based on onboarding state |
| Full | User can be redirected to the home recommendation screen after onboarding | 1.1 | Based on onboarding completion |
| Full | User can recover from expired authentication | 1.1, 1.2 | Clear session and return to sign-in |
| Partial | User can complete email OTP deep links from mobile | 1.3 | Deep link handled by Supabase Auth |
| Partial | User can complete OAuth callback deep links from mobile | 1.2 | Deep link handled by Supabase Auth |
| Full | User can use app navigation after returning from external auth | 1.2 | Bootstrap decides route |
| Full | User can see a loading state during sign-in | 1.2, 1.3 | Supabase auth plus auth bootstrap loading |
| Full | User can sign out from profile settings | 8.1 | Supabase session clear plus local cache clear |

## Preconditions

- Mobile app has Supabase Auth configuration for Apple, Google, email OTP, phone OTP, and deep links.
- TrueSpend APIs require `Authorization: Bearer <supabase_access_token>`.
- Auth bootstrap creates or finds user-scoped app rows and returns initial app state before routing.
- Auth bootstrap also creates or updates the current device row when device metadata is supplied.
- The backend derives the user id from the verified Supabase JWT subject; clients do not send a trusted `userId`.

## Primary API Sequence

```text
App launch
  Supabase Auth: restore local auth session
  If signed out: show 1.2
  If signed in:
    POST /api/v1/auth/bootstrap
    Route to onboarding if incomplete, otherwise Home

Sign in
  Apple/Google: native sheet -> ID token -> supabase.auth.signInWithIdToken (no browser/deep-link)
  Email/Phone OTP: native deep-link / code entry -> supabase.auth.verifyOtp
  -> completeSignedInSession -> POST /api/v1/auth/bootstrap
  Route to onboarding if incomplete, otherwise Home

Expired auth
  API returns 401
  Supabase Auth: refresh session or clear session
  Show sign-in if refresh fails
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Restore app session | Supabase Auth SDK | Supabase session/token | Sync API | None | `auth.users` | Mobile secure session cache |
| Auth bootstrap signed-in user | `POST /api/v1/auth/bootstrap` | `AuthBootstrapRequest`: optional `locale`, `timezone`, `countryCode`, `device` -> `AuthBootstrapResponse`: `profile`, `preferences`, `permissions`, `onboarding`, `entitlements`, `roles`, `deviceId` | Sync API | None | Create missing `app.profiles`, `app.user_preferences`, `app.user_permissions`, `app.onboarding_states`, `security.user_roles`; upsert `messaging.devices`; read `lookup.roles`, `lookup.device_platforms`, `billing.*`, `lookup.*` | Hydrate mobile profile, preferences, permissions, onboarding, entitlement, role, and device caches |
| Native provider sign-in (Apple/Google) | Native SDK `signInWithIdToken`, then `POST /api/v1/auth/bootstrap` | ID token (+ nonce for Apple), then bootstrap response above | Sync API | None | `auth.users`; app rows created by auth bootstrap | Replace session cache; hydrate all bootstrap caches |
| Complete OTP callback | Supabase Auth SDK, then `POST /api/v1/auth/bootstrap` | Supabase OTP verify / deep link, then bootstrap response above | Sync API | None | `auth.users`; app rows created by auth bootstrap | Replace session cache; hydrate all bootstrap caches |
| Recover expired auth | Any authenticated API may return `401` | Standard API error | Sync API | None | None unless refresh succeeds | Clear mobile caches on sign-out; refresh caches after token refresh |
| Sign out | Supabase Auth SDK | Supabase sign-out | Sync API | None | None | Clear secure session and user-scoped mobile caches |

## Contracts Used

- `AuthBootstrapRequest`
- `AuthBootstrapResponse`
- `ProfileResponse`
- `PreferencesResponse`
- `PermissionsResponse`
- `OnboardingResponse`
- `EntitlementsResponse`
- Supabase Auth session, OAuth callback, OTP verification, token refresh, and sign-out are owned by Supabase Auth and are outside `api-design-extended.md`.

## Tables Involved

| Role | Tables |
|---|---|
| Supabase auth | `auth.users` |
| Auth bootstrap provisioning | `app.profiles`, `app.user_preferences`, `app.user_permissions`, `app.onboarding_states`, `security.user_roles`, `messaging.devices`, `lookup.roles`, `lookup.device_platforms` |
| Auth bootstrap reads | `app.profiles`, `app.user_preferences`, `app.user_permissions`, `app.onboarding_states` |
| Billing and entitlement reads | `billing.subscriptions`, `billing.plans`, `billing.plan_features`, `billing.features`, `billing.countries` |
| Lookups | `lookup.onboarding_steps`, `lookup.permission_states`, `lookup.subscription_statuses` |

## Cache Strategy

- Mobile secure cache stores Supabase session tokens.
- Mobile persistent cache stores profile, preferences, permissions, onboarding state, entitlements, roles, and current `deviceId` from `POST /api/v1/auth/bootstrap`.
- Auth bootstrap owns initial signed-in hydration only; later profile, preference, permission, and onboarding changes use their own endpoints and update the matching mobile cache after success.
- Server cache may store entitlement results by user with short TTL.
- Lookup/reference data is cached by default; new reference values must be committed to DB before server cache update/invalidation.

## Sync vs Async Decisions

- Session restore, auth bootstrap, and route decision are synchronous.
- `POST /api/v1/auth/bootstrap` is idempotent and runs after successful Supabase sign-in/session restore before routing.
- Auth bootstrap may aggregate initial profile, preferences, permissions, onboarding, entitlements, and roles to reduce first-screen latency.
- Later workflow reads/writes remain separate endpoints by design for single-responsibility ownership.
- Sign-out is synchronous from the app perspective and clears local state immediately.

## Invalidation Triggers

| Trigger | Invalidation |
|---|---|
| Successful sign-in or token refresh | Run auth bootstrap; replace all bootstrap caches from response |
| Sign-out or unrecoverable `401` | Clear session and user-scoped mobile caches |
| Onboarding completion | Invalidate onboarding and route cache |
| Profile/preference/permission write | Invalidate matching mobile cache |
| `billing.subscription.updated` webhook | Invalidate entitlement and profile plan caches |

## Loading And Error States

- Splash shows restore/bootstrap loading.
- Sign-in and OTP screens show Supabase Auth loading.
- Expired auth retries token refresh once, then returns to sign-in.
- Auth bootstrap failure shows retry; `401` clears session.
- Missing onboarding state should route to onboarding start only after auth bootstrap succeeds.

## Design Gaps

| Gap | Owner | Notes |
|---|---|---|
| None currently open. |  |  |
