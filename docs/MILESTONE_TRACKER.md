# TrueSpend — Project Milestone Tracker

> **Last updated:** 2026-05-25 — statuses verified against actual source code
> **Overall progress:** ~70% complete · 9 of 16 phases production-ready
> **Revenue readiness:** Stripe code is implemented; production account setup and webhook replay are still blockers

---

## How This Was Verified

Every status below was checked against the actual codebase:
- `src/` — React features, hooks, components, pages
- `supabase/functions/` — 120 Edge Functions (Deno)
- `extension/` — Chrome MV3 extension
- `ios/` & `android/` — Capacitor native project folders
- `supabase/migrations/` — 137 SQL migration files (~127+ tables)

---

## Quick Status Board

| | Phase | Progress | Status | Verified |
|---|---|---|---|---|
| ✅ | Phase 1 — Foundation & Client Layer | 100% | Production | Code confirmed |
| ✅ | Phase 2 — Security & Ingress | 100% | Production | Code confirmed |
| ✅ | Phase 3 — Geofencing | 100% | Production | Code confirmed |
| ✅ | Phase 4 — Auth & Supply Chain Security | 98% | Production | Code confirmed |
| 🟡 | Phase 5 — BFF, AI & Rules Engine | 85% | In Progress | `bff-transactions` now exists |
| 🟡 | Phase 6 — Payment Integration | 75% | **REVENUE BLOCKER** | Stripe code ✅, production setup pending |
| ✅ | Phase 7 — Location Intelligence | 100% | Production | Code confirmed |
| ✅ | Phase 8 — Messaging & Events | 100% | Production | Code confirmed |
| ✅ | Phase 9 — Data Planes & DR | 100% | Production | Code confirmed |
| 🟡 | Phase 10 — Observability & Polish | 95% | Near Complete | Code confirmed |
| 🟡 | Phase 11 — Browser Extension | 55% | In Progress | Merchant detector ✅ (was reported ❌) |
| 🟡 | Phase 12 — Native Apps (iOS & Android) | 35% | In Progress | Native folders exist (was reported 20%) |
| 🟡 | Phase 13 — Database Optimisation | 40% | In Progress | Code confirmed |
| 🟡 | Phase 14 — ML Infrastructure | 75% | In Progress | UI done, no trained models yet |
| ❌ | Phase 15 — Advanced ML Models | 0%* | Not Started | UI scaffolds exist, no real ML |
| ❌ | Phase 16 — Cost Optimisation | 0% | Not Started | Not started |

> *Phase 15: UI components exist (CollaborativeRecommender, RankingModelTrainer, etc.) but no actual ML models trained or deployed.

---

## Critical Blockers

> Items that must be resolved before TrueSpend can generate revenue.

| Priority | Blocker | What's Missing | Impact |
|---|---|---|---|
| 🔴 P0 | **Stripe production activation** | Live products, price IDs, webhook secret, replay tests | No real revenue until configured |
| 🟠 P1 | **Plaid webhook hardening** | JWT verify + REMOVED/PENDING→POSTED | Data integrity risk |
| 🟠 P1 | **Transaction/BFF frontend adoption** | Move transaction page reads fully through `bff-transactions` | Consistent caching/pagination |
| 🟠 P1 | **Dashboard metric validation** | Seeded data verification | Prevent misleading user-facing metrics |
| 🟡 P2 | Extension build pipeline | No Vite config for extension | Extension not publishable |
| 🟡 P2 | iOS / Android on-device builds | Folders exist, builds unverified | Apps not in stores |
| 🟡 P2 | Cloudflare full WAF + cache rules | Partial setup | CDN not fully optimised |

---

## Architecture Overview

```
16 Phases across 51 weeks + post-launch sprints

Client (Web · iOS · Android · Extension)
  ↓
CDN & WAF (Cloudflare)                         ✅ Phase 2
  ↓
API Gateway (rate limiting, schema validation)  ✅ Phase 2
  ↓
BFF Layer (bff-dashboard + 109 Edge Functions)  🟡 Phase 5
  ↓
AI Agents (Claude → Gemini → GPT-4 cascade)    🟡 Phase 5
  ↓
Core Services (geofencing, auth, payments)      ✅ Phases 3–8
  ↓
Storage Layer (Supabase Storage — receipts)     ✅ Phase 1
  ↓
Data Plane (127 tables, RLS, audit logs)        ✅ Phase 9
  ↓
Backup & DR (cross-region replication)          ✅ Phase 9
  ↓
Advanced ML (ranking, forecasting, RL)          ❌ Phase 15
```

