# Phase 2 Production Launch Checklist
## TrueSpend v4.2 - Security & Ingress Layer

**Version**: 1.0  
**Last Updated**: 2025-11-12  
**Pre-Launch Review Date**: ___________

---

## 📋 Pre-Launch Verification

### 1. Security Configuration ✅

#### Layer 4: Modern Safety
- [ ] **CSP Configuration**
  - [ ] Verify production CSP in `src/lib/security/csp.ts`
  - [ ] Confirm `unsafe-inline` and `unsafe-eval` removed in production
  - [ ] Test CSP violation reporting works
  - [ ] Check `csp_violations` table has data retention policy

- [ ] **SRI (Subresource Integrity)**
  - [ ] Confirm SRI hashes in production build (`npm run build`)
  - [ ] Verify integrity attributes on all `<script>` and `<link>` tags
  - [ ] Test asset loading with SRI enabled

- [ ] **Security Headers**
  - [ ] Verify all headers present using browser DevTools
  - [ ] Check HSTS header: `max-age=31536000; includeSubDomains`
  - [ ] Confirm X-Frame-Options: `DENY`
  - [ ] Validate Permissions-Policy restrictions

#### Layer 3: API Gateway
- [ ] **Rate Limiting**
  - [ ] Test rate limit enforcement (exceed 100 req/min)
  - [ ] Verify response headers: `X-RateLimit-*`
  - [ ] Confirm cleanup function runs hourly
  - [ ] Check rate_limits table for proper windowing

- [ ] **Request Validation**
  - [ ] Test API Gateway with invalid requests
  - [ ] Verify JWT validation works
  - [ ] Confirm CORS headers present
  - [ ] Test error response format

- [ ] **Health Checks**
  - [ ] Access `/health-check` endpoint
  - [ ] Verify response includes all metrics
  - [ ] Test from external monitoring tool (optional)

#### Layer 2: Edge & Ingress
- [ ] **Cloudflare CDN**
  - [ ] Verify `cf-ray` header in production
  - [ ] Check `server: cloudflare` header
  - [ ] Confirm TLS 1.3 active
  - [ ] Test global edge routing (use vpn/proxy)
  - [ ] Validate cache behavior for authenticated routes

- [ ] **Cloudflare WAF**
  - [ ] Test curl blocking: `curl https://yourdomain.com`
  - [ ] Confirm browser access works normally
  - [ ] Verify bot detection rules active
  - [ ] Check WAF analytics in Cloudflare dashboard

- [ ] **DDoS Protection**
  - [ ] Confirm unmetered mitigation active (Cloudflare dashboard)
  - [ ] Review attack protection settings
  - [ ] Test rate limiting (application layer)

---

### 2. Database Verification ✅

- [ ] **Schema Integrity**
  - [ ] Confirm `rate_limits` table exists with correct schema
  - [ ] Verify `csp_violations` table structure
  - [ ] Check RLS policies on both tables
  - [ ] Test database functions: `cleanup_old_rate_limits()`, `cleanup_old_csp_violations()`

- [ ] **RLS Policies**
  - [ ] Test admin access to `csp_violations`
  - [ ] Verify users can only view own `rate_limits`
  - [ ] Confirm anonymous CSP reporting works
  - [ ] Test system-level rate limit management

- [ ] **Cleanup Jobs**
  - [ ] Verify hourly cleanup for `rate_limits` (1-hour retention)
  - [ ] Confirm daily cleanup for `csp_violations` (7-day retention)
  - [ ] Check pg_cron schedule (if using)

---

### 3. Edge Functions Deployment ✅

- [ ] **Deployed Functions**
  - [ ] `security-headers` - Status: ✅ / ❌
  - [ ] `rate-limiter` - Status: ✅ / ❌
  - [ ] `api-gateway` - Status: ✅ / ❌
  - [ ] `health-check` - Status: ✅ / ❌
  - [ ] `csp-reporter` - Status: ✅ / ❌

- [ ] **Function Testing**
  - [ ] Test each function individually
  - [ ] Verify CORS headers on all responses
  - [ ] Check error handling for invalid inputs
  - [ ] Confirm logging works (check edge function logs)

