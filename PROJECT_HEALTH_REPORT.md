# TrueSpend — Project Health & Production Readiness Report

> Generated: 2026-05-24  
> Codebase: 292 TypeScript files · 110 Edge Functions · 131 DB migrations

---

## Overall Score: 68 / 100 — "Solid Beta, Not Yet Production"

| Area | Score | Status |
|---|---|---|
| Architecture & Design | 90/100 | ✅ Excellent |
| Backend Services | 85/100 | ✅ Strong |
| Frontend Code Quality | 60/100 | ⚠️ Needs Work |
| Security | 72/100 | ⚠️ Mostly Good |
| Testing | 35/100 | ❌ Weak |
| Developer Experience | 50/100 | ⚠️ Missing Basics |
| Performance | 65/100 | ⚠️ Partially Implemented |
| Deployment Readiness | 70/100 | ⚠️ Close But Gaps |

---

## What's Already Production-Grade ✅

### Architecture (90/100)
- Offline-first design with IndexedDB + Supabase sync and conflict resolution is genuinely impressive and production-quality.
- 110+ Edge Functions as a serverless backend is clean, scalable, and well-separated.
- Row-Level Security (RLS) is applied across all database tables — this is the right default.
- 131 timestamped migrations prove the schema has evolved carefully.
- Event-driven patterns (publish-event → event-consumer → workflow-executor) are enterprise-grade.
- Real-time TanStack Query with 24-hour persistence is a sensible offline-first caching strategy.

### Security (72/100)
- MFA: TOTP + backup codes is full-featured.
- CSP violation reporting with a dedicated Edge Function is excellent.
- Brute-force protection: login attempt tracking + failure counters exist.
- Snyk + GitHub Actions security audits are wired up.
- SRI (Subresource Integrity) via rollup-plugin-sri is a nice touch.

### Multi-Platform Coverage
- Web, iOS (Capacitor), Android (Capacitor), Chrome Extension — all exist.
- Background geolocation, push notifications, and camera access are implemented natively.

### Observability
- Custom log/trace/metrics collectors with dedicated Edge Functions.
- Incident detection, SLO tracking, performance analysis — built-in from day one.
- A/B testing + feature flags architecture is solid.

---

## Critical Issues to Fix Before Production Launch ❌

### 1. TypeScript Is Not Strict — Silent Bugs Guaranteed
**File:** `tsconfig.json`
```json
// Current (unsafe)
"noImplicitAny": false,
"strictNullChecks": false

// Required for production
"strict": true
```
`strictNullChecks: false` means null-pointer exceptions will slip through at runtime. This is the single most important code-quality fix. Enable strict mode progressively: add `// @ts-strict-ignore` to files that need time to fix, and clean them up over sprints.

### 2. No Unit Tests — Only E2E Tests Exist
The project has 9 E2E test suites (Playwright) but **zero unit tests or component tests**. This means:
- Individual functions and hooks are never tested in isolation.
- Regressions in logic aren't caught until the full app is running.
- CI gives false confidence.

**Fix:** Add Vitest for unit tests. Priority order:
1. `features/sync/services/syncManager.ts` (conflict resolution logic)
2. `features/auth/hooks/useAuth.tsx` (auth state transitions)
3. `features/ml/services/huggingface/` (ML categorisation)
4. `shared/lib/db/indexedDB.ts` (offline storage layer)

### 3. No `.env.example` File
Any new developer cloning this repo has no idea what environment variables are required. The `.env` file contains real Supabase keys and should never be committed.

**Fix:**
```bash
# Create .env.example with all keys, no real values
cp .env .env.example
# Then blank out all values in .env.example
# Immediately rotate any keys that may have been committed to git history
```

### 4. package.json `name` and `version` Are Placeholder Values
```json
"name": "vite_react_shadcn_ts",   // ❌ Generic Lovable.dev default
"version": "0.0.0"               // ❌ Not versioned
```
**Fix:** `"name": "truespend"`, and adopt semantic versioning starting at `"version": "0.1.0"`.

### 5. Duplicate ErrorBoundary Components (Now Resolved in Restructure)
`components/error/ErrorBoundary.tsx` and `components/errors/ErrorBoundary.tsx` were two separate copies of the same component. These are now both present at `shared/components/error/ErrorBoundary.tsx` and `shared/components/error/ErrorBoundaryAlt.tsx`. The `Alt` version should be audited and either merged or deleted.

---

## High-Priority Improvements ⚠️

