# Production Launch Checklist - Option A Strategy

**Launch Date:** [TBD]  
**Strategy:** Deploy Phases 2, 4, 5 immediately. Complete Phase 1 integration post-launch.  
**Deployed Features:** Core transactions, budgets, AI categorization, security, authentication  
**Deferred Features:** Offline storage, OCR extraction, adaptive loading, geofencing

---

## Pre-Launch Verification ✅

### Phase Readiness Status
- [x] **Phase 1**: 70% (New code added but not integrated)
- [x] **Phase 2**: 100% (Security & Ingress - Production Ready)
- [ ] **Phase 3**: 50% (Geofencing - Partially Ready, not launching)
- [x] **Phase 4**: 100% (Auth & Supply Chain - Production Ready)
- [x] **Phase 5**: 100% (Core Services - Production Ready)

### Feature Flags Configuration
- [x] `offline_storage` - **DISABLED** (0% rollout)
- [x] `ocr_extraction` - **DISABLED** (0% rollout)
- [x] `adaptive_loading` - **DISABLED** (0% rollout)
- [x] `geofencing` - **DISABLED** (0% rollout)

---

## 1. Environment & Secrets Verification (30 mins)

### Required Secrets (Lovable Cloud)
Check all secrets are configured in Project Settings → Secrets:

**Authentication:**
- [ ] `SITE_URL` - Production domain (e.g., `https://truespend.com`)
- [ ] `SUPABASE_URL` - Auto-configured by Lovable Cloud
- [ ] `SUPABASE_ANON_KEY` - Auto-configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

**Email Services:**
- [ ] `RESEND_API_KEY` - For transactional emails
- [ ] `RESEND_FROM_EMAIL` - Verified sender email

**AI Services:**
- [ ] `LOVABLE_API_KEY` - For AI categorization (Lovable AI)

**Google Maps (If using):**
- [ ] `GOOGLE_MAPS_FRONTEND_KEY` - Restricted to production domain
- [ ] `GOOGLE_MAPS_BACKEND_KEY` - IP-restricted for edge functions

**Foursquare (If using):**
- [ ] `FOURSQUARE_API_KEY` - For place enrichment

**Firebase (For native apps):**
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` - For FCM notifications
- [ ] `FIREBASE_PROJECT_ID` - Firebase project identifier

### Environment Variables (.env - Auto-configured)
These are managed automatically by Lovable Cloud:
- [x] `VITE_SUPABASE_URL`
- [x] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [x] `VITE_SUPABASE_PROJECT_ID`

---

## 2. Security Configuration (2-3 hours)

### A. Database Security
Run security linter and fix critical issues:
```bash
# Check RLS policies
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_policies WHERE schemaname = 'public'
);
```

**Existing Warnings (Non-Critical):**
- [ ] 8 functions missing `SET search_path = 'public'` (Low risk - monitor)
- [ ] 1 extension in public schema (Low risk - pgcrypto needed)

**Critical Checks:**
- [x] All user tables have RLS enabled
- [x] No tables expose data without auth check
- [x] Sensitive data (PII) is encrypted in vault
- [x] Password reset tokens expire correctly

### B. Authentication Configuration
Configure Supabase Auth (Cloud Dashboard → Authentication):

**Email Settings:**
- [ ] Enable email provider
- [ ] Auto-confirm email signups: **ENABLED** (for testing)
- [ ] Set production email templates
- [ ] Configure email rate limits (10/hour per email)

**Google OAuth (Optional):**
- [ ] Add Google client ID/secret
- [ ] Whitelist production redirect URL
- [ ] Test Google sign-in flow

**Security Settings:**
- [ ] Password requirements: Min 8 chars, 1 uppercase, 1 number, 1 special
- [ ] Account lockout: 5 failed attempts = 15 min lock
- [ ] Session timeout: 7 days
- [ ] MFA enforcement: Optional (users can enable)

**Redirect URLs:**
- [ ] Production: `https://truespend.com/**`
- [ ] Local: `http://localhost:5173/**` (for development)

### C. Edge Functions Deployment
All edge functions deploy automatically with code push:
- [x] `bff-dashboard` - Dashboard data aggregation
- [x] `ai-categorize-transaction` - AI-powered categorization
- [x] `process-transaction` - Transaction processing
- [x] `rate-limiter` - API rate limiting
- [x] `security-headers` - CSP and security headers
- [x] `csp-reporter` - CSP violation tracking
- [x] `health-check` - Service health monitoring
- [x] `ocr-process-receipt` - Receipt OCR (NOT ACTIVE - feature flag OFF)
- [x] All MFA functions (totp, backup codes, etc.)
- [x] All email functions (verification, password reset, etc.)

