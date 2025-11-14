# Security Headers Configuration

**Version:** 2.0.1  
**Phase:** Security & Ingress - Layer 4 (Modern Safety)

## Overview

This document explains the comprehensive security headers implementation across different layers of the TrueSpend application to protect against various web vulnerabilities.

## Architecture Layers

### 1. Vercel Edge Headers (`vercel.json`)

Applied at the CDN/edge level before requests reach the application. These headers are the first line of defense.

**Configured Headers:**

#### Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- **Purpose:** Forces HTTPS connections for 1 year
- **Protection:** Man-in-the-middle attacks, protocol downgrade attacks
- **Features:** 
  - Includes all subdomains
  - Eligible for browser HSTS preload list

#### X-Frame-Options
```
X-Frame-Options: DENY
```
- **Purpose:** Prevents page from being embedded in frames/iframes
- **Protection:** Clickjacking attacks
- **Setting:** `DENY` - no framing allowed

#### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
- **Purpose:** Prevents MIME type sniffing
- **Protection:** Drive-by download attacks, content-type confusion
- **Effect:** Browser must respect declared Content-Type

#### X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
- **Purpose:** Legacy XSS filter for older browsers
- **Protection:** Reflected XSS attacks
- **Note:** Modern browsers rely on CSP instead

#### Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
- **Purpose:** Controls referrer information sent with requests
- **Protection:** Information leakage
- **Behavior:**
  - Same-origin: Full URL
  - Cross-origin HTTPS→HTTPS: Origin only
  - HTTPS→HTTP: No referrer

#### Permissions-Policy
```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()
```
- **Purpose:** Controls browser feature access
- **Protection:** Unauthorized feature usage, privacy violations
- **Settings:**
  - Camera: Disabled
  - Microphone: Disabled
  - Geolocation: Only same-origin
  - FLoC: Disabled (privacy)

#### Content-Security-Policy-Report-Only
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```
- **Purpose:** Defines allowed content sources (currently in report-only mode)
- **Protection:** XSS, code injection, data exfiltration
- **Mode:** Report-only for testing (switch to enforcing after validation)

### 2. Supabase Edge Function (`supabase/functions/security-headers`)

Provides security headers programmatically for backend API responses. Used by edge functions that need to add security headers to their responses.

**Use Cases:**
- API Gateway responses
- Edge function responses
- Dynamic content with security requirements

**Integration:**
```typescript
import { securityHeaders } from '../security-headers/index.ts';

return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    ...securityHeaders,
  },
});
```

### 3. CSP Violation Reporting (`src/lib/security/csp.ts`)

Client-side monitoring for Content Security Policy violations.

**Components:**
- `src/lib/security/csp.ts` - CSP configuration and violation reporter
- `src/components/security/CSPViolationReporter.tsx` - React component wrapper
- `supabase/functions/csp-reporter` - Backend violation collector

**Flow:**
1. Browser detects CSP violation
2. `securitypolicyviolation` event fired
3. Client reports to `/functions/v1/csp-reporter`
4. Violation stored in `csp_violations` table
5. Monitored in Security Dashboard

**Database Schema:**
```sql
CREATE TABLE csp_violations (
  id UUID PRIMARY KEY,
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  user_agent TEXT,
  created_at TIMESTAMP
);
```

## Security Headers Hierarchy

### Layer 1: Vercel Edge (First Defense)
- Applied before request reaches application
- Protects all routes automatically
- Cannot be bypassed by application code

### Layer 2: Supabase Edge Functions (API Defense)
- Applied to backend API responses
- Consistent security for all edge function responses
- Programmatic control for dynamic scenarios

### Layer 3: Client-Side Monitoring (Detection)
- Reports CSP violations for analysis
- Helps identify legitimate vs malicious violations
- Enables CSP policy tuning

## Testing & Verification

### Manual Testing with curl

```bash
# Test security headers
curl -I https://yourdomain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()
# Content-Security-Policy-Report-Only: ...
```

### Online Security Scanners

#### SecurityHeaders.com
```bash
https://securityheaders.com/?q=https://yourdomain.com
```
**Expected Grade:** A+ (with all headers properly configured)

#### Mozilla Observatory
```bash
https://observatory.mozilla.org/analyze/yourdomain.com
```
**Expected Score:** A+ or 100+

#### SSL Labs
```bash
https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```
**Expected Grade:** A+ (for HSTS and SSL/TLS config)

### Automated Testing

Add to your CI/CD pipeline:

```typescript
// tests/security-headers.test.ts
import { test, expect } from '@playwright/test';

