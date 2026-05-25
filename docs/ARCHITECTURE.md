# Architecture

## Overview

TrueSpend is a client-rendered SPA backed entirely by Supabase. There is no dedicated application server. All business logic runs either in the browser or in Supabase Edge Functions (Deno runtime).

```
Browser (React SPA)
    │
    ├── Supabase Auth          — JWT session management
    ├── Supabase PostgREST     — direct table queries (RLS enforced)
    └── Supabase Edge Functions — BFF layer, AI, webhooks
            │
            ├── bff-dashboard              — aggregated dashboard data
            ├── process-transaction        — create + geofence + rule engine
            ├── ai-categorize-transaction  — LLM category inference
            ├── ai-analyze-spending        — spending insights
            ├── plaid-link-token-create    — Plaid OAuth token
            ├── plaid-exchange-token       — Plaid access token exchange
            ├── plaid-webhook              — Plaid transaction sync
            └── ocr-receipt                — Google Vision → structured data
```

## Authentication

- Supabase Auth handles signup, email verification, password reset, and OAuth.
- Sessions are stored in `localStorage` by the Supabase JS SDK.
- Protected routes check `useAuth()` and then query `user_roles` for role gating.
- MFA uses TOTP (stored server-side in `mfa_factors` table).
- Session expiry warning shown at 4 minutes remaining via `useSessionActivity`.

## Row-Level Security

Every user-owned table (`transactions`, `budgets`, `geofences`, `merchants`, etc.) has RLS policies enforcing `user_id = auth.uid()`. Admin queries bypass RLS only from Edge Functions using the service role key stored in Supabase Vault.

## Data Flow — Transaction Entry

```
User fills form
    → Transactions.tsx calls bffClient.processTransaction()
    → Edge Function: process-transaction
        1. Resolve/create merchant record
        2. Match against active geofences (PostGIS or app-level Haversine)
        3. Insert transaction (RLS auto-sets user_id)
        4. Evaluate budget alert rules
        5. Fire anomaly detection
    → React Query invalidates ['transactions'] cache
    → UI re-renders
```

## Data Flow — Receipt OCR

```
User scans receipt (ReceiptCapture component)
    → Camera/file input → base64 encoded
    → supabase.functions.invoke('ocr-receipt', { body: { image } })
    → Edge Function calls Google Vision API
    → Extracts amount, merchant, date
    → Returns structured TransactionInput
    → Pre-fills the Add Transaction form
```

## Data Flow — AI Insights

```
Insights page mounts / user clicks Refresh
    → React Query fetches ['spending-analysis', period]
    → supabase.functions.invoke('ai-analyze-spending', { body: { period } })
    → Edge Function queries transactions for the period
    → Calls Claude/OpenAI to generate insights, patterns, recommendations
    → Returns SpendingAnalysis (cached for 24h by React Query staleTime)
```

## BFF Client (`src/lib/api/bffClient.ts`)

A thin wrapper around `supabase.functions.invoke()` that:
- Attaches `x-request-id` and `x-correlation-id` headers for tracing
- Enforces a 30-second timeout
- Wraps all calls in `measureAsync()` for performance telemetry
- Auto-generates an `idempotency_key` for transaction creation

## Role System

| Role | Access |
|------|--------|
| `user` | All consumer pages (dashboard, transactions, budgets, etc.) |
| `developer` | Above + Monitoring / admin observability |
| `admin` | Above + full Admin dashboard |

Roles are stored in the `user_roles` table. `ProtectedRoute` queries this table on mount when `requireRole` is specified.

## Geofencing

Geofences are circles (center lat/lng + radius in meters). Matching uses the Haversine formula computed in the browser (transaction entry) and in the `process-transaction` Edge Function. The `geofence_id` foreign key is set on transactions for location-based budget filtering.

## Plaid Integration

- `plaid-link-token-create` — creates a Link token; browser opens Plaid Link UI
- `plaid-exchange-token` — exchanges the public token for an access token (stored encrypted in `plaid_accounts`)
- `plaid-webhook` — receives Plaid push events (new transactions, auth updates) and syncs to the `transactions` table
- Card data displayed via `CreditCardGrid` component

## Performance Monitoring

`src/lib/performance/performanceMonitor.ts` wraps async calls in `performance.mark()` / `performance.measure()`. In production, metrics are surfaced via the admin Observability dashboard.

## Anomaly Detection

Transactions are scored after insertion by the `process-transaction` function (or a separate `anomaly-detector` function). Anomalies land in `anomaly_detections` and surface in the Insights page.

## Security

- CSP headers enforced; violations reported via `CSPViolationReporter`
- Rate limiting per user enforced in Edge Functions
- All secrets (API keys, Plaid tokens) stored in Supabase Vault — never in env vars on the function side
- Audit log written for sensitive actions (role changes, data exports, MFA events)
- Session activity timeout after inactivity

## Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Extended user info (first_name, status) |
| `user_roles` | Role assignments |
| `transactions` | All spending records |
| `merchants` | Normalised merchant names |
| `budgets` | Category/period spending limits |
| `budget_alerts` | Threshold breach events |
| `geofences` | Location zones |
| `plaid_accounts` | Linked bank/card accounts |
| `anomaly_detections` | Flagged unusual transactions |
| `mfa_factors` | TOTP secrets |
| `audit_logs` | Security event trail |
