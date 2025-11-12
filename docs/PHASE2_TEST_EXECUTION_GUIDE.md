# Phase 2 Test Execution Guide
## TrueSpend v4.2 - Security Integration Testing

**Version**: 1.0  
**Last Updated**: 2025-11-12  
**For**: Admin Users (otherservices51@gmail.com)

---

## 📋 Overview

This guide provides step-by-step instructions for executing the Phase 2 security integration tests at `/admin/security`. These tests verify that all security layers (Layer 2: Edge & Ingress, Layer 3: API Gateway, Layer 4: Modern Safety) are functioning correctly.

---

## 🔐 Prerequisites

1. **Admin Access Required**:
   - You must be logged in as an admin user
   - Email: `otherservices51@gmail.com`
   - Role: `admin` (verified via user_roles table)

2. **Browser Requirements**:
   - Modern browser (Chrome, Firefox, Safari, Edge)
   - JavaScript enabled
   - Developer tools access (F12)

3. **Network Access**:
   - Stable internet connection
   - No VPN/proxy that might interfere with Cloudflare
   - Access to Cloudflare dashboard (for verification)

---

## 🧪 Test Suite Overview

The Phase 2 Test Suite (`/admin/security`) includes 5 categories:

### 1. CSP Tests (Content Security Policy)
**Purpose**: Verify CSP headers are correctly configured  
**Tests**:
- ✅ CSP header presence
- ✅ `default-src` directive validation
- ✅ `script-src` directive validation (no unsafe-inline/eval in production)
- ✅ `style-src` directive validation
- ✅ `img-src` directive validation
- ✅ `connect-src` directive validation
- ✅ CSP violation reporting mechanism

**Expected Results**: All tests passing (7/7)

---

### 2. Security Headers Tests
**Purpose**: Ensure all security headers are present  
**Tests**:
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy` configured
- ✅ `Permissions-Policy` restrictions
- ✅ `Strict-Transport-Security` (HSTS) with max-age=31536000

**Expected Results**: All tests passing (5/5)

---

### 3. Rate Limiting Tests
**Purpose**: Validate API Gateway rate limiting  
**Tests**:
- ✅ Rate limit enforcement (100 req/min per user)
- ✅ Response headers present (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- ✅ Window-based tracking (60-second windows)
- ✅ User-specific limiting via auth.uid()
- ✅ Database logging of rate limit events

**Expected Results**: All tests passing (5/5)

---

### 4. Edge Function Tests
**Purpose**: Verify edge functions are deployed and operational  
**Tests**:
- ✅ `security-headers` function responding
- ✅ `rate-limiter` function active
- ✅ `api-gateway` routing requests
- ✅ `health-check` endpoint returning metrics
- ✅ `csp-reporter` accepting violation reports

**Expected Results**: All tests passing (5/5)

---

### 5. Cloudflare Integration Tests
**Purpose**: Confirm CDN, WAF, and DDoS protection active  
**Tests**:
- ✅ CDN headers present (`cf-ray`, `server: cloudflare`)
- ✅ TLS 1.3 enabled
- ✅ Cache behavior appropriate for authenticated app
- ✅ WAF blocking automated tools (curl test)
- ✅ DDoS protection active (Cloudflare Free Tier)

**Expected Results**: All tests passing (5/5)

---

## 🚀 Step-by-Step Test Execution

### Step 1: Access Security Dashboard

1. Open your browser
2. Navigate to: `https://yourdomain.com/` (or preview URL)
3. **Login** with admin credentials:
   - Email: `otherservices51@gmail.com`
   - Password: [your password]
4. From the **Dashboard Hub**, click **Project Management**
5. Expand the section and click **Security**
6. Alternatively, navigate directly to: `https://yourdomain.com/admin/security`

---

### Step 2: Open Browser Developer Tools

1. Press **F12** (Windows/Linux) or **Cmd+Option+I** (Mac)
2. Go to **Console** tab
3. Keep this open to monitor test execution logs

---

### Step 3: Run Phase 2 Test Suite

1. On the Security Dashboard page, locate the **Phase 2 Test Suite** section
2. Click the **"Run Phase 2 Tests"** button
3. **Wait** for all tests to execute (typically 30-60 seconds)
4. Observe the progress indicator

