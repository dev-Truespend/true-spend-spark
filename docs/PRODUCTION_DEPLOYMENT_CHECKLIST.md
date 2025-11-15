# TrueSpend v4.2: Production Deployment Checklist

## 📋 Overview

This comprehensive checklist ensures that TrueSpend v4.2 (Phases 1-3) is properly configured and deployed to production. Follow each section carefully and check off items as completed.

**Target Completion:** 4-6 hours (excluding review/approval times)  
**Last Updated:** 2025-11-15 (Phase 3 Complete)

---

## ✅ Pre-Deployment Verification

### Phase Completion Status
- [ ] **Phase 1:** Foundation & Client Layer (100%)
- [ ] **Phase 2:** Security & Ingress (100%)
- [ ] **Phase 2.5:** Geofencing Foundation (100%)
- [ ] **Phase 3:** Auth & Supply Chain Security (100%)

### Security Metrics
- [ ] Zero critical vulnerabilities (Snyk scan passed)
- [ ] Zero high-severity vulnerabilities in production dependencies
- [ ] All edge functions have RLS policies
- [ ] All database tables have RLS policies enabled
- [ ] MFA available to all users
- [ ] Email verification flow tested

### Testing
- [ ] All Phase 1 tests passed (see `Phase1TestSuite.tsx`)
- [ ] All Phase 2 tests passed (see `Phase2TestSuite.tsx`)
- [ ] Manual testing of auth flows completed
- [ ] Manual testing of geofencing completed
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile web testing completed (iOS Safari, Android Chrome)

---

## 🔐 1. Secrets & Environment Variables

### Lovable Cloud Secrets (via Project Settings)

**Critical: All secrets must be configured before deployment**

#### Authentication Secrets
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

#### API Keys
- [ ] `GOOGLE_MAPS_API_KEY` - Google Maps Platform API key
- [ ] `FOURSQUARE_API_KEY` - Foursquare Places API key
- [ ] `GOOGLE_VISION_API_KEY` - Google Cloud Vision API (Phase 6)

#### Firebase (Push Notifications)
- [ ] `FIREBASE_ADMIN_SDK_KEY` - Firebase Admin SDK private key (JSON)
- [ ] `FIREBASE_PROJECT_ID` - Firebase project ID
- [ ] `FIREBASE_MESSAGING_SENDER_ID` - FCM sender ID