### 6. App.tsx Is a God File — Needs Splitting (462+ Lines)
`App.tsx` imports ~40 pages directly, contains sync management logic, session activity handling, and conflict resolution — all in one file. This should be split:
- `AppRouter.tsx` — route definitions only
- `AppProviders.tsx` — all context providers
- `SyncOrchestrator.tsx` — sync/conflict logic (already partially in `features/sync/`)

### 7. No Pre-Commit Hooks
No Husky or lint-staged setup means code quality checks are never enforced locally. Developers can commit broken imports, unformatted code, or failed type checks.

**Fix:**
```bash
npm install --save-dev husky lint-staged
npx husky init
# In .husky/pre-commit:
# npx lint-staged
# In package.json:
# "lint-staged": { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }
```

### 8. No Node.js Version Pinning
No `.nvmrc` or `.node-version` file means different developers (and CI) may use different Node versions, causing subtle build differences.

**Fix:** Create `.nvmrc` containing your current Node version (e.g., `20.19.0`).

### 9. No `@types/node` Version Alignment
`@playwright/test` is listed under `dependencies` instead of `devDependencies` — it's a 40MB test framework being bundled into production.

**Fix:** Move `@playwright/test` to `devDependencies`.

### 10. No API Documentation for Edge Functions
110+ Edge Functions exist with no OpenAPI/Swagger spec and no per-function README. The `FUNCTIONS_MAP.md` (now created) is a start, but each function should have documented request/response schemas.

**Suggested format for each function's `index.ts`:**
```typescript
/**
 * POST /functions/v1/plaid-create-link-token
 * Creates a Plaid Link token for account connection.
 * 
 * Request: { user_id: string }
 * Response: { link_token: string, expiration: string }
 * Auth: Required (Bearer token)
 */
```

### 11. Redis Is Undocumented as a Dependency
`redis-metrics` Edge Function and `RedisCacheMonitor` component reference Redis, but there's no mention of Redis in README, no connection setup docs, and no local development instructions. New developers won't know Redis is needed.

### 12. Missing SECURITY.md
No security disclosure policy. GitHub shows a warning on repos without this. Add a `SECURITY.md` describing how to report vulnerabilities responsibly.

### 13. No Load Testing / Performance Baseline
`check-bundle-size.js` exists but isn't enforced in CI. No k6 or similar load tests for Edge Functions. No Lighthouse CI integration. Before launch, establish baselines:
- Bundle size budget (e.g., < 500KB initial JS)
- Core Web Vitals targets (LCP < 2.5s, CLS < 0.1)
- Edge Function p95 latency targets per function

---

## Medium-Priority Improvements

### 14. Consolidate the Two Dashboard Entry Points
`pages/DashboardLauncher.tsx` and `pages/admin/AdminDashboardLayout.tsx` serve overlapping purposes. Clarify which is the canonical admin entry point and remove the other.

### 15. Multiple `HomeNew.tsx` / `Home.tsx`
Two home page implementations exist. `HomeNew.tsx` should either replace `Home.tsx` or be deleted. Dead code creates confusion.

### 16. `@huggingface/transformers` Running Client-Side
The HuggingFace transformers library (`@huggingface/transformers: ^3.8.0`) is in `dependencies`, which means it's bundled into the frontend. This library is large (100MB+ of model weights loaded lazily). Verify it's only loaded dynamically and never in the initial bundle:
```typescript
// Good — dynamic import
const { pipeline } = await import('@huggingface/transformers');

// Bad — top-level import adds to initial bundle
import { pipeline } from '@huggingface/transformers';
```

### 17. Location Index File Has Stale Exports
`features/location/components/index.ts` may have stale barrel exports after the restructure. Audit it to ensure all named exports point to correct relative paths.

### 18. `mermaid` Library in Production Dependencies
Mermaid (`mermaid: ^11.12.1`) is a diagramming library only used in admin/architecture views. It's 1.2MB minified. Move it behind a dynamic import or to `devDependencies`.

### 19. `next-themes` Is Unused
The `next-themes` package provides theme switching for Next.js apps. This is a Vite/React project. Verify it's actually used — if not, remove it to reduce bundle size.

### 20. Capacitor Plugins in Production Bundle
`@capacitor/*` packages are in `dependencies` meaning they're included in the web bundle. On the web build, Capacitor plugins should be no-ops, but large unused bridge code may bloat the bundle. Consider conditional imports based on platform.

---

## Developer Experience Quick Wins

