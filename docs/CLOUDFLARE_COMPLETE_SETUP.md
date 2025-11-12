# Cloudflare Complete Setup Guide - React + Vite SPA

**Last Updated**: 2025-01-12  
**Project**: TrueSpend (React + Vite + Supabase Edge Functions)  
**Cloudflare Plan**: Free tier supported (Pro/Business for advanced features)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: DNS Configuration](#step-1-dns-configuration)
3. [Step 2: SSL/TLS Settings](#step-2-ssltls-settings)
4. [Step 3: Performance Optimization](#step-3-performance-optimization)
5. [Step 4: Cache Rules (CRITICAL for Vite SPAs)](#step-4-cache-rules-critical-for-vite-spas)
6. [Step 5: Security - WAF & Managed Rules](#step-5-security---waf--managed-rules)
7. [Step 6: Rate Limiting](#step-6-rate-limiting)
8. [Step 7: Transform Rules (Security Headers)](#step-7-transform-rules-security-headers)
9. [Step 8: Bot Management](#step-8-bot-management)
10. [Step 9: DDoS Protection](#step-9-ddos-protection)
11. [Verification Checklist](#verification-checklist)
12. [Common Issues & Solutions](#common-issues--solutions)

---

## Prerequisites

- ✅ Domain name (e.g., truespend.org)
- ✅ Access to domain registrar DNS settings
- ✅ Cloudflare account (free tier works)
- ✅ Your app deployed (Netlify, Vercel, or custom hosting)
- ✅ Supabase project URL for backend functions

---

## Step 1: DNS Configuration

### 1.1 Add Site to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **"Add a Site"**
3. Enter your domain: `truespend.org`
4. Select **Free** plan
5. Click **Continue**

### 1.2 Review DNS Records

Cloudflare will scan your existing DNS records. Verify these are present:

**Required Records**:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | @ | Your server IP | ✅ Proxied (orange cloud) |
| A | www | Your server IP | ✅ Proxied (orange cloud) |
| CNAME | api | your-backend.com | ✅ Proxied (orange cloud) |

**Important**: 
- ✅ **Orange cloud = Proxied** (traffic goes through Cloudflare)
- ⚪ **Gray cloud = DNS only** (traffic bypasses Cloudflare)

### 1.3 Update Nameservers

1. Cloudflare will provide nameservers like:
   ```
   dana.ns.cloudflare.com
   reza.ns.cloudflare.com
   ```

2. Go to your domain registrar (GoDaddy, Namecheap, etc.)
3. Replace existing nameservers with Cloudflare's nameservers
4. Save changes (propagation takes 5-60 minutes)

### 1.4 Verify DNS Propagation

```bash
# Check nameservers
dig truespend.org NS +short

# Check A record
dig truespend.org A +short

# Should show Cloudflare IPs (104.x.x.x or similar)
```

**Status Check**: Wait for "Active" status in Cloudflare dashboard before proceeding.

---

## Step 2: SSL/TLS Settings

**Navigation**: `SSL/TLS` → `Overview`

### 2.1 SSL/TLS Encryption Mode

**Setting**: `Full (strict)`

**Why**: 
- ✅ Encrypts traffic between Cloudflare and your origin
- ✅ Validates SSL certificate on origin server
- ❌ Avoid "Flexible" (insecure) or "Full" (doesn't validate cert)

### 2.2 Edge Certificates

**Navigation**: `SSL/TLS` → `Edge Certificates`

**Enable These**:

| Setting | Value | Why |
|---------|-------|-----|
| Always Use HTTPS | ✅ On | Auto-redirect HTTP → HTTPS |
| HTTP Strict Transport Security (HSTS) | ✅ Enabled | Force HTTPS in browsers |
| HSTS Max Age | 6 months | Duration browsers remember HSTS |
| Include Subdomains | ✅ Yes | Protect www, api, etc. |
| Preload | ✅ Yes | Add to browser HSTS lists |
| No-Sniff Header | ✅ Yes | Prevent MIME type sniffing |
| Minimum TLS Version | TLS 1.2 | Block old insecure protocols |
| TLS 1.3 | ✅ On | Enable latest TLS version |
| Automatic HTTPS Rewrites | ✅ On | Fix mixed content issues |

### 2.3 Advanced Certificate Manager (Optional - Paid Plans)

- Custom certificates
- Extended validation
- Multi-year certificates

**Free Plan**: Universal SSL certificate (covers apex + www) is sufficient.

---

## Step 3: Performance Optimization

**Navigation**: `Speed` → `Optimization`

### 3.1 Auto Minify Settings

**CRITICAL for Vite/React SPAs**:

| File Type | Setting | Reason |
|-----------|---------|--------|
| JavaScript | ❌ **OFF** | **Breaks Vite builds!** Can corrupt ES modules |
| CSS | ✅ On | Safe, reduces CSS size |
| HTML | ✅ On | Safe, reduces HTML size |

**Why JS Minify Off?**
- Vite already minifies JS optimally
- Cloudflare minify can break import maps, chunk references
- Causes "React is undefined" or "useEffect is null" errors

### 3.2 Compression

| Setting | Value | Why |
|---------|-------|-----|
| Brotli | ✅ On | 20% better than gzip |
| Gzip | ✅ On (auto) | Fallback for old browsers |

### 3.3 Performance Features

**Enable**:
- ✅ **Early Hints** - Preload critical resources (Free)
- ✅ **HTTP/3 (QUIC)** - Faster protocol (Free)
- ✅ **0-RTT Connection Resumption** - Faster reconnects (Free)

**Disable** (can cause SPA issues):
- ❌ **Rocket Loader** - Breaks React hydration
- ❌ **Email Obfuscation** - Not needed for SPA
- ❌ **Mirage** - Image optimizer, conflicts with Vite assets
- ❌ **Zaraz** - Only if using analytics, leave off otherwise

### 3.4 Image Optimization (Pro Plan)

**Navigation**: `Speed` → `Optimization` → `Image Resizing`

**Settings**:
- Polish: Lossless
- Responsive images: On
- WebP conversion: On

**Free Plan**: Use Vite image optimization plugins instead.

---

## Step 4: Cache Rules (CRITICAL for Vite SPAs)

**Navigation**: `Caching` → `Cache Rules`

⚠️ **MOST COMMON MISTAKE**: Improper cache rules break Vite SPAs!

### 4.1 Understanding Vite Asset URLs

Vite generates URLs like:
```
/assets/index-aBc123.js?v=xyz789
/assets/main-dEf456.css?v=xyz789
```

**Critical**: Query strings (`?v=xyz789`) are part of the cache key!

### 4.2 Rule #1: Cache Static Assets (Long TTL)

**Name**: `Cache Static Assets - Long TTL`

**When incoming requests match**:
```
(http.request.uri.path.extension in {"js" "css" "woff" "woff2" "ttf" "otf" "svg" "png" "jpg" "jpeg" "gif" "webp" "ico" "mp4" "webm" "pdf"})
```

**Then**:
- **Cache status**: Eligible for cache
- **Edge cache TTL**: 1 year
- **Browser cache TTL**: 1 year
- **Cache key**:
  - ✅ **Query string**: Include ALL (critical!)
  - ✅ **Headers**: Do not include
- **Respect origin cache headers**: No (override origin)

**Order**: 1 (first rule)

### 4.3 Rule #2: Bypass Cache for HTML

**Name**: `Bypass HTML - Always Fresh`

**When incoming requests match**:
```
(http.request.uri.path.extension eq "html" or http.request.uri.path eq "/" or ends_with(http.request.uri.path, "/"))
```

**Then**:
- **Cache status**: Bypass cache
- **Origin cache control**: On (respect origin headers)

**Order**: 2

### 4.4 Rule #3: Bypass Cache for API/Functions

**Name**: `Bypass API and Functions`

**When incoming requests match**:
```
(starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/functions/") or starts_with(http.request.uri.path, "/.netlify/") or starts_with(http.request.uri.path, "/.vercel/"))
```

**Then**:
- **Cache status**: Bypass cache
- **Origin cache control**: On

**Order**: 3

### 4.5 Configuration File Settings

**Navigation**: `Caching` → `Configuration`

**Settings**:
- **Caching Level**: Standard
- **Browser Cache TTL**: Respect Existing Headers
- **Crawler Hints**: On
- **Always Online**: Off (can serve stale content during outages)

### 4.6 Purge Cache After Rules Change

**Navigation**: `Caching` → `Configuration` → `Purge Cache`

**Action**: Click **"Purge Everything"**

⚠️ **Do this after**:
- Changing cache rules
- Deploying new app version
- Experiencing cache-related bugs

---

## Step 5: Security - WAF & Managed Rules

**Navigation**: `Security` → `WAF`

### 5.1 Managed Rules (Free)

**Deploy Rules**:

1. **Cloudflare Managed Ruleset**
   - Click **Deploy**
   - Set to **Block** mode
   - Protects against: SQLi, XSS, RCE, LFI, etc.

2. **Cloudflare OWASP Core Ruleset**
   - Click **Deploy**
   - Set to **Block** mode
   - OWASP Top 10 protection

**First Time Setup**:
- Start with **Simulate** mode for 24-48 hours
- Review logs in `Security` → `Events`
- Check for false positives (legitimate requests blocked)
- Switch to **Block** mode once validated

### 5.2 Custom Rules (Free - 5 rules)

**Rule #1: Block Suspicious User Agents**

**Name**: `Block Bad Bots`

**Expression**:
```
(http.user_agent contains "curl" or http.user_agent contains "scrapy" or http.user_agent contains "python-requests" or http.user_agent eq "")
```

**Action**: Block

**Exceptions**: Whitelist legitimate monitoring (Pingdom, UptimeRobot) if needed

---

**Rule #2: Challenge Anonymous Proxies**

**Name**: `Challenge Anonymizers`

**Expression**:
```
(cf.threat_score gt 14)
```

**Action**: JS Challenge (verifies real browser)

---

**Rule #3: Protect Admin Endpoints**

**Name**: `Admin Area Protection`

**Expression**:
```
(starts_with(http.request.uri.path, "/admin") and not ip.src in {1.2.3.4 5.6.7.8})
```

**Action**: Block

**Note**: Replace `1.2.3.4 5.6.7.8` with your admin IPs

---

**Rule #4: Rate Limit Aggressive IPs**

**Name**: `Block Aggressive Scanning`

**Expression**:
```
(cf.threat_score gt 30 and http.request.method ne "GET")
```

**Action**: Block

---

**Rule #5: Country Restrictions (Optional)**

**Name**: `Allow Specific Countries`

**Expression**:
```
(not ip.geoip.country in {"US" "CA" "GB" "AU"})
```

**Action**: Challenge or Block

**Note**: Only use if you have specific geographic requirements

---

## Step 6: Rate Limiting

**Navigation**: `Security` → `WAF` → `Rate limiting rules`

### 6.1 API Rate Limit (Free Plan - 1 rule)

**Name**: `API Rate Limit`

**When incoming requests match**:
```
(starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/functions/"))
```

**With the same characteristics**:
- IP address
- (optional) HTTP method

**Then**:
- **Requests**: 100
- **Period**: 10 seconds
- **Action**: Challenge (or Block for stricter enforcement)
- **Duration**: 1 hour

---

### 6.2 Login Rate Limit (Pro Plan Required)

**Name**: `Login Attempt Rate Limit`

**When incoming requests match**:
```
(http.request.uri.path eq "/auth/login" or http.request.uri.path eq "/api/auth/login")
```

**With the same characteristics**:
- IP address

**Then**:
- **Requests**: 5
- **Period**: 60 seconds
- **Action**: Block
- **Duration**: 15 minutes

**Free Plan Alternative**: Implement in backend (you already have `supabase/functions/rate-limiter`)

---

### 6.3 Advanced Rate Limiting (Business Plan)

- Rate limit by session/cookie
- Rate limit by header value
- Rate limit by JSON body fields
- More complex expressions

---

## Step 7: Transform Rules (Security Headers)

**Navigation**: `Rules` → `Transform Rules` → `Modify Response Header`

### 7.1 Security Headers Rule

**Name**: `Security Headers`

**When incoming requests match**: All incoming requests

**Then set static headers**:

| Header Name | Value |
|-------------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(self), camera=(self), microphone=(self)` |

### 7.2 Content Security Policy (CSP)

⚠️ **Start with Report-Only Mode**

**Header Name**: `Content-Security-Policy-Report-Only`

**Value** (adjust for your app):
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://truespend.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://uolpwcngftpmgkopltwz.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri https://api.truespend.org/functions/v1/csp-reporter
```

**Testing Process**:
1. Deploy with `Content-Security-Policy-Report-Only` for 7 days
2. Monitor CSP violation reports at your report-uri endpoint
3. Fix violations by updating CSP or code
4. Switch to `Content-Security-Policy` (enforcing mode)

**Your Existing CSP Reporter**: `supabase/functions/csp-reporter/index.ts` already exists

### 7.3 CORS Headers (DO NOT SET HERE)

❌ **Do not set CORS headers in Transform Rules**

✅ **Set CORS in backend** (your Supabase edge functions already handle this)

**Why**: 
- CORS needs origin validation (can't do static in Transform Rules)
- OPTIONS preflight needs to return 200 (Transform Rules can't change status code)
- Your `api-gateway` function already has proper CORS

---

## Step 8: Bot Management

**Navigation**: `Security` → `Bots`

### 8.1 Bot Fight Mode (Free)

**Setting**: ✅ **On**

**What it does**:
- Challenges suspicious bots
- Blocks bad bots automatically
- Allows verified bots (Google, Bing, etc.)

### 8.2 Verified Bots (Allow List)

**Automatically Allowed**:
- Googlebot (Google Search)
- Bingbot (Bing Search)
- Slackbot (Slack link previews)
- TwitterBot (Twitter card previews)
- LinkedInBot (LinkedIn previews)
- facebookexternalhit (Facebook previews)

**If blocking legitimate bots**:
1. Check `Security` → `Events`
2. Find bot requests being challenged
3. Add to allow list via custom WAF rule

### 8.3 Super Bot Fight Mode (Pro+)

**Additional Features**:
- Invisible challenges
- Anomaly detection
- Machine learning bot detection

---

## Step 9: DDoS Protection

**Navigation**: `Security` → `DDoS`

### 9.1 Automatic DDoS Protection (Always On - Free)

Cloudflare automatically protects against:
- ✅ Network layer (L3/L4) DDoS - TCP/UDP floods
- ✅ Application layer (L7) DDoS - HTTP floods
- ✅ DNS amplification attacks
- ✅ SYN floods

**Capacity**: 172 Tbps global mitigation

**No configuration needed** - always active

### 9.2 Under Attack Mode (Emergency)

**When to use**: Active DDoS attack hitting your site

**Enable**:
1. Go to `Overview`
2. Toggle **"Under Attack Mode"** to On
3. Shows JavaScript challenge to ALL visitors

**Effects**:
- ✅ Blocks DDoS traffic
- ❌ Adds ~5 second challenge for legitimate users
- ❌ Breaks APIs (use for frontend only)

**Disable** once attack subsides

### 9.3 Advanced DDoS (Enterprise)

- Custom DDoS rules
- Sensitivity tuning
- Regional blocking during attacks

---

## Verification Checklist

### ✅ DNS & SSL

```bash
# Check DNS propagation
dig truespend.org +short
# Should show Cloudflare IPs (104.x.x.x)

# Check SSL certificate
curl -I https://truespend.org
# Should return 200, no SSL errors

# Check HTTPS redirect
curl -I http://truespend.org
# Should return 301/308 redirect to https://
```

### ✅ Cache Headers

```bash
# Check static asset caching
curl -I https://truespend.org/assets/index-abc123.js
# Look for:
# cf-cache-status: HIT (after 2nd request)
# cache-control: max-age=31536000

# Check HTML bypass
curl -I https://truespend.org/
# Look for:
# cf-cache-status: DYNAMIC or BYPASS
# cache-control: no-cache or private

# Check API bypass
curl -I https://truespend.org/api/health
# Look for:
# cf-cache-status: BYPASS or DYNAMIC
```

### ✅ Security Headers

```bash
curl -I https://truespend.org
# Should include:
# strict-transport-security: max-age=31536000
# x-frame-options: DENY
# x-content-type-options: nosniff
# x-xss-protection: 1; mode=block
# referrer-policy: strict-origin-when-cross-origin
```

### ✅ Compression

```bash
curl -I https://truespend.org -H "Accept-Encoding: br, gzip"
# Should include:
# content-encoding: br (or gzip)
```

### ✅ WAF & Rate Limiting

```bash
# Test SQL injection detection (should be blocked)
curl "https://truespend.org/?id=1' OR '1'='1"
# Should return 403 Forbidden

# Test XSS detection (should be blocked)
curl "https://truespend.org/?q=<script>alert('xss')</script>"
# Should return 403 Forbidden

# Test rate limiting (100 requests in 10 seconds)
for i in {1..110}; do curl -s https://truespend.org/api/health > /dev/null; done
# After 100, should return 429 Too Many Requests or challenge page
```

### ✅ Performance

1. Open browser DevTools → Network tab
2. Visit https://truespend.org
3. Check:
   - ✅ All JS/CSS from `/assets/` loaded successfully
   - ✅ No 404 errors on chunks
   - ✅ Response headers show `cf-cache-status`
   - ✅ `content-encoding: br` on assets
   - ✅ HTTP/2 or HTTP/3 protocol

---

## Common Issues & Solutions

### Issue 1: "React is undefined" or "useEffect is null"

**Symptoms**:
- Runtime errors about React/React hooks
- Console shows errors like "Cannot read property 'useEffect' of undefined"

**Cause**: JavaScript minification breaking ES modules

**Solution**:
1. `Speed` → `Optimization` → Auto Minify
2. Disable **JavaScript** minification
3. Keep CSS and HTML minification enabled
4. Purge cache: `Caching` → `Purge Everything`
5. Hard refresh browser (Ctrl+Shift+R)

---

### Issue 2: Assets Loading from Wrong Version

**Symptoms**:
- Mixed versions of JS chunks
- 404 errors on `/assets/index-oldHash.js`
- "Cannot find module" errors

**Cause**: Cache includes query strings, old cached HTML referencing old chunks

**Solution**:
1. Check Cache Rule #1 includes query strings
2. Check Cache Rule #2 bypasses HTML
3. Purge cache completely
4. Deploy new version with different chunk hashes

---

### Issue 3: API Requests Being Cached

**Symptoms**:
- API returning stale data
- POST/PUT requests returning cached responses
- `cf-cache-status: HIT` on API endpoints

**Cause**: Missing or incorrect cache bypass rule for API

**Solution**:
1. Check Cache Rule #3 exists and matches your API paths
2. Update expression to match all API routes:
   ```
   starts_with(http.request.uri.path, "/api/") or
   starts_with(http.request.uri.path, "/functions/")
   ```
3. Purge cache

---

### Issue 4: CORS Errors

**Symptoms**:
- Browser console: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Preflight OPTIONS requests failing

**Cause**: CORS headers missing or incorrect

**Solution**:
1. ✅ **Handle CORS in backend** (Supabase edge functions)
2. ❌ Do NOT set CORS in Cloudflare Transform Rules
3. Ensure your `api-gateway` function includes:
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   }
   ```
4. OPTIONS requests must return 200 with CORS headers

---

### Issue 5: Legitimate Traffic Blocked by WAF

**Symptoms**:
- Users getting 403 Forbidden
- Legitimate requests blocked
- `Security` → `Events` shows false positives

**Solution**:
1. Review security events: `Security` → `Events`
2. Identify rule causing false positive
3. Options:
   - **A)** Add exception to WAF rule for specific IPs/paths
   - **B)** Lower WAF sensitivity (not recommended)
   - **C)** Create "Skip" rule before the blocking rule
4. Example skip rule:
   ```
   (http.request.uri.path eq "/api/webhook" and ip.src in {1.2.3.4})
   ```
   Action: Skip → Select rules to skip

---

### Issue 6: Admin Panel Inaccessible

**Symptoms**:
- Can't access /admin routes
- Getting blocked by Cloudflare

**Solution**:
1. Check custom WAF rules for admin path restrictions
2. Add your IP to allow list:
   ```
   (starts_with(http.request.uri.path, "/admin") and not ip.src in {YOUR_IP})
   ```
3. Or create exception rule:
   ```
   (starts_with(http.request.uri.path, "/admin") and ip.src eq YOUR_IP)
   ```
   Action: Skip → All rate limiting rules

---

### Issue 7: Slow First Load, Fast After

**Symptoms**:
- First page load slow (3-5 seconds)
- Subsequent loads fast (<1 second)
- `cf-cache-status: MISS` then `HIT`

**Cause**: Cache warming (expected behavior)

**Solution** (not a problem, but can optimize):
1. Enable **Argo Smart Routing** (paid feature)
2. Enable **Tiered Caching** (paid feature)
3. Pre-warm cache:
   ```bash
   # Crawl your site to populate cache
   wget --spider -r -nd -nv https://truespend.org
   ```

---

### Issue 8: CSP Violations Breaking Site

**Symptoms**:
- White screen / blank page
- Console errors about CSP violations
- Scripts/styles blocked by CSP

**Solution**:
1. Use `Content-Security-Policy-Report-Only` first (non-breaking)
2. Monitor violations at your report-uri
3. Update CSP to allow necessary resources:
   ```
   script-src 'self' 'unsafe-inline' https://your-cdn.com;
   style-src 'self' 'unsafe-inline';
   ```
4. Remove `'unsafe-inline'` once inline scripts eliminated
5. Switch to enforcing mode after 7 days of clean reports

---

## Monitoring & Analytics

### Cloudflare Analytics

**Navigation**: `Analytics & Logs` → `Traffic`

**Key Metrics to Monitor**:
- **Requests**: Total requests per day
- **Bandwidth**: Total data transferred
- **Cache Hit Rate**: Should be >80% for static sites
- **Edge Response Status**: 200, 301, 403, 404 breakdown
- **Threat Analytics**: Blocked threats by type

### Security Events

**Navigation**: `Security` → `Events`

**Review Weekly**:
- Blocked requests by rule
- Top attacking IPs
- Attack vectors (SQLi, XSS, etc.)
- False positives (legitimate requests blocked)

### Performance Metrics

**Navigation**: `Speed` → `Performance`

**Monitor**:
- Time to First Byte (TTFB)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

**Good Targets**:
- TTFB: <200ms
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

---

## Advanced Features (Pro/Business Plans)

### Pro Plan ($25/month)

- ✅ More custom rules (20 vs 5)
- ✅ More rate limiting rules (unlimited vs 1)
- ✅ Image optimization (Polish, Mirage)
- ✅ Mobile optimization
- ✅ 50 page rules (vs 3)
- ✅ More cache purge options

### Business Plan ($250/month)

- ✅ Advanced rate limiting (by session, cookie, header)
- ✅ Advanced DDoS customization
- ✅ Custom SSL certificates
- ✅ 100 page rules
- ✅ Longer data retention
- ✅ 24/7 email support

### Enterprise Plan (Custom Pricing)

- ✅ 1000+ custom rules
- ✅ Advanced bot detection
- ✅ Custom DDoS mitigation
- ✅ 100% uptime SLA
- ✅ Dedicated support team
- ✅ Dedicated Cloudflare engineer

---

## Cloudflare + Supabase Integration

Your app uses Supabase Edge Functions. Ensure:

### 1. Supabase Domain Proxied

If using custom domain for Supabase:
- Add CNAME: `api.truespend.org` → `uolpwcngftpmgkopltwz.supabase.co`
- Set to Proxied (orange cloud)

### 2. API Routes Cache Bypassed

Cache Rule #3 should match:
```
starts_with(http.request.uri.path, "/functions/v1/")
```

### 3. Rate Limiting Coordination

**Layered Defense**:
- **Layer 1**: Cloudflare rate limiting (edge)
- **Layer 2**: Supabase rate limiter function (backend)

Both work together for defense in depth.

### 4. CORS Handling

- ❌ Do NOT set CORS in Cloudflare
- ✅ Handle CORS in Supabase edge functions (already implemented)

---

## Emergency Procedures

### If Site Goes Down

1. **Check Cloudflare Status**
   - Visit [Cloudflare Status](https://www.cloudflarestatus.com)
   - Check if global outage

2. **Disable Cloudflare Temporarily**
   - Set DNS to "DNS only" (gray cloud)
   - Nameservers still point to Cloudflare
   - But traffic bypasses Cloudflare

3. **Enable Under Attack Mode**
   - If DDoS attack: `Overview` → Enable "Under Attack Mode"

4. **Purge Cache**
   - If serving stale/broken content: Purge Everything

### If False Positives Block Users

1. **Disable Offending Rule**
   - `Security` → `WAF` → Find rule → Disable

2. **Add IP Exception**
   - Create Skip rule for affected IPs

3. **Lower Security Level**
   - `Security` → `Settings` → Security Level → Medium or Low

---

## Next Steps

After completing this setup:

1. ✅ Run verification checklist
2. ✅ Monitor for 48 hours in simulate/report-only mode
3. ✅ Switch WAF to block mode
4. ✅ Switch CSP to enforcing mode
5. ✅ Review `docs/CLOUDFLARE_TROUBLESHOOTING.md` for SPA-specific issues
6. ✅ Set up uptime monitoring (Pingdom, UptimeRobot)
7. ✅ Review security events weekly

---

## Resources

- [Cloudflare Docs](https://developers.cloudflare.com)
- [Cloudflare Community](https://community.cloudflare.com)
- [Cloudflare Status](https://www.cloudflarestatus.com)
- [Vite Cache Busting](https://vitejs.dev/guide/build.html#load-error-handling)
- [React Production Build](https://react.dev/learn/start-a-new-react-project#production-grade-react-frameworks)

---

**Questions or Issues?**

If you're still experiencing issues after following this guide, check:
1. `docs/CLOUDFLARE_TROUBLESHOOTING.md` - SPA-specific troubleshooting
2. Cloudflare Dashboard → `Analytics` → Review traffic patterns
3. Browser DevTools → Console/Network tabs → Check errors

**Support**:
- Cloudflare Community Forums
- Cloudflare Support (Pro+ plans)
- TrueSpend docs: `docs/` directory
