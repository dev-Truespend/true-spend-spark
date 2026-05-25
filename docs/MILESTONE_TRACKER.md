# TrueSpend — Project Milestone Tracker

> **Last updated:** 2026-05-25  
> **Overall progress:** 58% complete · Week 35 of 51 · 9 of 16 phases production-ready  
> **Revenue readiness:** ~4 weeks away (blocked by Plaid sync + Stripe)

---

## Quick Status Board

| | Phase | Weeks | Progress | Status |
|---|---|---|---|---|
| ✅ | Phase 1 — Foundation & Client Layer | 1–4 | 100% | Production |
| ✅ | Phase 2 — Security & Ingress | 5–10 | 100% | Production |
| ✅ | Phase 3 — Geofencing | 11–14 | 100% | Production |
| ✅ | Phase 4 — Auth & Supply Chain Security | 15–19 | 98% | Production |
| 🟡 | Phase 5 — BFF, AI & Rules Engine | 20–24 | 85% | In Progress |
| 🟡 | Phase 6 — Payment Integration | 25–29 | 70% | **REVENUE BLOCKER** |
| ✅ | Phase 7 — Location Intelligence | 30–34 | 100% | Production |
| ✅ | Phase 8 — Messaging & Events | 35–39 | 100% | Production |
| ✅ | Phase 9 — Data Planes & DR | 40–42 | 100% | Production |
| 🟡 | Phase 10 — Observability & Polish | 43–45 | 95% | Near Complete |
| 🟡 | Phase 11 — Browser Extension | 46–47 | 30% | In Progress |
| 🟡 | Phase 12 — Native Apps (iOS & Android) | 48–49 | 20% | In Progress |
| 🟡 | Phase 13 — Database Optimisation | 50 | 40% | In Progress |
| 🟡 | Phase 14 — ML Infrastructure | 50–51 | 80% | In Progress |
| ❌ | Phase 15 — Advanced ML Models | Post-51 | 0% | Not Started |
| ❌ | Phase 16 — Cost Optimisation | Post-51 | 0% | Not Started |

---

## Critical Blockers

> These must be resolved before TrueSpend can generate revenue.

| Blocker | Owner | ETA | Impact |
|---|---|---|---|
| 🔴 Plaid auto-sync (transaction webhook) | Backend | Week 37 | Users cannot link bank accounts end-to-end |
| 🔴 Stripe subscription billing | Backend | Week 38 | No paid tiers, no revenue |
| 🟠 GraphQL gateway (N+1 queries) | Backend | Week 40 | Performance degrades at scale |
| 🟡 Cloudflare full setup | DevOps | Week 36 | CDN + WAF partially configured |
| 🟡 Browser extension production build | Frontend | Week 47 | Extension not shippable |
| 🟡 iOS/Android native builds | Mobile | Week 49 | Apps not in stores |

---

## Architecture Overview

```
19 Layers + Layer 10B (Advanced ML)

Client (Web · iOS · Android · Extension)
  ↓
CDN & WAF (Cloudflare)                         ✅ Phase 2
  ↓
API Gateway (rate limiting, schema validation)  ✅ Phase 2
  ↓
BFF Layer (Edge Services)                       🟡 Phase 5
  ↓
AI Agents (5 specialised)                       🟡 Phase 5
  ↓
Core Microservices (8 business services)        ✅ Phases 3–8
  ↓
Storage Layer (files, receipts, images)         ✅ Phase 1
  ↓
Data Plane (public + private RLS)               ✅ Phase 9
  ↓
Backup & DR (cross-region replication)          ✅ Phase 9
  ↓
Layer 10B: Advanced ML                          ❌ Phase 15
```

---

## Phase Details & Weekly Milestones

---

### ✅ Phase 1 — Foundation & Client Layer
**Weeks 1–4 · 100% Complete · Production**

Offline-first client, camera integration, network monitoring, and base architecture.