**Verify Deployment:**
- [ ] Check function logs for errors (Cloud Dashboard → Functions)
- [ ] Test critical endpoints:
  - `POST /bff-dashboard` - Returns 200 with valid JWT
  - `POST /ai-categorize-transaction` - Returns category
  - `GET /health-check` - Returns `{"status": "healthy"}`

---

## 3. Cloudflare CDN & Security (2-3 hours)

### A. DNS Configuration
1. [ ] Add domain to Cloudflare
2. [ ] Update nameservers at domain registrar
3. [ ] Wait for DNS propagation (up to 48 hours)

### B. SSL/TLS Setup
- [ ] Enable "Full (Strict)" SSL/TLS mode
- [ ] Enable "Always Use HTTPS"
- [ ] Enable HTTP Strict Transport Security (HSTS)
- [ ] Set minimum TLS version to 1.2

### C. CDN Configuration
- [ ] Enable Cloudflare Proxy (orange cloud)
- [ ] Set caching rules:
  - `/*.html` - No cache
  - `/assets/*` - Cache 1 year
  - `/meta.json` - Cache 1 hour
  - `/` - No cache

### D. WAF (Web Application Firewall)
- [ ] Enable Cloudflare WAF
- [ ] Set security level: "Medium"
- [ ] Enable bot fight mode
- [ ] Configure rate limiting:
  - 100 requests/10 seconds per IP
  - 1000 requests/hour per IP

### E. DDoS Protection
- [ ] Enable "I'm Under Attack" mode (if needed)
- [ ] Configure challenge page
- [ ] Set up alerts for traffic spikes

### F. Security Headers (Automatic via `security-headers` edge function)
Verify these headers are present:
- [ ] `Strict-Transport-Security: max-age=31536000`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Content-Security-Policy` - See `src/lib/security/csp.ts`

---

## 4. Snyk Security Scanning (30 mins)

### Setup
1. [ ] Go to https://app.snyk.io
2. [ ] Connect GitHub repository
3. [ ] Run initial vulnerability scan
4. [ ] Fix critical/high vulnerabilities (if any)

### GitHub Integration
Add Snyk token to GitHub secrets:
1. [ ] Go to GitHub repo → Settings → Secrets
2. [ ] Add secret: `SNYK_TOKEN` = [Your Snyk API token]
3. [ ] Verify workflow runs: `.github/workflows/snyk-security.yml`

### Ongoing Monitoring
- [ ] Enable Snyk PR checks (block merges with critical vulns)
- [ ] Set up Slack/email notifications for new vulnerabilities
- [ ] Weekly vulnerability review process

---

## 5. Monitoring & Alerts (1 hour)

### A. Error Tracking
**Cloudflare Logs:**
- [ ] Enable Cloudflare Logpush (if on paid plan)
- [ ] Configure error alerts (500 errors > 10/min)

**Database Logs:**
- [ ] Monitor failed login attempts (Cloud Dashboard → Database → Logs)
- [ ] Alert on repeated failed MFA attempts
- [ ] Track CSP violations in `csp_violations` table

### B. Uptime Monitoring
**Recommended Tools:**
- [ ] UptimeRobot (free tier) - https://uptimerobot.com
- [ ] Pingdom (paid)
- [ ] StatusCake (free tier)

**Monitored Endpoints:**
- [ ] `https://truespend.com` - Every 5 minutes
- [ ] `https://truespend.com/api/health-check` - Every 5 minutes
- [ ] Alert if down for > 2 checks

### C. Performance Monitoring
**Cloudflare Analytics:**
- [ ] Monitor bandwidth usage
- [ ] Track cache hit rate (target: >80%)
- [ ] Review geographic traffic distribution

**Custom Metrics (Optional):**
- [ ] Google Analytics 4 for user behavior
- [ ] Sentry for error tracking
- [ ] LogRocket for session replay

---

## 6. Final Testing (2-3 hours)