---

### Step 4: Review Test Results

#### Success Indicators
- ✅ **Green checkmarks** = Test passed
- ⚠️ **Yellow warning** = Test passed with warnings
- ❌ **Red X** = Test failed

#### Expected Output
```
Phase 2 Integration Tests - Results
====================================

✅ CSP Tests (7/7 passed)
  ✅ CSP header present
  ✅ default-src configured
  ✅ script-src secure (no unsafe-inline in prod)
  ✅ style-src configured
  ✅ img-src configured
  ✅ connect-src configured
  ✅ Violation reporting active

✅ Security Headers (5/5 passed)
  ✅ X-Frame-Options: DENY
  ✅ X-Content-Type-Options: nosniff
  ✅ Referrer-Policy: strict-origin-when-cross-origin
  ✅ Permissions-Policy configured
  ✅ Strict-Transport-Security active

✅ Rate Limiting (5/5 passed)
  ✅ Rate limits enforced
  ✅ Response headers present
  ✅ Window tracking functional
  ✅ User-specific limits active
  ✅ Database logging working

✅ Edge Functions (5/5 passed)
  ✅ security-headers deployed
  ✅ rate-limiter deployed
  ✅ api-gateway deployed
  ✅ health-check deployed
  ✅ csp-reporter deployed

✅ Cloudflare Integration (5/5 passed)
  ✅ CDN headers present (cf-ray)
  ✅ TLS 1.3 active
  ✅ Cache behavior correct
  ✅ WAF blocking automated tools
  ✅ DDoS protection active

====================================
Total: 27/27 tests passed ✅
Status: PRODUCTION READY 🚀
====================================
```

---

### Step 5: Manual Verification Tests

Even with automated tests passing, perform these manual checks:

#### A. Test CSP Violation Reporting

1. Open browser console (F12 > Console)
2. Paste this code to trigger a CSP violation:
   ```javascript
   eval('console.log("CSP Test")');
   ```
3. Check for CSP violation error in console
4. Navigate to Security Dashboard > CSP Violations widget
5. **Verify**: New violation logged in last few minutes

#### B. Test WAF Blocking

1. Open terminal/command prompt
2. Run this command (should be blocked):
   ```bash
   curl https://yourdomain.com/
   ```
3. **Expected Result**: 403 Forbidden or "Access Denied"
4. Try from browser (should work):
   ```
   Open https://yourdomain.com/ in browser
   ```
5. **Expected Result**: Page loads successfully

#### C. Test Rate Limiting

1. Open browser console (F12 > Console)
2. Paste this code to make rapid requests:
   ```javascript
   for (let i = 0; i < 110; i++) {
     fetch('/functions/v1/health-check')
       .then(r => console.log(`Request ${i}: ${r.status}`));
   }
   ```
3. **Expected**: First ~100 requests succeed (200), then 429 (Too Many Requests)
4. Check response headers on 429 response:
   ```
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: [timestamp]
   ```

#### D. Verify Cloudflare Headers

1. Open Network tab in developer tools (F12 > Network)
2. Refresh the page (Ctrl+R / Cmd+R)
3. Click on the first request (document)
4. Go to **Headers** section
5. **Verify presence** of:
   - `cf-ray: [unique-id]`
   - `server: cloudflare`
   - `cf-cache-status: DYNAMIC` (for auth pages)

#### E. Test Security Headers

1. Still in Network tab > Headers
2. Scroll to **Response Headers**
3. **Verify** all present:
   - `x-frame-options: DENY`
   - `x-content-type-options: nosniff`
   - `referrer-policy: strict-origin-when-cross-origin`
   - `permissions-policy: camera=(), microphone=(), geolocation=()`
   - `strict-transport-security: max-age=31536000; includeSubDomains`

---

### Step 6: Check Edge Function Logs

1. Access Lovable Cloud:
   - Open Lovable project
   - Navigate to **Cloud** > **Edge Functions**
2. Check logs for each function:
   - `security-headers` - Should show header injection logs
   - `rate-limiter` - Look for rate limit checks
   - `health-check` - Verify health check calls
   - `csp-reporter` - Check for violation reports
3. **Note any errors** for investigation