| Fix | Effort | Impact |
|---|---|---|
| Add `.env.example` | 5 min | ⬆⬆⬆ Unblocks new devs |
| Add `.nvmrc` | 1 min | ⬆ Consistent Node version |
| Add `.editorconfig` | 5 min | ⬆ Consistent formatting |
| Move `@playwright/test` to devDeps | 1 min | ⬆ Smaller prod bundle |
| Add Husky + lint-staged | 20 min | ⬆⬆ Enforced quality gates |
| Enable `strict: true` in tsconfig | Sprints | ⬆⬆⬆ Type safety everywhere |
| Add Vitest unit tests for core logic | Weeks | ⬆⬆⬆ Regression safety net |
| Add `SECURITY.md` | 10 min | ⬆ Security posture signal |
| Rename package.json `name`/`version` | 1 min | ⬆ Professionalism |

---

## New Folder Structure (Applied)

The entire `src/` directory has been reorganised from a type-based layout into a feature-based layout. All 278 files were moved and all 229 affected import files were updated automatically. TypeScript compiles with zero errors after the change.

### Frontend — `src/`

```
src/
├── App.tsx                        # Root router + providers (needs splitting — see #6)
├── main.tsx                       # Vite entry point
├── index.css                      # Global styles
│
├── features/                      ← FEATURE MODULES (co-locate everything per feature)
│   ├── auth/                      # Sign-in, MFA, session, password
│   │   ├── components/            # 15 auth UI components
│   │   ├── hooks/                 # useAuth, useSessionActivity, useUserRole
│   │   ├── pages/                 # Auth, ForgotPassword, ResetPassword, VerifyEmail…
│   │   └── lib/                   # auth-errors.ts, mfa-errors.ts
│   │
│   ├── transactions/              # Transaction CRUD + rules
│   │   ├── hooks/                 # useTransactionRules
│   │   └── pages/                 # Transactions.tsx
│   │
│   ├── budgets/                   # Budget management
│   │   └── pages/                 # Budgets.tsx
│   │
│   ├── insights/                  # Spending analytics
│   │   ├── components/            # LocationInsightsPanel
│   │   └── pages/                 # Insights.tsx
│   │
│   ├── credit-cards/              # Plaid integration + card UI
│   │   ├── components/            # 4 card components
│   │   ├── hooks/                 # useCreditCards, usePlaid
│   │   └── pages/                 # CreditCards.tsx
│   │
│   ├── location/                  # Geofencing, heatmaps, merchant discovery
│   │   ├── components/            # 10 location/geofencing/native components
│   │   ├── hooks/                 # useGPSTracking, useGeofenceMetrics…
│   │   ├── services/              # nativeGeofencingService
│   │   └── pages/                 # LocationHistory, Geofences, LocationMetrics
│   │
│   ├── ocr/                       # Receipt scanning + camera
│   │   ├── components/            # CameraCapture, ReceiptCapture, ImagePreview…
│   │   ├── hooks/                 # useCamera
│   │   └── services/              # ocrService, ocrPreparation
│   │
│   ├── merchants/                 # Favourite merchants
│   │   ├── hooks/                 # useFavoriteMerchants
│   │   └── pages/                 # FavoriteMerchants.tsx
│   │
│   ├── settings/                  # User preferences + data management
│   │   ├── components/            # DataManagement, NotificationSettings
│   │   ├── hooks/                 # useDataExport
│   │   └── pages/                 # Settings.tsx
│   │
│   ├── ml/                        # AI/ML — HuggingFace, training, A/B, feature flags
│   │   ├── components/            # 30+ admin ML components
│   │   ├── hooks/                 # useABTesting, useFeatureFlag
│   │   ├── services/              # huggingface/ (client, cache, categorizer, models)
│   │   └── pages/                 # MLTraining, HuggingFace, AnomalyDetection…
│   │
│   ├── sync/                      # Offline-first sync + conflict resolution
│   │   ├── components/            # ConflictResolutionDialog, SyncControlPanel…
│   │   ├── hooks/                 # useOfflineStorage, useAdaptiveContent
│   │   └── services/              # syncManager, offlineSync, storageService, storage/
│   │
│   ├── notifications/             # Push + email notifications
│   │   ├── hooks/                 # useEmailDigest
│   │   └── services/              # pushNotificationService
│   │
│   └── observability/             # Logging, tracing, metrics, SLO, incidents
│       ├── components/            # 12 observability/tracing/events/data-planes components
│       ├── hooks/                 # useLogger, useTracing, useRealtimeEvents
│       └── pages/                 # Observability, SystemLogs, DistributedTracing…
│
├── shared/                        ← CROSS-FEATURE SHARED CODE
│   ├── components/
│   │   ├── ui/                    # 51 shadcn/ui base components
│   │   ├── navigation/            # GlobalNav, Footer
│   │   ├── error/                 # ErrorBoundary, ErrorFallback
│   │   ├── security/              # CSPViolationReporter
│   │   ├── network/               # NetworkQualityIndicator, OfflineIndicator
│   │   ├── brand/                 # Logo
│   │   ├── architecture/          # Diagram components
│   │   ├── timeline/              # Gantt, Milestone
│   │   ├── testing/               # Phase test suites
│   │   ├── api/                   # RateLimitStatus
│   │   └── version/               # VersionDisplay
│   ├── hooks/                     # use-mobile, useNetworkQuality, usePlatform…
│   ├── lib/                       # utils, queryPersister, db/, api/, errors/, types/…
│   └── design/                    # Design tokens
│
├── pages/                         ← TOP-LEVEL PAGE SHELLS (no business logic)
│   ├── marketing/                 # Home, Features, Pricing, About, Careers…
│   ├── admin/                     # AdminDashboardLayout + 12 admin pages
│   ├── legal/                     # PrivacyPolicy, TermsOfService…
│   ├── UserDashboard.tsx
│   ├── DashboardLauncher.tsx
│   └── NotFound.tsx
│
├── assets/                        # Images, icons (36 files)
└── integrations/
    └── supabase/                  # Supabase client + generated types
```