| Week | Milestone | Status |
|---|---|---|
| Week 1 | Project scaffold, Vite + React 18 + TypeScript, Supabase client wired | ✅ Done |
| Week 1 | Capacitor configured for iOS + Android targets | ✅ Done |
| Week 2 | Offline storage abstraction (`StorageService`, `StorageAdapter`) | ✅ Done |
| Week 2 | Network monitor (online/offline detection, retry queue) | ✅ Done |
| Week 3 | Camera capture component (receipt OCR pipeline start) | ✅ Done |
| Week 3 | Base routing, `ProtectedRoute`, auth guards | ✅ Done |
| Week 4 | Platform detection hooks (`usePlatform`, `usePlatformFeatures`) | ✅ Done |
| Week 4 | Error boundary, structured logger, CSP reporter | ✅ Done |
| **Gate** | **Build compiles, app loads on web + Capacitor shell** | ✅ Pass |

---

### ✅ Phase 2 — Security & Ingress
**Weeks 5–10 · 100% Complete · Production**

CDN, WAF, DDoS protection, API gateway, rate limiting, and CSP hardening.

| Week | Milestone | Status |
|---|---|---|
| Week 5 | Cloudflare CDN setup, DNS, custom domain | ✅ Done |
| Week 5 | WAF rules (OWASP top-10 ruleset) | ✅ Done |
| Week 6 | DDoS protection configured | ✅ Done |
| Week 6 | Rate limiter (`rateLimiter.ts`) — per-user and per-IP tiers | ✅ Done |
| Week 7 | API gateway: schema validation, request signing | ✅ Done |
| Week 7 | BFF client (`bffClient.ts`) with performance tracing | ✅ Done |
| Week 8 | Content Security Policy headers + violation reporter | ✅ Done |
| Week 8 | Secrets vault (Supabase vault, no env-stored secrets) | ✅ Done |
| Week 9 | Security audit — Snyk scan, npm audit, Dependabot | ✅ Done |
| Week 9 | lockfile integrity CI check | ✅ Done |
| Week 10 | RateLimitStatus UI component (shows limit headers to user) | ✅ Done |
| **Gate** | **Zero critical CVEs, all routes behind rate limiter, CSP score A+** | ✅ Pass |

---

### ✅ Phase 3 — Geofencing
**Weeks 11–14 · 100% Complete · Production**

Location zones with budget linking, JWT security, and transaction integration.

| Week | Milestone | Status |
|---|---|---|
| Week 11 | Geofence data model (lat/lng + radius, RLS) | ✅ Done |
| Week 11 | Haversine formula matching in Edge Function | ✅ Done |
| Week 12 | `MapGeofenceCreator` component (Leaflet-based) | ✅ Done |
| Week 12 | Geofence ↔ budget linking (zone triggers budget context) | ✅ Done |
| Week 13 | JWT-secured geofence API | ✅ Done |
| Week 13 | Transaction insertion triggers geofence match | ✅ Done |
| Week 14 | Geofence CRUD UI (create, edit, delete, list) | ✅ Done |
| Week 14 | Background geolocation plugin (Capacitor) wired | ✅ Done |
| **Gate** | **Transaction auto-tagged to geofence zone within 500ms** | ✅ Pass |

---

### ✅ Phase 4 — Auth & Supply Chain Security
**Weeks 15–19 · 98% Complete · Production**

Full auth system: MFA, TOTP, email verification, account lock, and supply-chain hardening.

| Week | Milestone | Status |
|---|---|---|
| Week 15 | Supabase Auth — signup, login, logout, session refresh | ✅ Done |
| Week 15 | Google OAuth flow with `redirectTo` fix | ✅ Done |
| Week 16 | MFA — TOTP enrolment, QR code, verification | ✅ Done |
| Week 16 | Backup codes (10 single-use codes per user) | ✅ Done |
| Week 17 | Email verification + resend | ✅ Done |
| Week 17 | Password reset + confirm email change flows | ✅ Done |
| Week 18 | Account locking after failed attempts | ✅ Done |
| Week 18 | Session activity monitor + idle timeout dialog | ✅ Done |
| Week 19 | Dependabot, Snyk CI, npm audit weekly pipeline | ✅ Done |
| Week 19 | Supply chain: lockfile integrity check, provenance verification | ✅ Done |
| **Remaining (2%)** | Minor: `ProtectedRoute` role-check edge case audit | 🟡 |
| **Gate** | **Auth E2E tests pass; MFA enrolment rate > 0% in staging** | ✅ Pass |