---

### Step 7: Verify Database Records

#### Check Rate Limits Table

1. Navigate to Lovable Cloud > Database > SQL Editor
2. Run this query:
   ```sql
   SELECT 
     endpoint,
     COUNT(*) as request_count,
     MAX(window_start) as latest_window
   FROM rate_limits
   WHERE window_start >= NOW() - INTERVAL '1 hour'
   GROUP BY endpoint;
   ```
3. **Expected**: Recent entries showing rate limit tracking

#### Check CSP Violations Table

1. Run this query:
   ```sql
   SELECT 
     violated_directive,
     COUNT(*) as violation_count,
     MAX(timestamp) as latest_violation
   FROM csp_violations
   WHERE timestamp >= NOW() - INTERVAL '24 hours'
   GROUP BY violated_directive
   ORDER BY violation_count DESC;
   ```
2. **Expected**: Few or zero violations (0-5 per day is normal)

---

### Step 8: Cloudflare Dashboard Verification

1. Login to Cloudflare: https://dash.cloudflare.com/
2. Select your domain
3. Navigate to **Security > Analytics**
4. **Verify**:
   - Total requests graph shows traffic
   - Threats mitigated count
   - WAF events logged
5. Go to **Security > WAF**
6. **Check**:
   - Managed Rules: **Enabled**
   - Custom Rules: Should show your custom rules (e.g., "Block curl")
7. Go to **Security > Bots**
8. **Verify**: Bot Fight Mode active

---

## 📊 Test Results Documentation

### Record Your Results

Fill out this checklist after test execution:

```
Phase 2 Integration Test Results
================================
Date: __________________
Tester: otherservices51@gmail.com
Environment: Production / Staging

Automated Tests:
[ ] CSP Tests: __/7 passed
[ ] Security Headers: __/5 passed
[ ] Rate Limiting: __/5 passed
[ ] Edge Functions: __/5 passed
[ ] Cloudflare Integration: __/5 passed

Total Automated: __/27 passed

Manual Verification:
[ ] CSP violation reporting works
[ ] WAF blocks curl requests
[ ] WAF allows browser requests
[ ] Rate limiting enforces 100 req/min
[ ] Cloudflare headers present
[ ] All security headers present
[ ] Edge function logs clean
[ ] Database records present

Overall Status: PASS / FAIL / NEEDS ATTENTION

Issues Found:
___________________________________________
___________________________________________
___________________________________________

Next Actions:
___________________________________________
___________________________________________
___________________________________________

Signed: ___________________  Date: _______
```

---

## 🚨 Common Issues & Troubleshooting

### Issue 1: CSP Tests Failing

**Symptom**: Missing or incorrect CSP headers  
**Check**:
- Verify `src/lib/security/csp.ts` is correctly configured
- Check if running in development mode (unsafe-inline/eval allowed)
- Review browser console for CSP errors

**Fix**:
```bash
# Rebuild application
npm run build

# Verify production CSP
curl -I https://yourdomain.com/ | grep -i content-security-policy
```

---

### Issue 2: Rate Limiting Not Working

**Symptom**: Can exceed 100 requests per minute  
**Check**:
- Verify rate-limiter edge function deployed
- Check `rate_limits` table exists
- Ensure user is authenticated (rate limiting per user)

**Fix**:
1. Redeploy rate-limiter edge function
2. Check edge function logs for errors
3. Verify database connection in edge function

---

### Issue 3: Cloudflare Headers Missing

**Symptom**: No `cf-ray` or `server: cloudflare` headers  
**Check**:
- Verify domain is proxied through Cloudflare (orange cloud icon)
- Check DNS settings in Cloudflare dashboard
- Ensure SSL/TLS mode is "Full (strict)"

**Fix**:
1. Login to Cloudflare dashboard
2. Select your domain
3. Go to DNS settings
4. Ensure proxy status is "Proxied" (orange cloud)
5. Wait 5 minutes for changes to propagate

---

### Issue 4: WAF Not Blocking Curl

**Symptom**: Curl requests succeed when they should be blocked  
**Check**:
- Verify WAF is enabled in Cloudflare
- Check custom WAF rules exist
- Ensure Security Level is at least "Medium"