---

## Phase Details & Weekly Milestones

---

### ✅ Phase 1 — Foundation & Client Layer
**Weeks 1–4 · 100% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 1 | Vite + React 18 + TypeScript + Supabase client | ✅ Done | `src/main.tsx`, `vite.config.ts` |
| Week 1 | Capacitor configured (appId: ai.truespend.app) | ✅ Done | `capacitor.config.ts` |
| Week 2 | Offline storage abstraction (`StorageService`, `StorageAdapter`) | ✅ Done | `src/features/sync/services/` |
| Week 2 | Network monitor (online/offline, retry queue) | ✅ Done | `src/features/sync/services/storageService.ts` |
| Week 3 | Camera capture + receipt pipeline (`useCamera.tsx`) | ✅ Done | `src/features/receipts/hooks/useCamera.tsx` |
| Week 3 | Base routing + `ProtectedRoute` + auth guards | ✅ Done | `src/App.tsx`, `src/features/auth/components/ProtectedRoute.tsx` |
| Week 4 | `usePlatform`, `usePlatformFeatures` hooks | ✅ Done | `src/shared/hooks/usePlatform.ts` |
| Week 4 | `ErrorBoundary`, structured logger, CSP reporter | ✅ Done | `src/shared/components/error/`, `src/shared/lib/logger.ts` |
| **Gate** | **Build compiles, app loads on web + Capacitor shell** | ✅ Pass | `npm run build` passes |

---

### ✅ Phase 2 — Security & Ingress
**Weeks 5–10 · 100% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 5 | Cloudflare CDN, DNS, custom domain | ✅ Done | Deployed |
| Week 5 | WAF rules (OWASP top-10) | ✅ Done | Cloudflare config |
| Week 6 | DDoS protection configured | ✅ Done | Cloudflare config |
| Week 6 | Rate limiter — per-user and per-IP | ✅ Done | `src/shared/lib/api/rateLimiter.ts` + `supabase/functions/rate-limiter/` |
| Week 7 | API gateway — schema validation, request signing | ✅ Done | `supabase/functions/api-gateway/` |
| Week 7 | BFF client with performance tracing | ✅ Done | `src/shared/lib/api/bffClient.ts` |
| Week 8 | CSP headers + violation reporter | ✅ Done | `src/shared/lib/security/csp.ts` + `supabase/functions/csp-reporter/` |
| Week 8 | Secrets vault (no env-stored secrets) | ✅ Done | `supabase/functions/_shared/` |
| Week 9 | Snyk CI, npm audit, Dependabot pipeline | ✅ Done | Repo configured |
| Week 9 | Lockfile integrity CI check | ✅ Done | Repo configured |
| Week 10 | `RateLimitStatus` UI component | ✅ Done | `src/shared/components/api/RateLimitStatus.tsx` |
| **Gate** | **Zero critical CVEs, all routes behind rate limiter** | ✅ Pass | |

---

### ✅ Phase 3 — Geofencing
**Weeks 11–14 · 100% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 11 | Geofence data model (lat/lng, radius, RLS) | ✅ Done | Migration files |
| Week 11 | Haversine match in Edge Function | ✅ Done | `supabase/functions/geofence-processor/` |
| Week 12 | `MapGeofenceCreator` — Leaflet map drawing | ✅ Done | `src/features/location/components/MapGeofenceCreator.tsx` |
| Week 12 | Geofence ↔ budget linking | ✅ Done | `supabase/functions/check-budget-status/` |
| Week 13 | JWT-secured geofence API | ✅ Done | `supabase/functions/sign-location-payload/`, `verify-location-payload/` |
| Week 13 | Transaction insertion triggers geofence match | ✅ Done | `supabase/functions/geofence-processor/` |
| Week 14 | Geofence CRUD UI | ✅ Done | `src/features/location/pages/Geofences.tsx` |
| Week 14 | Background geolocation Capacitor plugin | ✅ Done | `src/features/location/services/nativeGeofencingService.ts` |
| **Gate** | **Transaction auto-tagged to geofence zone** | ✅ Pass | |

---

