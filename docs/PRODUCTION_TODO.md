# Production Readiness Checklist

Items that must be completed before public launch. Grouped by priority.

---

## P0 — Blocking (cannot ship without these)

### Stripe Subscription Integration
- [ ] Add `stripe-checkout` Edge Function to create checkout sessions
- [ ] Add `stripe-webhook` Edge Function to handle payment events
- [ ] Add `subscriptions` table (plan, status, stripe_customer_id, stripe_subscription_id)
- [ ] Gate premium features behind subscription status
- [ ] Add Pricing page CTA that links to Stripe Checkout

### Test Coverage
- [ ] Unit tests for business logic (budget calculations, geofence matching, OCR parsing)
- [ ] Integration tests for Edge Functions (process-transaction, ai-categorize, plaid flows)
- [ ] E2E tests for critical paths: sign-up → add transaction → view dashboard, budget creation, Plaid linking
- [ ] Current Playwright setup exists but test suite is empty

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
- [ ] `UserDashboard.tsx` shows hardcoded $0.00 / 0 receipts — wire up real queries
- [ ] Connect "Coming Soon" feature cards to actual routes

### Credit Card Sync
- [ ] Auto-sync Plaid transactions on webhook receive (not just on-demand)
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
- [ ] Code-split the main chunk (currently 3.2 MB — Mermaid, Cytoscape, Katex bloat admin pages)
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
| `UserDashboard` shows static $0.00 totals | `src/pages/UserDashboard.tsx` | Medium |
| Admin pages show mock data | `src/pages/dashboard/*.tsx` | Medium |
| Build chunk too large (3.2 MB index.js) | `vite.config.ts` | Low |
| Browserslist data outdated | `package.json` | Low |
| `@import` in CSS must precede `@layer` | `src/index.css` | Low (CSS warning only) |
