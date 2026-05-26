# Production Readiness Checklist

Items that must be completed before public launch. Grouped by priority.

---

## P0 — Blocking (cannot ship without these)

### Stripe Production Activation
- [x] Add `stripe-create-checkout-session` Edge Function to create checkout sessions
- [x] Add `stripe-webhook` Edge Function to handle payment events
- [x] Add `stripe-create-portal-session` Edge Function for customer self-service
- [x] Add `stripe-update-subscription` Edge Function for plan changes
- [x] Add `subscriptions` table (plan, status, stripe_customer_id, stripe_subscription_id)
- [x] Gate premium features behind subscription status
- [x] Add Pricing page CTA that routes users to billing after login
- [ ] Configure real Stripe products and price IDs in production
- [ ] Configure Stripe webhook endpoint and signing secret in Supabase secrets
- [ ] Run Stripe test-mode webhook replay for create/update/cancel/payment-failed events
- [ ] Decide whether Razorpay is needed for India-first payments after Stripe is live

### Test Coverage
- [ ] Unit tests for business logic (budget calculations, geofence matching, OCR parsing)
- [ ] Integration tests for Edge Functions (process-transaction, ai-categorize, plaid flows)
- [ ] E2E tests for critical paths: sign-up → add transaction → view dashboard, budget creation, Plaid linking
- [ ] Playwright tests exist, but auth/billing/Plaid happy-path and failure-path coverage must be refreshed

### CI/CD Pipeline
- [ ] GitHub Actions workflow: lint → type-check → test → build on every PR
- [ ] Automatic deploy to staging on merge to `main`
- [ ] Manual promotion gate to production
- [ ] Edge Function deploy step in CI

### Error Monitoring
- [ ] Add Sentry (or equivalent) SDK to the frontend
- [ ] Add structured error reporting in Edge Functions
- [ ] Set up alert rules for error rate spikes

---

## P1 — High Priority (ship within first sprint after launch)

### Plaid Webhook Hardening
- [ ] Verify `plaid-webhook` handles all event types (TRANSACTIONS_REMOVED, PENDING → POSTED)
- [ ] Add idempotency check on webhook ingestion
- [ ] Store raw webhook payload for replay

### Email Transactional Flows
- [ ] Budget threshold alert emails (currently only in-app notifications)
- [ ] Weekly spending summary email
- [ ] Anomaly detected email

### User Dashboard — Real Data
- [x] Replace hardcoded dashboard totals with real monthly transaction/receipt query
- [ ] Validate dashboard metrics against seeded production-like data

### Credit Card Sync
- [x] Add Plaid sync function and webhook path for transaction updates
- [ ] Dedup detection when manual + Plaid transactions overlap

### Admin Dashboard Data
- [ ] Many admin pages show mock/static data — connect real queries
- [ ] `Metrics`, `Optimization`, `Performance`, `RealTimeMetrics` pages need live data sources

---

## P2 — Important (within first month)

### Mobile (Capacitor)
- [ ] Test iOS build end-to-end
- [ ] Test Android build end-to-end
- [ ] Push notification wiring for budget alerts
- [ ] Background geolocation permissions flow

### OCR Reliability
- [ ] Fallback chain (Google Vision → HuggingFace) needs end-to-end test
- [ ] Handle receipts with no clear amount (user confirmation step)

### Observability
- [ ] Connect admin Observability / Performance dashboards to real metrics
- [ ] Set up uptime monitoring (Better Uptime, Checkly, or similar)
- [ ] SLO targets defined and tracked

### Security Hardening
- [ ] Penetration test or third-party security review
- [ ] Verify all RLS policies cover edge cases (admin service-role bypass scoped correctly)
- [ ] Rate limit tuning based on real usage patterns
- [ ] CORS policy review on Edge Functions

### Performance
- [ ] Continue code-splitting large vendor/admin/diagram chunks
- [ ] Lazy-load admin pages (currently eagerly imported in App.tsx)
- [ ] Implement `staleTime` / `gcTime` tuning per query based on data freshness needs

---

## P3 — Nice-to-Have (post-launch backlog)

- [ ] Native bank import via Plaid for non-US banks (Open Banking / TrueLayer)
- [ ] Multi-currency support
- [ ] CSV import for transaction history migration
- [ ] Shared budgets (household/couples mode)
- [ ] Recurring transaction detection and auto-categorisation
- [ ] Budget templates (preset category allocations)
- [ ] AI chat interface for natural-language spending queries
- [ ] Dark/light mode persistence per user (currently system-based)
- [ ] Browser extension for automatic transaction capture

---

## Known Issues

| Issue | File | Severity |
|-------|------|----------|
| Admin/internal pages include mock or partially wired operational data | `src/pages/internal/*.tsx`, `src/features/observability/pages/*.tsx` | Medium |
| Large vendor and diagram chunks remain | `vite.config.ts` | Low |
| Browserslist data outdated | `package.json` | Low |