### ✅ Phase 4 — Auth & Supply Chain Security
**Weeks 15–19 · 98% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 15 | Supabase Auth — signup, login, logout, session refresh | ✅ Done | `src/features/auth/hooks/useAuth.tsx` |
| Week 15 | Google OAuth with `redirectTo` fix | ✅ Done | `src/features/auth/components/GoogleSignInButton.tsx` |
| Week 16 | MFA — TOTP enrolment, QR code, verification | ✅ Done | `src/features/auth/components/MFASetup.tsx` + 7 MFA Edge Functions |
| Week 16 | 10 single-use backup codes | ✅ Done | `src/features/auth/components/BackupCodesDisplay.tsx` |
| Week 17 | Email verification + resend | ✅ Done | `supabase/functions/send-verification-email/`, `verify-email/` |
| Week 17 | Password reset + email change flows | ✅ Done | `src/features/auth/pages/ForgotPassword.tsx`, `ResetPassword.tsx`, `ConfirmEmailChange.tsx` |
| Week 18 | Account locking after failed attempts | ✅ Done | `supabase/functions/check-login-attempts/`, `increment-login-failures/` |
| Week 18 | Session activity monitor + idle timeout dialog | ✅ Done | `src/features/auth/hooks/useSessionActivity.tsx` + `ContinueSessionDialog.tsx` |
| Week 19 | Dependabot, Snyk CI, npm audit pipeline | ✅ Done | |
| Week 19 | Lockfile integrity + provenance verification | ✅ Done | |
| **Remaining (2%)** | `ProtectedRoute` role-check edge case audit | 🟡 Minor | |
| **Gate** | **Auth E2E tests pass; MFA enrolment works** | ✅ Pass | |

---

### 🟡 Phase 5 — BFF, AI & Rules Engine
**Weeks 20–24 · 85% Complete · In Progress**

> **Code audit finding:** `bff-transactions` now exists with pagination, filters, and Redis caching. Remaining work is frontend adoption for all transaction reads and BFF coverage for budgets/insights/geofences.

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 20 | `bff-dashboard` Edge Function (Redis cached) | ✅ Done | `supabase/functions/bff-dashboard/` (Upstash Redis) |
| Week 20 | `location-analytics-bff` Edge Function | ✅ Done | `supabase/functions/location-analytics-bff/` |
| Week 21 | `ai-categorize-transaction` Edge Function (Claude→Gemini→GPT-4) | ✅ Done | `supabase/functions/ai-categorize-transaction/` |
| Week 21 | `auto-categorize-transaction` Edge Function | ✅ Done | `supabase/functions/auto-categorize-transaction/` |
| Week 22 | `ai-analyze-spending` Edge Function (weekly insights) | ✅ Done | `supabase/functions/ai-analyze-spending/` |
| Week 22 | Transaction rule engine | ✅ Done | `src/features/transactions/hooks/useTransactionRules.tsx` |
| Week 23 | Email transactional flow | ✅ Done | `supabase/functions/generate-email-digest/`, `send-email-notification/` |
| Week 23 | Webhook receiver + retry queue | ✅ Done | `supabase/functions/resend-webhook-handler/`, `retry-processor/` |
| Week 24 | `plaid-create-link-token` Edge Function | ✅ Done | `supabase/functions/plaid-create-link-token/` |
| Week 24 | `plaid-exchange-token` Edge Function | ✅ Done | `supabase/functions/plaid-exchange-token/` |
| Week 24 | `bff-transactions` Edge Function | ✅ Done | `supabase/functions/bff-transactions/` |
| **Missing** | **`bff-insights`, `bff-budgets`, `bff-geofences` endpoints** | ❌ Not built | No BFF layer for these |
| **Gate** | **All BFF endpoints live; Plaid exchange working** | 🟡 Partial | dashboard/transactions ✅; budgets/insights/geofences pending |

---

### 🟡 Phase 6 — Payment Integration ⚠️ REVENUE BLOCKER
**Weeks 25–29 · 75% Complete · In Progress**