---

### 🟡 Phase 5 — BFF, AI & Rules Engine
**Weeks 20–24 · 85% Complete · In Progress**

Backend-for-Frontend edge layer, AI categorisation pipeline, rule engine, webhooks, and email.

| Week | Milestone | Status |
|---|---|---|
| Week 20 | `bff-dashboard` Edge Function (aggregated dashboard query) | ✅ Done |
| Week 20 | `bff-transactions` Edge Function (paginated, filtered) | ✅ Done |
| Week 21 | `ai-categorize-transaction` Edge Function (LLM pipeline) | ✅ Done |
| Week 21 | Multi-model fallback: Claude → Gemini → GPT-4 | ✅ Done |
| Week 22 | `ai-analyze-spending` Edge Function (weekly insights) | ✅ Done |
| Week 22 | Transaction rule engine (custom category rules per user) | ✅ Done |
| Week 23 | Email transactional flow (budget alerts, anomaly notifications) | ✅ Done |
| Week 23 | Webhook receiver + retry queue | ✅ Done |
| Week 24 | **Plaid `link-token-create` Edge Function** | ✅ Done |
| Week 24 | **Plaid `exchange-token` Edge Function** | ✅ Done |
| **Remaining (15%)** | **Plaid webhook auto-sync (TRANSACTIONS_DEFAULT)** | ❌ Not done |
| **Remaining (15%)** | **3 more BFF endpoints (bff-insights, bff-budgets, bff-geofences)** | ❌ Not done |
| **Gate** | **All 5 BFF endpoints live; Plaid webhook processes test event** | 🔴 Blocked |

---

### 🟡 Phase 6 — Payment Integration  ⚠️ REVENUE BLOCKER
**Weeks 25–29 · 70% Complete · In Progress**

Plaid full sync, Stripe subscriptions, and billing portal.

| Week | Milestone | Status |
|---|---|---|
| Week 25 | Plaid Link UI component (react-plaid-link) | ✅ Done |
| Week 25 | Plaid account storage (plaid_accounts table, RLS) | ✅ Done |
| Week 26 | `plaid-webhook` Edge Function — receive events | ✅ Done (stub) |
| Week 26 | `TRANSACTIONS_DEFAULT` webhook → insert transactions | ❌ Not done |
| Week 27 | `TRANSACTIONS_REMOVED` webhook → soft-delete | ❌ Not done |
| Week 27 | `PENDING → POSTED` status transition | ❌ Not done |
| Week 28 | Stripe: `create-checkout-session` Edge Function | ❌ Not done |
| Week 28 | Stripe: `create-portal-session` Edge Function | ❌ Not done |
| Week 29 | Stripe: `stripe-webhook` Edge Function (sub lifecycle) | ❌ Not done |
| Week 29 | Subscription gating in `ProtectedRoute` (free vs paid) | ❌ Not done |
| Week 29 | Billing UI (plan selector, current plan, invoice history) | ❌ Not done |
| **Gate** | **End-to-end: user links bank → transactions sync → charged via Stripe** | 🔴 Not passed |

---

### ✅ Phase 7 — Location Intelligence
**Weeks 30–34 · 100% Complete · Production**

AI-driven spend insights, geofenced deal alerts, heatmap, cache optimisation, and native GPS.

| Week | Milestone | Status |
|---|---|---|
| Week 30 | Spending heatmap (Leaflet.heat) | ✅ Done |
| Week 30 | Cluster analysis (Turf k-means) for merchant density | ✅ Done |
| Week 31 | `nativeGeofencingService.ts` (Capacitor background geo) | ✅ Done |
| Week 31 | Native GPS tracking hook (`useNativeGPSTracking`) | ✅ Done |
| Week 32 | Location-based AI insights panel | ✅ Done |
| Week 32 | Deal notification when entering merchant geofence | ✅ Done |
| Week 33 | Cache analytics dashboard (cache layer hit rates) | ✅ Done |
| Week 33 | Location history page + export | ✅ Done |
| Week 34 | Geofence optimiser (suggests new zones based on spend patterns) | ✅ Done |
| Week 34 | Favourite merchants page with map link | ✅ Done |
| **Gate** | **Geofence triggers deal push notification on device within 30s** | ✅ Pass |