### A. Authentication Flow
Test all auth scenarios:
- [ ] Email signup → verify email → login
- [ ] Google OAuth signup → login
- [ ] Password reset flow
- [ ] MFA setup → login with TOTP
- [ ] MFA login with backup code
- [ ] Account lockout after 5 failed attempts
- [ ] Session expiration after 7 days

### B. Core Functionality
- [ ] Create transaction → auto-categorize (AI)
- [ ] Edit transaction → update category manually
- [ ] Delete transaction
- [ ] Create budget → set alert threshold
- [ ] Trigger budget alert (spend 90% of limit)
- [ ] View insights/analytics

### C. Security Testing
- [ ] Verify RLS policies (try accessing other user's data)
- [ ] Test XSS prevention (input `<script>alert('xss')</script>`)
- [ ] Test SQL injection (input `'; DROP TABLE users;--`)
- [ ] Verify CORS restrictions (make request from unauthorized domain)
- [ ] Test rate limiting (make 101 requests in 10 seconds)

### D. Performance Testing
Run Lighthouse audit (Chrome DevTools):
- [ ] Performance score: >90
- [ ] Accessibility score: >90
- [ ] Best Practices score: >90
- [ ] SEO score: >90

**Key Metrics:**
- [ ] First Contentful Paint (FCP): <1.8s
- [ ] Largest Contentful Paint (LCP): <2.5s
- [ ] Time to Interactive (TTI): <3.8s
- [ ] Cumulative Layout Shift (CLS): <0.1

### E. Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 7. Deployment Steps (30 mins)

### A. Pre-Deployment
- [ ] Merge all pending PRs to `main` branch
- [ ] Run full test suite locally
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Create Git tag: `v1.0.0-production-launch`

### B. Deploy to Production
**Via Lovable:**
1. [ ] Click "Publish" button (top right)
2. [ ] Review changes in deploy preview
3. [ ] Click "Update" to deploy frontend
4. [ ] Wait for build to complete (~2-3 minutes)
5. [ ] Verify deployment URL matches production domain

**Edge Functions:**
- [x] Auto-deploy with code push (no manual action needed)

### C. Post-Deployment Verification (Within 5 minutes)
- [ ] Visit production URL: `https://truespend.com`
- [ ] Check browser console for errors
- [ ] Login with test account
- [ ] Create test transaction
- [ ] Verify database write (check Cloud Dashboard → Database)
- [ ] Check edge function logs for errors

### D. First Hour Monitoring
- [ ] Monitor error rate (target: <0.5%)
- [ ] Check response times (p95 <200ms)
- [ ] Review CSP violations (should be zero)
- [ ] Monitor auth success rate (target: >98%)

### E. First 24 Hours
- [ ] Review Cloudflare analytics (traffic, threats blocked)
- [ ] Check Snyk for new vulnerabilities
- [ ] Monitor user feedback (support email/chat)
- [ ] Review database performance (slow queries)

---

## 8. Rollback Plan (Emergency)

### If Critical Issues Arise:

**Frontend Rollback (Via Lovable):**
1. [ ] Go to Project Settings → Versions
2. [ ] Click "Restore" on previous stable version
3. [ ] Wait for redeployment (~2 minutes)
4. [ ] Verify rollback success

**Database Rollback (DANGEROUS - Avoid if possible):**
1. [ ] Identify problematic migration
2. [ ] Create down-migration SQL
3. [ ] Run in Cloud Dashboard → Database → SQL Editor
4. [ ] Verify data integrity

**Edge Functions Rollback:**
1. [ ] Revert Git commit with function changes
2. [ ] Push to `main` branch
3. [ ] Wait for auto-deployment (~1 minute)

**Incident Response:**
- [ ] Post status update (StatusPage/Twitter)
- [ ] Notify users via email (if major outage)
- [ ] Document incident in `docs/INCIDENTS.md`
- [ ] Schedule postmortem meeting

---

## 9. Post-Launch Phase 1 Integration (Weeks 1-2)

### Week 1: Gradual Feature Rollout
**Offline Storage (Days 1-3):**
- [ ] Enable for 10% of users (update feature flag)
- [ ] Monitor sync errors
- [ ] Check IndexedDB quota usage
- [ ] Expand to 50% if stable

**Adaptive Loading (Days 4-5):**
- [ ] Enable for 10% of users
- [ ] Monitor request timeouts
- [ ] Verify image quality reduction on slow networks
- [ ] Expand to 100% if stable

**OCR Extraction (Days 6-7):**
- [ ] Enable for 5% of users (beta testers)
- [ ] Monitor Lovable AI usage/costs
- [ ] Check OCR accuracy (>80% target)
- [ ] Collect user feedback

### Week 2: Full Rollout
- [ ] Offline storage: 100%
- [ ] Adaptive loading: 100%
- [ ] OCR extraction: 50% (gradual rollout)
- [ ] Update documentation with new features
- [ ] Announce feature launch (blog post/email)

---

## 10. Success Metrics (First 30 Days)

### Technical Metrics
- [ ] Uptime: >99.9% (target: 99.95%)
- [ ] Error rate: <0.5% (target: <0.1%)
- [ ] P95 response time: <200ms (target: <150ms)
- [ ] Database latency: <50ms (target: <30ms)
- [ ] Cache hit rate: >80% (target: >90%)

### Security Metrics
- [ ] Zero critical vulnerabilities (Snyk)
- [ ] Zero RLS bypass incidents
- [ ] CSP violations: <10/day (target: 0)
- [ ] Failed login rate: <5% (target: <2%)
- [ ] MFA adoption: >20% of users

### User Metrics
- [ ] User signups: [Target TBD]
- [ ] Daily active users (DAU): [Target TBD]
- [ ] Transaction creation rate: [Target TBD]
- [ ] User retention (Day 7): >40%
- [ ] Support tickets: <10/day

### Cost Metrics
- [ ] Lovable Cloud: ~$100/month (estimated)
- [ ] Lovable AI: ~$50/month (estimated)
- [ ] Cloudflare: $0-20/month (Free or Pro plan)
- [ ] Domain: ~$15/year
- [ ] Total: ~$180-200/month

---

## 11. Support & Communication

### Support Channels
- **Email:** support@truespend.com
- **Discord:** [Community link]
- **GitHub Issues:** [For bug reports]

### Team Contacts
- **Tech Lead:** [Name/Email]
- **Security Lead:** [Name/Email]
- **DevOps:** [Name/Email]

### External Support
- **Lovable Support:** support@lovable.dev
- **Cloudflare Support:** https://dash.cloudflare.com/support
- **Supabase Support:** https://supabase.com/support (via Lovable Cloud)

---

## 12. Final Sign-Off

### Required Approvals
- [ ] **Tech Lead:** _________________________ Date: _______
- [ ] **Security Lead:** ______________________ Date: _______
- [ ] **Product Owner:** ______________________ Date: _______

### Documentation Complete
- [x] Production deployment checklist (this document)
- [x] Phase 1-5 implementation docs
- [ ] User onboarding guide
- [ ] API documentation (if applicable)
- [ ] Incident response playbook

### Team Training
- [ ] Team briefed on launch process
- [ ] On-call rotation scheduled (first 2 weeks)
- [ ] Runbook reviewed with team

---

## 🎉 Launch Ready!

**Congratulations!** You've completed all pre-launch tasks. Your production environment is:
- ✅ Secure (WAF, CSP, RLS, MFA)
- ✅ Monitored (Uptime, Errors, Performance)
- ✅ Tested (Auth, Core Features, Security)
- ✅ Documented (Checklists, Runbooks, APIs)

**Next Steps:**
1. Schedule launch date/time (off-peak hours recommended)
2. Prepare launch announcement (blog, social media, email)
3. Monitor closely for first 48 hours
4. Iterate based on user feedback

**Phase 1 Integration Timeline:**
- Week 1: Offline storage (10% → 100%)
- Week 1: Adaptive loading (10% → 100%)
- Week 2: OCR extraction (5% → 50%)
- Week 3-4: Complete Phase 1 at 100%

---

## Related Documentation
- [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) (Detailed version)
- [PHASE_1_2_3_PRODUCTION_READINESS_REPORT.md](./PHASE_1_2_3_PRODUCTION_READINESS_REPORT.md)
- [PHASE2_PRODUCTION_CHECKLIST.md](./PHASE2_PRODUCTION_CHECKLIST.md)
- [SECURITY_HEADERS.md](./SECURITY_HEADERS.md)
- [WAF_SETUP.md](./WAF_SETUP.md)
- [CDN_SETUP.md](./CDN_SETUP.md)
- [CLOUDFLARE_COMPLETE_SETUP.md](./CLOUDFLARE_COMPLETE_SETUP.md)