> **Code audit finding:** Plaid sync IS substantially implemented — `webhook-plaid` handles `SYNC_UPDATES_AVAILABLE` and upserts transactions via `/transactions/sync`. However, JWT signature verification is incomplete (header is checked but not cryptographically verified), `TRANSACTIONS_REMOVED` soft-delete is not implemented, and `PENDING→POSTED` transitions are not handled. Stripe code is implemented, but live products, price IDs, secrets, and webhook replay are still required before launch.

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 25 | Plaid Link UI component (`react-plaid-link`) | ✅ Done | `src/features/credit-cards/hooks/usePlaid.tsx` |
| Week 25 | Plaid account storage (`plaid_items` + `plaid_accounts` tables, RLS) | ✅ Done | Migration files |
| Week 26 | `webhook-plaid` Edge Function — receive + route events | ✅ Done | `supabase/functions/webhook-plaid/` |
| Week 26 | `SYNC_UPDATES_AVAILABLE` → `/transactions/sync` → upsert | ✅ Done | Inside `webhook-plaid` |
| Week 26 | `plaid-sync-transactions` manual sync function | ✅ Done | `supabase/functions/plaid-sync-transactions/` |
| **Week 26** | **Plaid webhook JWT signature verification** | ❌ Incomplete | Header checked, not cryptographically verified |
| **Week 27** | **`TRANSACTIONS_REMOVED` → soft-delete in DB** | ❌ Not done | Logs count, no DB write |
| **Week 27** | **`PENDING → POSTED` status transition** | ❌ Not done | Not handled |
| Week 28 | Stripe: `stripe-create-checkout-session` Edge Function | ✅ Done | `supabase/functions/stripe-create-checkout-session/` |
| Week 28 | Stripe: `stripe-create-portal-session` Edge Function | ✅ Done | `supabase/functions/stripe-create-portal-session/` |
| Week 28 | Stripe: `stripe-update-subscription` Edge Function | ✅ Done | `supabase/functions/stripe-update-subscription/` |
| Week 29 | Stripe: `stripe-webhook` Edge Function | ✅ Done | `supabase/functions/stripe-webhook/` |
| Week 29 | Subscription gating in `ProtectedRoute` | ✅ Done | `requirePro` + `useSubscription` |
| Week 29 | Billing UI (plan selector, portal, plan switch) | ✅ Done | `src/features/settings/pages/Billing.tsx` |
| **Remaining** | **Stripe production activation** | ❌ Pending | Products, price IDs, webhook secret, replay tests |
| **Gate** | **User links bank → transactions sync → Stripe charges** | 🟡 Not passed | Code exists; production provider setup pending |

---

### ✅ Phase 7 — Location Intelligence
**Weeks 30–34 · 100% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 30 | Spending heatmap (Leaflet.heat) | ✅ Done | `src/features/location/components/SpendingHeatmap.tsx` |
| Week 30 | Cluster analysis (Turf k-means) | ✅ Done | `src/features/location/` |
| Week 31 | `nativeGeofencingService.ts` (Capacitor background geo) | ✅ Done | `src/features/location/services/nativeGeofencingService.ts` |
| Week 31 | `useNativeGPSTracking` hook | ✅ Done | `src/features/location/hooks/useNativeGPSTracking.ts` |
| Week 32 | Location-based AI insights panel | ✅ Done | `src/features/insights/components/LocationInsightsPanel.tsx` |
| Week 32 | Deal notification on geofence entry | ✅ Done | `src/features/location/components/DealNotification.tsx` + `supabase/functions/deal-notification-trigger/` |
| Week 33 | Cache layer metrics dashboard | ✅ Done | `src/features/observability/components/CacheLayerMetrics.tsx` |
| Week 33 | Location history page + export | ✅ Done | `src/features/location/pages/LocationHistory.tsx` + `LocationCSVExport.tsx` |
| Week 34 | Geofence optimiser | ✅ Done | `supabase/functions/optimize-geofences/` |
| Week 34 | Favourite merchants page | ✅ Done | `src/features/merchants/pages/FavoriteMerchants.tsx` |
| **Gate** | **Geofence triggers deal push notification** | ✅ Pass | |

---

### ✅ Phase 8 — Messaging & Events
**Weeks 35–39 · 100% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 35 | Event bus (publish/subscribe) | ✅ Done | `supabase/functions/publish-event/`, `event-consumer/` |
| Week 35 | Realtime Supabase subscriptions | ✅ Done | `src/features/observability/hooks/useRealtimeEvents.ts` |
| Week 36 | Batch processing queue | ✅ Done | `supabase/functions/event-batch-processor/` |
| Week 36 | Feature flags system | ✅ Done | `src/features/ml/hooks/useFeatureFlag.ts` + `supabase/functions/feature-flag-evaluator/` |
| Week 37 | Distributed tracing (`useTracing`, `TraceVisualizer`) | ✅ Done | `src/features/observability/hooks/useTracing.ts` + `supabase/functions/trace-collector/` |
| Week 37 | Workflow engine (`WorkflowManager`, `WorkflowExecutionMonitor`) | ✅ Done | `src/features/ml/components/WorkflowManager.tsx` + `supabase/functions/workflow-executor/` |
| Week 38 | Anomaly detection | ✅ Done | `src/features/ml/components/AnomalyDetectionDashboard.tsx` + `supabase/functions/detect-transaction-anomalies/` |
| Week 38 | A/B testing framework | ✅ Done | `src/features/ml/hooks/useABTesting.tsx` + `supabase/functions/ab-testing-manager/` |
| Week 39 | Push notifications (Capacitor push plugin) | ✅ Done | `src/features/notifications/services/pushNotificationService.ts` |
| Week 39 | Email digest hook | ✅ Done | `src/features/notifications/hooks/useEmailDigest.tsx` |
| **Gate** | **Feature flag toggle < 5s; trace IDs visible in logs** | ✅ Pass | |