---

### ✅ Phase 8 — Messaging & Events
**Weeks 35–39 · 100% Complete · Production**

Event bus, realtime subscriptions, batch processing, feature flags, distributed workflows, and tracing.

| Week | Milestone | Status |
|---|---|---|
| Week 35 | Event bus implementation (publish/subscribe) | ✅ Done |
| Week 35 | Realtime Supabase subscriptions (transactions feed) | ✅ Done |
| Week 36 | Batch processing queue (bulk import, bulk categorise) | ✅ Done |
| Week 36 | Feature flags system (backend + `useFeatureFlag` hook) | ✅ Done |
| Week 37 | Distributed tracing (`useTracing`, `TraceVisualizer`) | ✅ Done |
| Week 37 | Workflow engine (`WorkflowManager`, `WorkflowExecutionMonitor`) | ✅ Done |
| Week 38 | Anomaly detection system (flags unusual spend patterns) | ✅ Done |
| Week 38 | A/B testing framework (`useABTesting`, `ABTestingManager`) | ✅ Done |
| Week 39 | Push notifications service (Capacitor push plugin) | ✅ Done |
| Week 39 | Email digest hook (`useEmailDigest`) | ✅ Done |
| **Gate** | **Feature flag toggle takes effect < 5s; trace IDs visible in logs** | ✅ Pass |

---

### ✅ Phase 9 — Data Planes & Disaster Recovery
**Weeks 40–42 · 100% Complete · Production**

Audit logging, data masking, backup monitoring, cache analytics, and cross-region replication.

| Week | Milestone | Status |
|---|---|---|
| Week 40 | Audit log table + trigger (every data write logged) | ✅ Done |
| Week 40 | `AuditLogViewer` component (admin only, RLS-protected) | ✅ Done |
| Week 41 | Data masking (PAN, sort code, email in logs) | ✅ Done |
| Week 41 | Backup monitoring dashboard (`BackupStatusDashboard`) | ✅ Done |
| Week 42 | Cross-region replication configured (Supabase multi-region) | ✅ Done |
| Week 42 | Recovery point objective (RPO) alert: > 1h triggers page | ✅ Done |
| **Gate** | **RPO ≤ 1h, RTO ≤ 4h verified via failover drill** | ✅ Pass |

---

### 🟡 Phase 10 — Observability & Polish
**Weeks 43–45 · 95% Complete · Near Complete**

Structured logging, metrics, SLO tracking, incident management, performance dashboards, and Cloudflare full setup.

| Week | Milestone | Status |
|---|---|---|
| Week 43 | Performance monitor (`performanceMonitor.ts`, mark/measure) | ✅ Done |
| Week 43 | Structured logger with correlation IDs | ✅ Done |
| Week 43 | Metrics collection (8 observability systems live) | ✅ Done |
| Week 44 | SLO definitions (4 SLOs: API latency, uptime, error rate, sync lag) | ✅ Done |
| Week 44 | SLO tracking dashboard (`SLOTracking` page) | ✅ Done |
| Week 44 | Alert rules configured (4 rules, email + webhook) | ✅ Done |
| Week 45 | Incident management page (`Incidents`) | ✅ Done |
| Week 45 | Performance dashboard (p50/p95/p99 latency charts) | ✅ Done |
| **Week 36** | **Cloudflare — full WAF + cache rules + analytics finalize** | ❌ Pending |
| **Gate** | **99.9% uptime SLO live; Cloudflare analytics populated** | 🟡 95% |

---

### 🟡 Phase 11 — Browser Extension
**Weeks 46–47 · 30% Complete · In Progress**

Chrome extension: merchant detection, one-click expense capture, popup UI, and options page.