#### Email Service (Phase 5 - Optional for now)
- [ ] `TWILIO_ACCOUNT_SID` - Twilio account SID (Phase 5)
- [ ] `TWILIO_AUTH_TOKEN` - Twilio auth token (Phase 5)
- [ ] `SMTP_HOST` - SMTP server for transactional emails
- [ ] `SMTP_PORT` - SMTP port (usually 587)
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASSWORD` - SMTP password

### GitHub Secrets (for CI/CD)

**Navigate to:** GitHub Repository → Settings → Secrets and variables → Actions

- [ ] `SNYK_TOKEN` - Snyk API token for vulnerability scanning

### Environment Variables Verification

Run this command to verify all required secrets:

```bash
# In your edge functions
console.log('Checking secrets...');
console.log('GOOGLE_MAPS_API_KEY:', !!Deno.env.get('GOOGLE_MAPS_API_KEY'));
console.log('FOURSQUARE_API_KEY:', !!Deno.env.get('FOURSQUARE_API_KEY'));
console.log('FIREBASE_PROJECT_ID:', !!Deno.env.get('FIREBASE_PROJECT_ID'));
```

---

## 🌐 2. Cloudflare Configuration (Manual Setup - CRITICAL)

**⏱️ Estimated Time:** 2-3 hours  
**Documentation:** `docs/CLOUDFLARE_COMPLETE_SETUP.md`

### 2.1 DNS Configuration

- [ ] Add custom domain to Lovable project (Settings → Domains)
- [ ] Update DNS records:
  - [ ] `A` record pointing to Lovable IP
  - [ ] `AAAA` record for IPv6 (if available)
  - [ ] `CNAME` for `www` subdomain

### 2.2 CDN Setup

- [ ] Enable Cloudflare CDN
- [ ] Configure caching rules (30-day TTL for static assets)
- [ ] Set up cache purge triggers
- [ ] Enable Brotli compression
- [ ] Enable HTTP/3 (QUIC)

### 2.3 WAF (Web Application Firewall)

**Documentation:** `docs/WAF_SETUP.md`

- [ ] Enable Cloudflare WAF
- [ ] Configure rate limiting rules:
  - [ ] `/api/auth/login` - 5 requests/minute
  - [ ] `/api/auth/register` - 3 requests/minute
  - [ ] `/api/*` - 60 requests/minute
- [ ] Enable OWASP Core Ruleset
- [ ] Configure geo-blocking (if needed)
- [ ] Set up challenge pages for suspicious traffic

### 2.4 DDoS Protection

**Documentation:** `docs/DDOS_PROTECTION.md`

- [ ] Enable DDoS protection (automatic)
- [ ] Configure attack sensitivity level
- [ ] Set up rate limiting thresholds
- [ ] Enable JavaScript challenge for bots

### 2.5 Security Headers

- [ ] Verify security headers are set (via edge functions):
  - [ ] `Content-Security-Policy`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-XSS-Protection: 1; mode=block`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Permissions-Policy`

**Test headers:** [https://securityheaders.com/](https://securityheaders.com/)

### 2.6 SSL/TLS Configuration

- [ ] SSL mode set to "Full (strict)"
- [ ] Enable automatic HTTPS rewrites
- [ ] Enable HSTS (HTTP Strict Transport Security)
- [ ] Set minimum TLS version to 1.2
- [ ] Enable TLS 1.3

---

## 🔍 3. Snyk Security Scanning

**⏱️ Estimated Time:** 10 minutes  
**Documentation:** `docs/SNYK_SETUP_GUIDE.md`

### 3.1 Snyk Account Setup

- [ ] Create Snyk account at [https://snyk.io/](https://snyk.io/)
- [ ] Install Snyk GitHub App
- [ ] Generate Snyk API token

### 3.2 GitHub Integration

- [ ] Add `SNYK_TOKEN` to GitHub Secrets
- [ ] Verify `.github/workflows/snyk-security.yml` workflow
- [ ] Run manual scan to test

### 3.3 First Scan

- [ ] Navigate to GitHub Actions
- [ ] Run "Snyk Security Scan" workflow manually
- [ ] Verify scan completes successfully
- [ ] Check for any critical/high vulnerabilities
- [ ] Address vulnerabilities before proceeding

### 3.4 Monitoring

- [ ] Enable email notifications for new vulnerabilities
- [ ] Configure Snyk to run on PR branches
- [ ] Set up Slack/Discord webhooks (optional)

---

## 🗄️ 4. Database Verification

### 4.1 RLS Policies

Run this query to verify all tables have RLS enabled:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

**Expected Result:** Empty (all tables should have `rowsecurity = true`)

- [ ] All tables have RLS enabled
- [ ] All policies tested with different user roles
- [ ] Admin policies verified (use `has_role()` function)

### 4.2 Data Integrity

- [ ] Run database linter: `supabase db lint`
- [ ] Check for missing indexes on foreign keys
- [ ] Verify constraints are enforced
- [ ] Test database migrations in staging first

### 4.3 Backup Strategy

- [ ] Enable daily automated backups (Lovable Cloud default)
- [ ] Test database restore procedure
- [ ] Document backup retention policy (7 days default)

---

## 🔑 5. Authentication Configuration

### 5.1 Supabase Auth Settings

**Navigate to:** Lovable Cloud → Auth → Configuration

- [ ] Enable email/password authentication
- [ ] Enable Google OAuth
- [ ] **Auto-confirm email signups:** ✅ **ENABLED** (critical for development)
- [ ] Email templates customized (verification, password reset)
- [ ] Site URL configured: `https://yourdomain.com`
- [ ] Redirect URLs whitelisted:
  - [ ] `https://yourdomain.com/auth/callback`
  - [ ] `https://yourdomain.com/verify-email`
  - [ ] `https://yourdomain.com/reset-password`

### 5.2 Google OAuth Configuration

- [ ] Create Google Cloud Console project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized JavaScript origins:
  - [ ] `https://yourdomain.com`
- [ ] Add authorized redirect URIs:
  - [ ] `https://yourdomain.com/auth/callback`
- [ ] Add secrets to Lovable Cloud:
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`

### 5.3 MFA Testing

- [ ] Test TOTP setup flow with Google Authenticator
- [ ] Test TOTP setup flow with Authy
- [ ] Test backup code generation
- [ ] Test backup code usage
- [ ] Verify backup codes invalidate after use
- [ ] Test MFA disable flow

### 5.4 Email Verification

- [ ] Test verification email sends correctly
- [ ] Test verification link works
- [ ] Verify unverified accounts are deleted after 24 hours
- [ ] Test resend verification email

---

## 🚀 6. API Integrations

### 6.1 Google Maps Platform

**Console:** [https://console.cloud.google.com/](https://console.cloud.google.com/)

- [ ] Create Google Cloud project (or use existing)
- [ ] Enable APIs:
  - [ ] Maps JavaScript API
  - [ ] Geocoding API
  - [ ] Places API
  - [ ] Directions API
  - [ ] Geolocation API
- [ ] Create API key with restrictions:
  - [ ] HTTP referrer restrictions: `https://yourdomain.com/*`
  - [ ] API restrictions: Only enable required APIs
- [ ] Add billing account (required for production usage)
- [ ] Set up usage alerts (e.g., >$50/month)
- [ ] Add `GOOGLE_MAPS_API_KEY` to Lovable Cloud secrets

### 6.2 Foursquare Places API

**Console:** [https://foursquare.com/developers/](https://foursquare.com/developers/)

- [ ] Create Foursquare account
- [ ] Create new app
- [ ] Get API key
- [ ] Review rate limits (free tier: 950 calls/day)
- [ ] Add `FOURSQUARE_API_KEY` to Lovable Cloud secrets
- [ ] Test place search API call
- [ ] Verify caching is working (check `foursquare_places` table)

### 6.3 Firebase Cloud Messaging (Push Notifications)

**Console:** [https://console.firebase.google.com/](https://console.firebase.google.com/)

- [ ] Create Firebase project
- [ ] Add Android app (if using native)
- [ ] Add iOS app (if using native)
- [ ] Download `google-services.json` (Android)
- [ ] Download `GoogleService-Info.plist` (iOS)
- [ ] Generate Firebase Admin SDK key (JSON)
- [ ] Add secrets to Lovable Cloud:
  - [ ] `FIREBASE_ADMIN_SDK_KEY` (full JSON as string)
  - [ ] `FIREBASE_PROJECT_ID`
  - [ ] `FIREBASE_MESSAGING_SENDER_ID`
- [ ] Test push notification sending (use `NotificationTestPanel`)

---

## 📊 7. Monitoring & Logging

### 7.1 Error Tracking

- [ ] Set up error boundary in React (`src/App.tsx`)
- [ ] Configure CSP violation reporting (already done)
- [ ] Test CSP reporter edge function

### 7.2 Analytics (Optional)

**Recommended:** Google Analytics 4

- [ ] Create GA4 property
- [ ] Add tracking code to `index.html`
- [ ] Set up conversion goals
- [ ] Test page view tracking

### 7.3 Uptime Monitoring (Optional)

**Recommended:** [UptimeRobot](https://uptimerobot.com/) (Free)

- [ ] Add HTTPS monitor for `https://yourdomain.com`
- [ ] Add HTTPS monitor for `/health` endpoint (if you create one)
- [ ] Set up email alerts for downtime
- [ ] Set up Slack/Discord webhooks

### 7.4 Performance Monitoring

- [ ] Enable Cloudflare Web Analytics
- [ ] Monitor Core Web Vitals
- [ ] Set up Lighthouse CI (optional)

---

## 🧪 8. Final Testing

### 8.1 Functional Testing

**Auth Flows:**
- [ ] Sign up with email/password
- [ ] Verify email
- [ ] Log in with email/password
- [ ] Log in with Google OAuth
- [ ] Enable MFA (TOTP)
- [ ] Log in with MFA
- [ ] Use backup code
- [ ] Reset password
- [ ] Change email
- [ ] Test account locking (5 failed attempts)

**Geofencing:**
- [ ] Create geofence
- [ ] Test geofence entry event
- [ ] Test geofence exit event
- [ ] View geofence metrics

**API Integrations:**
- [ ] Test Google Maps geocoding
- [ ] Test Foursquare place search
- [ ] Verify caching is working

### 8.2 Security Testing

- [ ] Run OWASP ZAP scan (optional)
- [ ] Test for SQL injection vulnerabilities
- [ ] Test for XSS vulnerabilities
- [ ] Verify CORS policies
- [ ] Test CSP violations are blocked

### 8.3 Performance Testing

- [ ] Run Lighthouse audit (target: >90 score)
- [ ] Test page load time (<2 seconds)
- [ ] Test Time to Interactive (<3 seconds)
- [ ] Check bundle size (<500KB gzipped)

### 8.4 Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android 11+)

---

## 📱 9. Mobile Configuration (Optional - Phase 11)

**Skip this section if deploying web app only**

### Capacitor Configuration

- [ ] Update `capacitor.config.ts` with production URL
- [ ] Change `cleartext: true` to `cleartext: false`
- [ ] Generate app icons (all sizes)
- [ ] Generate splash screens
- [ ] Set up iOS code signing
- [ ] Set up Android keystore
- [ ] Test on real iOS device
- [ ] Test on real Android device

---

## 🚀 10. Deployment

### 10.1 Pre-Deployment Checklist

- [ ] All above sections completed
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] No critical/high vulnerabilities
- [ ] Cloudflare fully configured
- [ ] All secrets configured
- [ ] Database migrations tested

### 10.2 Deploy to Production

**In Lovable:**
1. [ ] Click "Publish" button (top-right)
2. [ ] Review changes to be deployed
3. [ ] Click "Update" to deploy frontend changes
4. [ ] Wait for deployment to complete (~2-3 minutes)
5. [ ] Verify edge functions deployed automatically

### 10.3 Post-Deployment Verification

**Within 5 minutes of deployment:**
- [ ] Visit production URL: `https://yourdomain.com`
- [ ] Verify site loads correctly
- [ ] Test login flow
- [ ] Check browser console for errors
- [ ] Test API calls (Network tab)
- [ ] Verify CSP headers (view source)
- [ ] Test mobile responsiveness

**Within 1 hour:**
- [ ] Monitor error logs (CSP violations)
- [ ] Check CloudFlare analytics
- [ ] Monitor Snyk for new issues
- [ ] Test geofencing on mobile device

**Within 24 hours:**
- [ ] Review usage metrics
- [ ] Check for performance bottlenecks
- [ ] Monitor database query performance
- [ ] Verify backups are running

---

## 📞 11. Support & Rollback Plan

### Contact Information

- **Lovable Support:** [https://docs.lovable.dev/](https://docs.lovable.dev/)
- **Cloudflare Support:** [https://support.cloudflare.com/](https://support.cloudflare.com/)
- **Snyk Support:** [https://support.snyk.io/](https://support.snyk.io/)

### Rollback Procedure

If critical issues arise:

1. **Immediate Actions:**
   - [ ] Click "Publish" in Lovable
   - [ ] Select previous working version
   - [ ] Click "Update" to rollback frontend

2. **Database Rollback:**
   - [ ] Contact Lovable support for database restore
   - [ ] Provide backup timestamp
   - [ ] Wait for restore completion

3. **Cloudflare Bypass:**
   - [ ] Temporarily disable CDN in Cloudflare (Development Mode)
   - [ ] Investigate issue
   - [ ] Re-enable after fix

---

## ✅ Final Sign-Off

### Deployment Approval

- [ ] **Tech Lead:** Reviewed and approved
- [ ] **Security Lead:** Security audit passed
- [ ] **DevOps:** Infrastructure ready
- [ ] **Product Owner:** Acceptance criteria met

### Documentation

- [ ] Production deployment documented
- [ ] Environment variables documented
- [ ] Runbook created for common issues
- [ ] Team trained on rollback procedures

---

## 🎉 Congratulations!

If all checkboxes are complete, TrueSpend v4.2 (Phases 1-3) is **production-ready**! 🚀

**Next Steps:**
1. Monitor production for first 48 hours
2. Gather user feedback
3. Plan Phase 4 implementation (Core Services)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-15  
**Maintained By:** TrueSpend DevOps Team