- [ ] **Secrets Configuration**
  - [ ] Verify `SUPABASE_URL` secret set
  - [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` secret set
  - [ ] Check `SUPABASE_ANON_KEY` secret set
  - [ ] Test edge functions can connect to database

---

### 4. Integration Testing ✅

- [ ] **Automated Test Suite**
  - [ ] Login as admin: `otherservices51@gmail.com`
  - [ ] Navigate to `/admin/security`
  - [ ] Run Phase 2 Test Suite
  - [ ] Verify all tests pass
  - [ ] Screenshot test results for documentation

- [ ] **Test Categories**
  - [ ] CSP Tests - All passing: ✅ / ❌
  - [ ] Security Headers Tests - All passing: ✅ / ❌
  - [ ] Rate Limiting Tests - All passing: ✅ / ❌
  - [ ] Edge Function Tests - All passing: ✅ / ❌
  - [ ] Cloudflare Tests - All passing: ✅ / ❌

- [ ] **Manual Validation**
  - [ ] Test rate limiting with real user account
  - [ ] Trigger CSP violation intentionally (inline script)
  - [ ] Verify violation appears in admin dashboard
  - [ ] Test WAF blocking with automated tool

---

### 5. Performance Verification ✅

- [ ] **Edge Performance**
  - [ ] CDN response time: Target < 100ms, Actual: _____ms
  - [ ] API Gateway latency: Target < 50ms, Actual: _____ms
  - [ ] Rate limiter overhead: Target < 10ms, Actual: _____ms

- [ ] **Cache Performance**
  - [ ] CDN cache hit rate: Target > 70%, Actual: _____%
  - [ ] Test cache headers for static assets
  - [ ] Verify dynamic content not cached inappropriately

- [ ] **Load Testing** (Optional but Recommended)
  - [ ] Test rate limiter under load (100+ req/min)
  - [ ] Verify WAF handles high traffic
  - [ ] Check database query performance under load

---

### 6. Monitoring & Alerts ⚠️

- [ ] **Cloudflare Alerts**
  - [ ] Configure email alerts for WAF blocks
  - [ ] Set up DDoS attack notifications
  - [ ] Enable traffic spike alerts
  - [ ] Test alert delivery

- [ ] **Security Monitoring**
  - [ ] Set up daily CSP violation review (admin task)
  - [ ] Configure weekly rate limit metrics review
  - [ ] Enable Cloudflare analytics email reports
  - [ ] Create security dashboard bookmark

- [ ] **Health Check Monitoring**
  - [ ] Add `/health-check` to uptime monitor (optional)
  - [ ] Set up incident response workflow
  - [ ] Document escalation procedures

---

### 7. Documentation Review ✅

- [ ] **Technical Documentation**
  - [ ] Review `docs/PHASE2_FINAL_COMPLETION_REPORT.md`
  - [ ] Verify `docs/PHASE2_PRODUCTION_CHECKLIST.md` (this file)
  - [ ] Check `docs/WEBHOOK_SECURITY_GUIDE.md` for future reference
  - [ ] Ensure `docs/CLOUDFLARE_COMPLETE_SETUP.md` is accurate

- [ ] **Operational Documentation**
  - [ ] Create incident response runbook
  - [ ] Document rollback procedures
  - [ ] Write security monitoring playbook
  - [ ] Prepare emergency contact list

- [ ] **Team Training**
  - [ ] Brief team on security dashboard usage
  - [ ] Train on CSP violation investigation
  - [ ] Review rate limit adjustment procedures
  - [ ] Practice incident response scenarios

---

## 🚨 Emergency Procedures

### Incident Response Plan

#### 1. CSP Violation Spike
**Trigger**: > 50 violations in 1 hour  
**Action**:
1. Login to `/admin/security`
2. Review violation patterns in CSP dashboard
3. If legitimate, update CSP policy in `src/lib/security/csp.ts`
4. If attack, investigate source in `csp_violations` table
5. Document incident and resolution

#### 2. Rate Limit Issues
**Trigger**: Legitimate users reporting "Too Many Requests" errors  
**Action**:
1. Check `rate_limits` table for unusual patterns
2. Adjust limits in `supabase/functions/rate-limiter/index.ts`
3. Deploy updated edge function
4. Monitor for 24 hours
5. Communicate changes to affected users

#### 3. WAF False Positives
**Trigger**: Legitimate traffic being blocked  
**Action**:
1. Login to Cloudflare dashboard
2. Navigate to Security > WAF > Activity Log
3. Identify blocking rule
4. Create exception for legitimate pattern
5. Test exception works
6. Document change in `docs/WAF_SETUP.md`

#### 4. CDN/Edge Downtime
**Trigger**: Cloudflare outage or edge function failure  
**Action**:
1. Check Cloudflare status page: https://www.cloudflarestatus.com/
2. If edge functions down, check Supabase status
3. Notify users of temporary service interruption
4. Monitor for restoration
5. Post-mortem after incident resolved

---

## 🔄 Rollback Procedures

### Emergency Rollback Steps

#### Disable Security Features (Last Resort)
1. **Disable CSP** (temporary):
   ```typescript
   // In src/lib/security/csp.ts
   export const csp = {
     defaultSrc: ["'self'", "*"] // Allow all temporarily
   }
   ```

2. **Bypass Rate Limiting**:
   ```typescript
   // In supabase/functions/rate-limiter/index.ts
   // Comment out rate limit check, return 200 immediately
   ```

3. **Disable WAF Rules**:
   - Cloudflare Dashboard > Security > WAF
   - Toggle "Managed Rules" to OFF (temporary)

4. **Revert Deployment**:
   - Lovable: Click "Publish" > "Revert to previous version"
   - Edge Functions: Redeploy previous version from git

### Post-Rollback Actions
1. Investigate root cause
2. Fix issue in development environment
3. Test thoroughly before re-enabling
4. Document incident in post-mortem
5. Update procedures to prevent recurrence

---

## 📊 Success Criteria

### Phase 2 Launch Approval Requirements

All items must be checked ✅ before production launch:

#### Critical Requirements
- [ ] All automated tests passing (100%)
- [ ] Cloudflare CDN active and verified
- [ ] WAF blocking automated tools (curl test passed)
- [ ] DDoS protection active
- [ ] Rate limiting functional
- [ ] CSP violation reporting working
- [ ] Security headers present on all responses
- [ ] SRI hashes on all production assets

#### Important Requirements
- [ ] Admin can access security dashboard
- [ ] Documentation complete and reviewed
- [ ] Team trained on security procedures
- [ ] Monitoring alerts configured
- [ ] Incident response plan documented
- [ ] Rollback procedures tested

#### Optional But Recommended
- [ ] Load testing completed
- [ ] Penetration testing performed (if budget allows)
- [ ] Security audit review (external consultant)
- [ ] Webhook security guide reviewed (for future)

---

## ✅ Launch Approval

### Sign-Off

**Checklist Completed By**: _________________________  
**Date**: _________________________  
**Launch Approved By**: _________________________  
**Launch Date/Time**: _________________________  

### Post-Launch Monitoring Schedule

**First 24 Hours**:
- [ ] Monitor CSP violations every 4 hours
- [ ] Check rate limit metrics every 4 hours
- [ ] Review WAF activity log every 4 hours
- [ ] Verify edge function performance every 2 hours

**First Week**:
- [ ] Daily CSP violation review
- [ ] Daily rate limit analysis
- [ ] Daily WAF summary
- [ ] Daily performance metrics review

**Ongoing**:
- [ ] Weekly security metrics review
- [ ] Monthly security audit
- [ ] Quarterly penetration testing (if applicable)
- [ ] Continuous monitoring via Cloudflare analytics

---

## 📞 Emergency Contacts

**Security Issues**:
- Admin Email: otherservices51@gmail.com
- Security Dashboard: `/admin/security`

**Cloudflare Support**:
- Dashboard: https://dash.cloudflare.com/
- Support: https://support.cloudflare.com/
- Status: https://www.cloudflarestatus.com/

**Supabase Support**:
- Dashboard: (Access via Lovable Cloud interface)
- Edge Function Logs: Lovable > Cloud > Edge Functions

---

**Checklist Version**: 1.0  
**Last Updated**: 2025-11-12  
**Next Review**: Start of Phase 3  
**Status**: ⚠️ **AWAITING FINAL VERIFICATION**