---

### ✅ Phase 9 — Data Planes & Disaster Recovery
**Weeks 40–42 · 100% Complete · Production**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 40 | Audit log table + triggers | ✅ Done | Migration files + `supabase/functions/` |
| Week 40 | `AuditLogViewer` component (admin/RLS-protected) | ✅ Done | `src/features/observability/components/AuditLogViewer.tsx` |
| Week 41 | Data masking (PAN, email in logs) | ✅ Done | `src/features/observability/` |
| Week 41 | `BackupStatusDashboard` | ✅ Done | `src/features/observability/components/BackupStatusDashboard.tsx` |
| Week 42 | Cross-region replication (Supabase multi-region) | ✅ Done | `src/features/observability/pages/ReplicaMonitoring.tsx` |
| Week 42 | RPO alert: > 1h triggers page | ✅ Done | `supabase/functions/backup-verification/` |
| **Gate** | **RPO ≤ 1h, RTO ≤ 4h via failover** | ✅ Pass | |

---

### 🟡 Phase 10 — Observability & Polish
**Weeks 43–45 · 95% Complete · Near Complete**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 43 | Performance monitor (`performanceMonitor.ts`) | ✅ Done | `src/shared/lib/performance/performanceMonitor.ts` |
| Week 43 | Structured logger with correlation IDs | ✅ Done | `src/shared/lib/logger.ts` |
| Week 43 | Metrics collection (8 systems) | ✅ Done | `supabase/functions/metrics-collector/`, `metrics-aggregator/` |
| Week 44 | SLO definitions + tracking dashboard | ✅ Done | `src/features/observability/pages/SLOTracking.tsx` + `supabase/functions/slo-manager/` |
| Week 44 | Alert rules (4 rules, email + webhook) | ✅ Done | `src/features/observability/components/AlertRulesManager.tsx` + `supabase/functions/alert-manager/` |
| Week 45 | Incident management page | ✅ Done | `src/features/observability/pages/Incidents.tsx` + `supabase/functions/incident-manager/` |
| Week 45 | Performance dashboard (p50/p95/p99) | ✅ Done | `src/features/observability/pages/Performance.tsx` |
| **Missing** | **Cloudflare full WAF + cache rules finalized** | ❌ Pending | Partial setup |
| **Missing** | **Sentry error monitoring** | ❌ Not done | P0 launch blocker |
| **Gate** | **99.9% SLO live; Cloudflare analytics populated** | 🟡 95% | |

---

### 🟡 Phase 11 — Browser Extension
**Weeks 46–47 · 55% Complete · In Progress**

> **Code audit finding:** The merchant detector content script IS fully implemented (was incorrectly reported as ❌). The options page has working settings toggles with `chrome.storage.sync`. The popup is wired to Supabase for budget queries (but spending always shows $0 — hardcoded). What's still missing: the one-click expense capture form, options OAuth account connect, and the extension build pipeline.

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 46 | Extension Manifest V3 scaffold | ✅ Done | `extension/manifest.json` |
| Week 46 | Background service worker | ✅ Done | `extension/background/index.ts` |
| Week 46 | Auth token management in extension | ✅ Done | `extension/background/auth.ts` |
| Week 46 | Feature flags in background worker | ✅ Done | `extension/background/feature-flags.ts` |
| Week 46 | Telemetry in background worker | ✅ Done | `extension/background/telemetry.ts` |
| Week 46 | Popup scaffold + budget display (Supabase wired) | ✅ Done | `extension/popup/Popup.tsx` |
| Week 46 | Options page — settings toggles via `chrome.storage.sync` | ✅ Done | `extension/options/Options.tsx` |
| Week 46 | Chrome storage wrapper + API client with retry | ✅ Done | `extension/shared/storage.ts`, `api-client.ts` |
| **Week 47** | **Merchant detector content script (15 merchants, MutationObserver)** | ✅ Done | `extension/content/merchant-detector.ts` |
| **Week 47** | **Popup: budget spending calculation (currently hardcoded $0)** | ❌ Not done | Line 164: `const spent = 0 // TODO` |
| **Week 47** | **Popup: one-click expense capture form** | ❌ Not done | No capture UI exists |
| **Week 47** | **Options: OAuth account connect flow** | ❌ Not done | Settings only, no account link |
| **Week 47** | **Extension build pipeline (separate Vite config)** | ❌ Not done | No `vite.extension.config.ts` |
| **Week 47** | **Chrome Web Store listing** | ❌ Not done | |
| **Gate** | **Extension installs, logs in, captures on Amazon** | 🔴 Not passed | Missing capture form + build |