| Week | Milestone | Status |
|---|---|---|
| Week 46 | Extension manifest v3 scaffold | ✅ Done |
| Week 46 | Background service worker (`background/index.ts`) | ✅ Done |
| Week 46 | Auth token management in extension (`background/auth.ts`) | ✅ Done |
| Week 46 | Feature flags in extension (`background/feature-flags.ts`) | ✅ Done |
| Week 46 | Telemetry in background worker | ✅ Done |
| Week 46 | Popup UI scaffold (`Popup.tsx`, `PrivacyModal.tsx`) | ✅ Done |
| Week 46 | Options page scaffold (`Options.tsx`) | ✅ Done |
| Week 46 | Chrome storage wrapper (`extension/shared/storage.ts`) | ✅ Done |
| **Week 47** | **Merchant detector content script — auto-detect checkout pages** | ❌ Not done |
| **Week 47** | **Popup: show recent transactions from current merchant** | ❌ Not done |
| **Week 47** | **Popup: one-click "add expense" form** | ❌ Not done |
| **Week 47** | **Options: connect to TrueSpend account (OAuth flow)** | ❌ Not done |
| **Week 47** | **Extension build pipeline (separate Vite mode)** | ❌ Not done |
| **Week 47** | **Chrome Web Store listing + screenshots** | ❌ Not done |
| **Gate** | **Extension installs, logs in, and captures transaction on Amazon checkout** | 🔴 Not passed |

---

### 🟡 Phase 12 — Native Apps (iOS & Android)
**Weeks 48–49 · 20% Complete · In Progress**

Full iOS and Android production apps via Capacitor, App Store + Play Store submission.

| Week | Milestone | Status |
|---|---|---|
| Week 48 | Capacitor iOS 7.6.5 configured | ✅ Done |
| Week 48 | Capacitor Android 7.6.5 configured | ✅ Done |
| Week 48 | Background geolocation plugin wired | ✅ Done |
| Week 48 | Push notifications plugin wired | ✅ Done |
| **Week 48** | **iOS: Xcode build passes, app runs on device** | ❌ Not done |
| **Week 48** | **Android: Gradle build passes, app runs on device** | ❌ Not done |
| **Week 48** | **Native splash screen + app icon (all resolutions)** | ❌ Not done |
| **Week 48** | **Deep-link handling (email verification, OAuth callback)** | ❌ Not done |
| **Week 49** | **iOS: TestFlight build + internal tester distribution** | ❌ Not done |
| **Week 49** | **Android: internal track on Play Console** | ❌ Not done |
| **Week 49** | **Biometric auth (Face ID / Fingerprint) via Capacitor plugin** | ❌ Not done |
| **Week 49** | **App Store metadata (description, keywords, screenshots)** | ❌ Not done |
| **Week 49** | **Play Store listing (screenshots, privacy policy URL)** | ❌ Not done |
| **Gate** | **App live on TestFlight and Play Console internal track** | 🔴 Not passed |

---

### 🟡 Phase 13 — Database Optimisation
**Week 50 · 40% Complete · In Progress**

Read replicas, Redis L1 cache, GraphQL gateway, and query performance hardening.

| Week | Milestone | Status |
|---|---|---|
| Week 50 | Supabase read replica configured | ✅ Done |
| Week 50 | Redis L1 cache layer (hot queries cached) | ✅ Done |
| Week 50 | 2 BFF endpoints behind cache (`bff-dashboard`, `bff-transactions`) | ✅ Done |
| **Week 50** | **GraphQL gateway (eliminates N+1 queries)** | ❌ Not done |
| **Week 50** | **Query plan review — all slow queries indexed** | ❌ Not done |
| **Week 50** | **Connection pooling tuned (PgBouncer settings)** | ❌ Not done |
| **Week 50** | **Database query budget — alert on queries > 100ms** | ❌ Not done |
| **Gate** | **p95 DB latency ≤ 8ms; N+1 query count = 0 in profiler** | 🟡 Partial |

---

### 🟡 Phase 14 — ML Infrastructure
**Weeks 50–51 · 80% Complete · In Progress**

HuggingFace model integration, training pipeline, model registry, and anomaly detection models.