test('security headers are present', async ({ page }) => {
  const response = await page.goto('/');
  
  expect(response?.headers()['strict-transport-security']).toBe(
    'max-age=31536000; includeSubDomains; preload'
  );
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  // ... test other headers
});
```

## CSP Migration Plan

### Phase 1: Report-Only (Current)
- Use `Content-Security-Policy-Report-Only` header
- Monitor violations in Security Dashboard
- Identify false positives vs real violations
- **Duration:** 2-4 weeks

### Phase 2: Tune & Refine
- Review violation reports
- Update CSP directives to allow legitimate sources
- Whitelist necessary third-party domains
- Test thoroughly
- **Duration:** 1-2 weeks

### Phase 3: Enforcing Mode
- Switch from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`
- Monitor for issues
- Roll back if critical functionality breaks
- **Duration:** Ongoing monitoring

### Phase 4: Strict CSP
- Remove `'unsafe-inline'` and `'unsafe-eval'`
- Implement nonce-based script/style loading
- Maximum security posture
- **Duration:** Future enhancement

## Monitoring & Maintenance

### CSP Violations Dashboard
Navigate to: **Admin Dashboard → Security → CSP Violations**

**Key Metrics:**
- Total violations per day/week
- Most frequently violated directives
- Blocked URIs and sources
- User agent distribution

### Weekly Review Checklist
- [ ] Check SecurityHeaders.com grade
- [ ] Review CSP violation trends
- [ ] Analyze false positives
- [ ] Update CSP whitelist if needed
- [ ] Verify HSTS preload status

### Monthly Security Audit
- [ ] Run full security scan suite
- [ ] Review and rotate secrets if needed
- [ ] Update security documentation
- [ ] Test emergency rollback procedures
- [ ] Review security incident logs

## Troubleshooting

### Issue: Legitimate Functionality Blocked

**Symptoms:**
- Features stop working after CSP enforcement
- CSP violations for known resources

**Solution:**
1. Check CSP violation reports in dashboard
2. Identify blocked resource URI
3. Add to CSP whitelist in `src/lib/security/csp.ts`
4. Redeploy and verify

```typescript
// Example: Allow specific CDN
connectSrc: [
  "'self'",
  "https://*.supabase.co",
  "https://trusted-cdn.example.com", // Add trusted source
],
```

### Issue: Security Headers Not Applied

**Symptoms:**
- SecurityHeaders.com shows missing headers
- curl doesn't show expected headers

**Checklist:**
1. ✅ Verify `vercel.json` syntax is correct
2. ✅ Redeploy to Vercel (headers only apply after deployment)
3. ✅ Clear browser cache and CDN cache
4. ✅ Check for conflicting headers in code
5. ✅ Test with `curl -I` (bypasses browser cache)

### Issue: HSTS Preload Not Working

**Requirements for HSTS Preload:**
- max-age >= 31536000 (1 year)
- includeSubDomains directive
- preload directive
- Valid HTTPS certificate
- Submit to https://hstspreload.org

## Security Best Practices

### Do's ✅
- Keep security headers updated with latest recommendations
- Monitor CSP violations regularly
- Test header changes in staging first
- Document any whitelisted exceptions
- Review security scans monthly

### Don'ts ❌
- Don't disable security headers for convenience
- Don't use `'unsafe-inline'` or `'unsafe-eval'` in production CSP
- Don't ignore CSP violation reports
- Don't bypass security headers in code
- Don't expose sensitive information in headers

## Related Documentation

- [WAF Setup Guide](./WAF_SETUP.md) - Cloudflare WAF configuration
- [DDoS Protection](./DDOS_PROTECTION.md) - DDoS mitigation strategies
- [Security Dashboard](./DASHBOARD_README.md) - Security monitoring UI
- [Webhook Security](./WEBHOOK_SECURITY_GUIDE.md) - Webhook protection

## Resources

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Security Headers Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [SecurityHeaders.com](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## Version History

### v2.0.1 (Current)
- Added comprehensive security headers to `vercel.json`
- Implemented CSP in report-only mode
- Created security headers documentation
- Added testing and verification procedures

### v2.0.0
- Initial production authentication system
- Basic security configuration
- Edge function security headers support

## Next Steps

1. **Immediate Actions:**
   - [ ] Deploy updated `vercel.json` to production
   - [ ] Run SecurityHeaders.com scan
   - [ ] Verify all headers are applied correctly
   - [ ] Monitor CSP violations for first 48 hours

2. **Short Term (1-2 weeks):**
   - [ ] Review CSP violation patterns
   - [ ] Tune CSP directives based on reports
   - [ ] Test CSP in enforcing mode in staging
   - [ ] Submit to HSTS preload list

3. **Long Term (1-3 months):**
   - [ ] Migrate to enforcing CSP
   - [ ] Implement nonce-based CSP
   - [ ] Automate security header testing in CI/CD
   - [ ] Conduct external security audit