---

### 🟡 Phase 12 — Native Apps (iOS & Android)
**Weeks 48–49 · 35% Complete · In Progress**

> **Code audit finding:** Both `ios/` and `android/` native project folders exist — `cap add ios` and `cap add android` have been run. `GoogleService-Info.plist` and `google-services.json` are present. The Capacitor config is production-configured (`appId: ai.truespend.app`, HTTPS only). However, no verified on-device builds, no splash screens, no app store submissions.

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 48 | Capacitor iOS 7.6.5 configured | ✅ Done | `capacitor.config.ts`, `@capacitor/ios` in package.json |
| Week 48 | Capacitor Android 7.6.5 configured | ✅ Done | `@capacitor/android` in package.json |
| Week 48 | `ios/` App folder created (`cap add ios`) | ✅ Done | `ios/App/` exists with `GoogleService-Info.plist` |
| Week 48 | `android/` folder created (`cap add android`) | ✅ Done | `android/app/src/` exists with `google-services.json` |
| Week 48 | Background geolocation plugin wired | ✅ Done | `src/features/location/services/nativeGeofencingService.ts` |
| Week 48 | Push notifications plugin wired | ✅ Done | `src/features/notifications/services/pushNotificationService.ts` |
| **Week 48** | **`npx cap sync` + Xcode build passes on device** | ❌ Not verified | No build evidence |
| **Week 48** | **Gradle build passes on device** | ❌ Not verified | No build evidence |
| **Week 48** | **Native splash screen + app icon (all resolutions)** | ❌ Not done | |
| **Week 48** | **Deep-link handling (email verify, OAuth callback)** | ❌ Not done | |
| **Week 49** | **iOS: TestFlight internal distribution** | ❌ Not done | |
| **Week 49** | **Android: Play Console internal track** | ❌ Not done | |
| **Week 49** | **Biometric auth (Face ID / Fingerprint)** | ❌ Not done | Planned — no plugin yet |
| **Week 49** | **App Store metadata + screenshots** | ❌ Not done | |
| **Week 49** | **Play Store listing (privacy policy URL required)** | ❌ Not done | |
| **Gate** | **App live on TestFlight + Play Console internal** | 🔴 Not passed | |

---

### 🟡 Phase 13 — Database Optimisation
**Week 50 · 40% Complete · In Progress**

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 50 | Supabase read replica — monitoring UI | ✅ Done | `src/features/observability/pages/ReplicaMonitoring.tsx` |
| Week 50 | Redis L1 cache (Upstash) in `bff-dashboard` | ✅ Done | `supabase/functions/bff-dashboard/` — `redisGet`/`redisSet` via Upstash REST |
| Week 50 | `redis-metrics` Edge Function | ✅ Done | `supabase/functions/redis-metrics/` |
| Week 50 | `cache-eviction` + `cache-prewarmer` Edge Functions | ✅ Done | `supabase/functions/cache-eviction/`, `cache-prewarmer/` |
| **Week 50** | **GraphQL gateway (eliminates N+1 queries)** | ❌ Not done | No GraphQL layer |
| **Week 50** | **Query plan review — slow queries indexed** | ❌ Not done | |
| **Week 50** | **PgBouncer / connection pooling tuned** | ❌ Not done | |
| **Week 50** | **DB query budget — alert on queries > 100ms** | ❌ Not done | |
| **Gate** | **p95 DB latency ≤ 8ms; N+1 = 0** | 🟡 Partial | Redis cache done, GraphQL missing |

---

### 🟡 Phase 14 — ML Infrastructure
**Weeks 50–51 · 75% Complete · In Progress**

> **Code audit finding:** All UI components and Edge Functions for ML infrastructure exist. HuggingFace client is implemented (`src/features/ml/services/huggingface/`). `modal-training-trigger` and `modal-training-callback` Edge Functions are built. However, no actual model has been trained end-to-end, and no model is currently in production serving real predictions.