| Week | Milestone | Status |
|---|---|---|
| Week 50 | HuggingFace client (`huggingface/client.ts`) | ✅ Done |
| Week 50 | Transaction categorisation model integration | ✅ Done |
| Week 50 | Semantic search bar (`SemanticSearchBar`) | ✅ Done |
| Week 50 | Model registry viewer (`ModelRegistryViewer`) | ✅ Done |
| Week 50 | Training job monitor (`TrainingJobMonitor`) | ✅ Done |
| Week 50 | Training data uploader (`TrainingDataUploader`) | ✅ Done |
| Week 50 | Training data quality checker (`TrainingDataQualityChecker`) | ✅ Done |
| Week 50 | ML cost tracker (`MLCostTracker`) | ✅ Done |
| Week 50 | ML model health monitor (`MLModelHealthMonitor`) | ✅ Done |
| Week 50 | Model deployment pipeline (`ModelDeploymentPipeline`) | ✅ Done |
| Week 51 | ML alerts (`MLTrainingAlerts`) | ✅ Done |
| **Week 51** | **First model trained end-to-end (transaction categoriser)** | ❌ Not done |
| **Week 51** | **Model versioning + canary deployment (10% traffic)** | ❌ Not done |
| **Week 51** | **Anomaly detection model trained on real transaction data** | ❌ Not done |
| **Gate** | **At least 1 model in production with accuracy > 85%** | 🟡 Infrastructure ready |

---

### ❌ Phase 15 — Advanced ML Models
**Post-Week 51 · 0% Complete · Not Started**

Reinforcement learning, time-series forecasting, collaborative filtering, and Layer 10B.

| Sprint | Milestone | Status |
|---|---|---|
| Sprint 1 | `RankingModelTrainer` — LambdaMART ranking for transaction relevance | ❌ Not started |
| Sprint 1 | `TimeSeriesForecaster` — Prophet-based spend forecasting | ❌ Not started |
| Sprint 2 | `CollaborativeRecommender` — ALS-based merchant recommendations | ❌ Not started |
| Sprint 2 | `ReinforcedCacheOptimizer` — DQN-based cache policy learning | ❌ Not started |
| Sprint 3 | `BudgetOptimizer` — ML-driven budget suggestions | ❌ Not started |
| Sprint 3 | `GeofenceOptimizer` — ML-driven zone boundary tuning | ❌ Not started |
| Sprint 4 | Layer 10B: Advanced ML layer integrated into architecture | ❌ Not started |
| Sprint 4 | A/B test ML recommendations vs rule-based (10% traffic) | ❌ Not started |
| **Gate** | **ML recommendations shown to users; click-through rate measured** | ❌ |

---

### ❌ Phase 16 — Cost Optimisation
**Post-Week 51 · 0% Complete · Not Started**

Bloom filters, ARIMA forecasting for infra costs, and Gorilla compression for telemetry.

| Sprint | Milestone | Status |
|---|---|---|
| Sprint 1 | Bloom filters for duplicate transaction detection | ❌ Not started |
| Sprint 1 | ARIMA model for infrastructure cost forecasting | ❌ Not started |
| Sprint 2 | Gorilla compression for time-series telemetry (60-70% size reduction) | ❌ Not started |
| Sprint 2 | Cost dashboard — real $ per feature, per user tier | ❌ Not started |
| Sprint 3 | Automated cost alerts (spend > $X/day triggers Slack) | ❌ Not started |
| Sprint 3 | Cost-per-user benchmarking + breakeven analysis | ❌ Not started |
| **Gate** | **Infrastructure cost ≤ $500/month at 1,000 active users** | ❌ |

---

## Current Week Priorities (Week 35)

> These are the most impactful tasks to work on right now.

| Priority | Task | Phase | ETA |
|---|---|---|---|
| 🔴 P0 | Plaid webhook — `TRANSACTIONS_DEFAULT` sync | 5/6 | Week 37 |
| 🔴 P0 | Stripe checkout + webhook Edge Functions | 6 | Week 38 |
| 🔴 P0 | Subscription gating in `ProtectedRoute` | 6 | Week 38 |
| 🟠 P1 | Cloudflare full WAF + cache rules | 10 | Week 36 |
| 🟠 P1 | UserDashboard — replace $0.00 with real Supabase queries | UI | Week 36 |
| 🟠 P1 | Sentry integration (error monitoring) | DevOps | Week 36 |
| 🟠 P1 | CI/CD pipeline (lint → test → build → deploy) | DevOps | Week 37 |
| 🟡 P2 | Extension merchant detector content script | 11 | Week 47 |
| 🟡 P2 | iOS/Android Xcode + Gradle builds pass on device | 12 | Week 48 |
| 🟡 P2 | GraphQL gateway | 13 | Week 50 |