### Backend — `supabase/`

```
supabase/
├── functions/                     # 110 Edge Functions (flat — Supabase requirement)
│   ├── FUNCTIONS_MAP.md           # ← Feature-grouped index (new)
│   ├── _shared/                   # Shared Deno utilities
│   ├── [auth functions]           # 22 auth-related functions
│   ├── [transaction functions]    # 5 transaction functions
│   ├── [budget functions]         # 3 budget functions
│   ├── [ml functions]             # 11 ML/AI functions
│   ├── [ocr functions]            # 9 OCR functions
│   ├── [location functions]       # 18 location/geofencing functions
│   ├── [plaid functions]          # 6 Plaid functions
│   ├── [notification functions]   # 7 notification functions
│   ├── [observability functions]  # 14 monitoring functions
│   ├── [infrastructure functions] # 10 platform functions
│   └── [event functions]          # 5 event/workflow functions
└── migrations/                    # 131 SQL migration files
```

### Other Top-Level Areas

```
true-spend-spark/
├── extension/                     # Chrome Extension (Manifest v3)
├── ios/                           # Native iOS (Capacitor/Swift)
├── android/                       # Native Android (Capacitor/Java)
├── e2e/                           # Playwright E2E tests
├── docs/                          # 87 markdown docs
├── scripts/                       # Build validation scripts
└── public/                        # Static assets
```

---

## Production Launch Checklist

### Must-Do Before Launch
- [ ] Add `.env.example` with all required variables documented
- [ ] Rotate any secrets that may have been in git history
- [ ] Enable TypeScript strict mode (start per-file, fix progressively)
- [ ] Move `@playwright/test` to devDependencies
- [ ] Fix `package.json` name and version
- [ ] Add Husky pre-commit hooks (ESLint + Prettier)
- [ ] Add a `SECURITY.md` disclosure policy
- [ ] Write unit tests for sync, auth, and ML core logic
- [ ] Add `.nvmrc` for Node version pinning
- [ ] Audit and delete `HomeNew.tsx` or `Home.tsx` (one is dead code)
- [ ] Resolve the duplicate ErrorBoundary (`ErrorBoundaryAlt.tsx`)

### Should-Do Before Launch
- [ ] Split `App.tsx` into Router + Providers + SyncOrchestrator
- [ ] Add Lighthouse CI to the GitHub Actions workflow
- [ ] Add k6 load tests for the 10 most-called Edge Functions
- [ ] Document Redis as a required dependency in README
- [ ] Make Mermaid and HuggingFace dynamic imports only
- [ ] Remove or justify `next-themes` dependency
- [ ] Add OpenAPI annotations to each Edge Function
- [ ] Document local development setup end-to-end

### Nice-to-Have
- [ ] Add Docker Compose for local Supabase + Redis development
- [ ] Adopt semantic-release for automated versioning
- [ ] Add Commitlint for conventional commit messages
- [ ] Add `@testing-library/react` for component-level tests
- [ ] Set up Storybook for the 51 shared UI components
- [ ] Add bundle size enforcement to CI (fail if > threshold)

---

*Report generated by automated project audit + HARSHURAJ review, May 2026*