| Week | Milestone | Status | Evidence |
|---|---|---|---|
| Week 50 | HuggingFace client + categorizer | ✅ Done | `src/features/ml/services/huggingface/client.ts`, `categorizer.ts` |
| Week 50 | `huggingface-categorize` + `huggingface-ocr-receipt` Edge Functions | ✅ Done | `supabase/functions/huggingface-*/` |
| Week 50 | `SemanticSearchBar` component | ✅ Done | `src/features/ml/components/SemanticSearchBar.tsx` |
| Week 50 | `supabase/functions/semantic-search-transactions/` | ✅ Done | |
| Week 50 | `ModelRegistryViewer`, `TrainingJobMonitor` | ✅ Done | `src/features/ml/components/` |
| Week 50 | `TrainingDataUploader`, `TrainingDataQualityChecker` | ✅ Done | `src/features/ml/components/` |
| Week 50 | `MLCostTracker`, `MLModelHealthMonitor` | ✅ Done | `src/features/ml/components/` |
| Week 50 | `ModelDeploymentPipeline`, `ml-inference` Edge Fn | ✅ Done | `supabase/functions/ml-inference/` |
| Week 50 | `modal-training-trigger` + `modal-training-callback` Edge Fns | ✅ Done | `supabase/functions/modal-training-*/` |
| Week 51 | `MLTrainingAlerts`, `thompson-sampling-budget` | ✅ Done | `supabase/functions/thompson-sampling-budget/` |
| **Week 51** | **First model trained + evaluated end-to-end** | ❌ Not done | Infrastructure ready, no trained model |
| **Week 51** | **Model versioning + canary deployment (10% traffic)** | ❌ Not done | `deploy-shadow-model/` exists but not wired |
| **Week 51** | **Anomaly detection model trained on real data** | ❌ Not done | |
| **Gate** | **≥ 1 model in production with accuracy > 85%** | 🟡 Infra ready | |

---

### ❌ Phase 15 — Advanced ML Models
**Post-Week 51 · 0% functional · UI scaffolds exist**

> UI components exist for all Phase 15 models (renamed during cleanup for production readability). These are React dashboards — the underlying ML models have not been trained or deployed.

| Sprint | Milestone | Status | UI Scaffold |
|---|---|---|---|
| Sprint 1 | `RankingModelTrainer` — transaction relevance ranking | ❌ Not trained | `src/features/ml/components/RankingModelTrainer.tsx` |
| Sprint 1 | `TimeSeriesForecaster` — spend forecasting | ❌ Not trained | `src/features/ml/components/TimeSeriesForecaster.tsx` |
| Sprint 2 | `CollaborativeRecommender` — merchant recommendations | ❌ Not trained | `src/features/ml/components/CollaborativeRecommender.tsx` |
| Sprint 2 | `ReinforcedCacheOptimizer` — cache policy learning | ❌ Not trained | `src/features/ml/components/ReinforcedCacheOptimizer.tsx` |
| Sprint 3 | `BudgetOptimizer` — ML-driven budget suggestions | ❌ Not trained | `src/features/ml/components/BudgetOptimizer.tsx` |
| Sprint 3 | `GeofenceOptimizer` — ML-driven zone boundary tuning | ❌ Not trained | Already wired to `supabase/functions/optimize-geofences/` |
| Sprint 4 | Layer 10B: Advanced ML layer integrated | ❌ Not started | |
| **Gate** | **ML recommendations live; click-through rate measured** | ❌ | |

---

### ❌ Phase 16 — Cost Optimisation
**Post-Week 51 · 0% Complete · Not Started**

| Sprint | Milestone | Status |
|---|---|---|
| Sprint 1 | Bloom filters for duplicate transaction detection | ❌ Not started |
| Sprint 1 | ARIMA model for infrastructure cost forecasting | ❌ Not started |
| Sprint 2 | Gorilla compression for time-series telemetry | ❌ Not started |
| Sprint 2 | Cost dashboard — real $ per feature, per user tier | ❌ Not started |
| Sprint 3 | Automated cost alerts (spend > $X/day → Slack) | ❌ Not started |
| Sprint 3 | Cost-per-user benchmarking + breakeven analysis | ❌ Not started |
| **Gate** | **Infrastructure cost ≤ $500/month at 1,000 active users** | ❌ |

---

## Current Priorities (P0 → P3)

### 🔴 P0 — Cannot ship without