**Fix**:
1. Cloudflare Dashboard > Security > WAF
2. Enable "Managed Rules"
3. Create custom rule:
   ```
   (http.user_agent contains "curl")
   Action: Block
   ```
4. Test after 1-2 minutes

---

### Issue 5: Security Headers Missing

**Symptom**: Some headers not present in responses  
**Check**:
- Verify security-headers edge function deployed
- Check edge function logs for errors
- Ensure Cloudflare is not stripping headers

**Fix**:
1. Redeploy security-headers edge function
2. Check function code for typos
3. Test with: `curl -I https://yourdomain.com/`

---

## 📈 Success Criteria

### Phase 2 PASS Requirements

To mark Phase 2 as successfully completed and production-ready:

✅ **All automated tests passing (27/27)**  
✅ **All manual verification tests completed**  
✅ **CSP violations < 10 per day**  
✅ **Rate limiting enforces 100 req/min limit**  
✅ **WAF blocks automated tools (curl)**  
✅ **WAF allows legitimate browser traffic**  
✅ **Cloudflare headers present on all requests**  
✅ **All security headers present**  
✅ **Edge functions deployed and operational**  
✅ **Database tables properly logging events**  
✅ **No critical errors in edge function logs**

### Production Ready Checklist

Before launching to production:

- [ ] All Phase 2 tests passing
- [ ] Monitoring alerts configured (see `MONITORING_ALERTS_SETUP.md`)
- [ ] Incident response procedures documented
- [ ] Team trained on security dashboard usage
- [ ] Backup and rollback procedures tested
- [ ] Performance metrics within targets (< 100ms edge response)
- [ ] Security documentation reviewed and approved

---

## 📸 Screenshot & Documentation

### Capture Test Results

1. After running tests, take screenshots:
   - Full test results page
   - CSP violations widget
   - Rate limit status
   - Edge function health
   - Cloudflare analytics

2. Save to: `docs/screenshots/phase2-tests-[date].png`

3. Update completion report:
   - Add screenshots to `PHASE2_FINAL_COMPLETION_REPORT.md`
   - Document any issues found and resolved
   - Sign off on production readiness

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅

1. **Update Project Status**:
   - Mark Phase 2 as 100% complete ✅ (Already done in database)
   - Update timeline visualization
   - Celebrate completion! 🎉

2. **Configure Monitoring**:
   - Follow `MONITORING_ALERTS_SETUP.md`
   - Set up Cloudflare email alerts
   - Configure CSP daily digest
   - Set up uptime monitoring

3. **Document Production Deployment**:
   - Record deployment date
   - Note any configuration changes made
   - Update production checklist

4. **Prepare for Phase 3**:
   - Review Phase 3 objectives (Smart Expense Categorization)
   - Plan AI/ML integration approach
   - Allocate resources for Phase 3 kickoff

### If Tests Fail ❌

1. **Document Failures**:
   - List which tests failed
   - Capture error messages
   - Screenshot failure states

2. **Investigate Root Cause**:
   - Check edge function logs
   - Review database records
   - Verify Cloudflare configuration
   - Use troubleshooting section above

3. **Fix and Retest**:
   - Implement fixes for failed tests
   - Redeploy affected components
   - Rerun test suite
   - Verify fixes resolved issues

4. **Update Documentation**:
   - Document issue and resolution
   - Update troubleshooting guide
   - Add to lessons learned

---

## 📞 Support & Escalation

### Internal Support
- **Security Dashboard**: `/admin/security`
- **Edge Function Logs**: Lovable > Cloud > Edge Functions
- **Database**: Lovable > Cloud > Database

### External Support
- **Cloudflare Support**: https://support.cloudflare.com/
- **Cloudflare Community**: https://community.cloudflare.com/

### Emergency Contacts
- Security Team: security@yourdomain.com
- DevOps: devops@yourdomain.com
- On-Call: [Phone number]

---

**Test Execution Guide Version**: 1.0  
**Last Updated**: 2025-11-12  
**Next Review**: After Phase 3 completion  
**Owner**: otherservices51@gmail.com (Admin)

---

**Ready to Begin?**  
Navigate to: `https://yourdomain.com/admin/security` and start testing! 🚀