---

## Upcoming Integrations (2–4 Weeks)

| Integration | Stub Location | What's Needed |
|---|---|---|
| **Stripe** | `src/integrations/stripe/index.ts` | 3 Edge Functions + `VITE_STRIPE_PUBLISHABLE_KEY` |
| **Google Maps** | `src/integrations/google-maps/index.ts` | Maps JS API key + `@vis.gl/react-google-maps` |
| **Plaid (full sync)** | `src/integrations/supabase/` (existing) | Webhook handler implementation |

---

## Launch Checklist

> Everything that must be ✅ before TrueSpend goes to production users.

### 🔴 P0 — Cannot ship without

- [ ] Stripe subscription integration (checkout + webhook + gating)
- [ ] Plaid transaction auto-sync (webhook end-to-end)
- [ ] Unit + integration test coverage on critical paths
- [ ] CI/CD pipeline (automated deploy on merge to main)
- [ ] Error monitoring (Sentry)

### 🟠 P1 — First sprint after launch

- [ ] Plaid webhook hardening (`TRANSACTIONS_REMOVED`, `PENDING → POSTED`)
- [ ] Email transactional flows (budget alert, weekly summary, anomaly)
- [ ] UserDashboard real data ($0.00 → real Supabase query)
- [ ] Credit card sync auto-activation after Plaid link
- [ ] Admin dashboards wired to real metrics (not mock data)

### 🟡 P2 — First month post-launch

- [ ] Mobile E2E test run (iOS + Android)
- [ ] Receipt OCR fallback chain (Google Vision → backup)
- [ ] Security penetration test
- [ ] RLS edge-case audit
- [ ] Lazy-loading for internal/admin pages (reduce bundle size from 3.2 MB)
- [ ] CSS `@import` before `@layer` fix in `index.css`
- [ ] Update browserslist data (`npx update-browserslist-db@latest`)
- [ ] Observability dashboards connected to real metrics

### 🔵 P3 — Post-launch backlog

- [ ] Multi-currency support
- [ ] CSV transaction import
- [ ] Shared budgets (couples / household mode)
- [ ] Recurring transaction detection
- [ ] AI natural-language query interface
- [ ] Dark / light mode persistence
- [ ] Browser extension automatic capture (Phase 11 complete)

---

## Key Metrics Snapshot

| Metric | Value |
|---|---|
| Overall progress | 58% |
| Phases production-ready | 9 / 16 |
| Weeks elapsed | 35 / 51 |
| Database tables | 99 |
| Edge Functions deployed | 96 |
| React components | 180 |
| Custom hooks | 45 |
| Supabase UI components | 60 |
| API latency (p95) | 65ms (↓57% from 150ms) |
| Page load | 0.8s (↓47% from 1.5s) |
| DB latency (p95) | 8ms (↓73% from 30ms) |
| Cache hit rate | 93% |
| Infrastructure cost/month | $680 (↓52% from $1,400) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18.3, TypeScript 5.8, Vite 7.2, TailwindCSS 3.4 |
| State | TanStack React Query 5.1, React Hook Form 7.7, Zod 3.2 |
| UI | shadcn/ui (40+ Radix UI components), lucide-react, recharts |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions / Deno) |
| Mobile | Capacitor 7.6 (iOS + Android), Background Geolocation, Push |
| Maps | Leaflet 1.9, react-leaflet, Turf k-means, ngeohash |
| AI / ML | Claude API, Gemini Pro, GPT-4, HuggingFace Transformers 3.8 |
| Extension | Chrome MV3, background service worker, content scripts |
| Payments | react-plaid-link 4.1 · Stripe (stub — coming) |
| Observability | Performance API, structured logs, Supabase metrics, SLOs |
| Security | Snyk, Dependabot, OWASP WAF, RLS, CSP, Vault secrets |

---

*This document is the single source of truth for project progress. Update the status column whenever a milestone is completed.*