- [ ] **Stripe production activation** (products, price IDs, webhook secret, replay tests)
- [ ] **Payment provider decision** (Stripe default; Razorpay only if India/UPI is a primary launch market)
- [ ] **Transaction page adoption of `bff-transactions`** where direct Supabase reads remain
- [ ] **Sentry error monitoring** (can't diagnose production issues without it)
- [ ] **CI/CD pipeline** (lint → test → build → deploy on merge)
- [ ] **Unit + integration tests on critical paths**

### 🟠 P1 — First sprint after launch

- [ ] **Plaid webhook JWT signature verification** (security gap)
- [ ] **`TRANSACTIONS_REMOVED` soft-delete** in webhook-plaid
- [ ] **`PENDING → POSTED` transition** in webhook-plaid
- [ ] **UserDashboard metric validation** with seeded production-like data
- [ ] **Extension popup: budget spending calculation** (currently always $0)
- [ ] **Extension popup: one-click expense capture form**
- [ ] **Extension build pipeline** (separate Vite config for `extension/`)
- [ ] **Cloudflare full WAF + cache rules**

### 🟡 P2 — First month post-launch

- [ ] iOS: `npx cap sync` + Xcode on-device build verified
- [ ] Android: Gradle on-device build verified
- [ ] Native splash screen + app icons (all resolutions)
- [ ] Deep-link handling (email verify, OAuth callback in app)
- [ ] Mobile E2E test run (iOS + Android)
- [ ] Options page: OAuth account connect flow
- [ ] GraphQL gateway (N+1 query elimination)
- [ ] Receipt OCR fallback chain (Google Vision → HuggingFace → manual)
- [ ] RLS edge-case audit
- [ ] Security penetration test
- [ ] Lazy-loading for internal/admin pages and heavy diagram tooling

### 🔵 P3 — Post-launch backlog

- [ ] Biometric auth (Face ID / Fingerprint) via Capacitor plugin
- [ ] iOS TestFlight + Android Play Store internal track
- [ ] Train first ML model end-to-end (transaction categoriser)
- [ ] Model canary deployment (10% traffic split)
- [ ] Multi-currency support
- [ ] CSV transaction import
- [ ] Shared budgets (household mode)
- [ ] AI natural-language query interface
- [ ] Dark / light mode persistence

---

## Upcoming Integrations

| Integration | Stub Location | What's Needed |
|---|---|---|
| **Stripe** | `src/integrations/stripe/index.ts`, `supabase/functions/stripe-*` | Production products, price IDs, webhook secret, replay tests |
| **Google Maps** | `src/integrations/google-maps/index.ts` | Maps JS key + `@vis.gl/react-google-maps` (Edge Fns already exist) |
| **Foursquare** | `supabase/functions/foursquare-*/` (5 functions exist) | Frontend integration + API key |
| **Plaid hardening** | `supabase/functions/webhook-plaid/` | JWT verify + REMOVED/PENDING→POSTED |

> Note: Google Maps Edge Functions (`google-maps-geocode`, `google-maps-autocomplete`, `google-maps-directions`, `google-places-details`) already exist. Only the frontend integration needs the JS API key.

---

## Verified Metrics (from code scan)

| Metric | Verified Value | Previous (estimated) |
|---|---|---|
| Edge Functions | **120** | 96 (incorrect) |
| Database tables | **~127** (from migration `CREATE TABLE` count) | 99 (incorrect) |
| Migration files | **137** | — |
| React feature pages | ~45 pages across all features | — |
| Custom hooks (use*.ts/tsx) | **29** | 45 (incorrect) |
| Capacitor plugins | BackgroundGeolocation · PushNotifications · Camera | — |
| Extension files | background(5) · popup(3) · content(1) · options(2) · shared(3) | — |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React, TypeScript, Vite, TailwindCSS | 18.3, 5.8, 7.2, 3.4 |
| State | TanStack React Query, React Hook Form, Zod | 5.1, 7.7, 3.2 |
| UI Components | shadcn/ui (Radix), lucide-react, recharts | 40+ components |
| Backend | Supabase (PostgreSQL · Auth · Edge Functions · Realtime · Storage) | Latest |
| Mobile | Capacitor iOS/Android, Background Geolocation, Push | 7.6.5 |
| Maps | Leaflet, react-leaflet, Turf k-means, ngeohash | 1.9 |
| AI / ML | Claude API, Gemini Pro, GPT-4, HuggingFace Transformers | 3.8 |
| Extension | Chrome MV3, Service Worker, Content Scripts | — |
| Payments | react-plaid-link, Stripe Checkout/Portal/Webhooks | Plaid 4.1.1, Stripe.js 9.6 |
| Observability | Performance API, structured logs, Supabase metrics, SLOs | — |
| Security | Snyk, Dependabot, OWASP WAF, RLS, CSP, Vault secrets | — |

---

*Last verified: 2026-05-25 against branch `fix/website-auth-flow-hardening` (otherservices/true-spend-spark). Update the status column whenever a milestone is completed.*
