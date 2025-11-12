# Cloudflare Troubleshooting Guide - Vite + React SPAs

**Last Updated**: 2025-01-12  
**Focus**: SPA-specific issues with Cloudflare CDN + WAF

---

## Table of Contents

1. [React Runtime Errors](#react-runtime-errors)
2. [Asset Loading Issues](#asset-loading-issues)
3. [Cache-Related Problems](#cache-related-problems)
4. [CORS & API Issues](#cors--api-issues)
5. [Security Blocking Legitimate Traffic](#security-blocking-legitimate-traffic)
6. [Performance Issues](#performance-issues)
7. [Build & Deploy Issues](#build--deploy-issues)
8. [Diagnostic Tools](#diagnostic-tools)

---

## React Runtime Errors

### Error: "React is undefined" / "Cannot read property 'useState' of undefined"

**Symptoms**:
```
Uncaught ReferenceError: React is not defined
Uncaught TypeError: Cannot read property 'useState' of undefined
Uncaught TypeError: (0, react__WEBPACK_IMPORTED_MODULE_0__.useEffect) is not a function
```

**Root Cause**: Cloudflare's JavaScript minification corrupting ES module imports.

**Why It Happens**:
- Vite uses ES modules with import maps
- Cloudflare's JS minifier can break import statements
- React imports get mangled: `import React from 'react'` → broken

**Solution**:

1. **Disable JS Minification in Cloudflare**
   ```
   Speed → Optimization → Auto Minify → JavaScript: OFF
   ```

2. **Keep CSS/HTML Minification On**
   ```
   Speed → Optimization → Auto Minify:
   - JavaScript: OFF ❌
   - CSS: ON ✅
   - HTML: ON ✅
   ```

3. **Purge Cache**
   ```
   Caching → Configuration → Purge Everything
   ```

4. **Clear Browser Cache**
   ```
   Chrome: Ctrl+Shift+Delete → Cached images and files
   Or: Hard refresh (Ctrl+Shift+R)
   ```

5. **Verify Vite Minification**
   - Vite already minifies JS optimally in production
   - Check `vite.config.ts`:
     ```typescript
     export default defineConfig({
       build: {
         minify: 'esbuild', // or 'terser'
       }
     })
     ```

**Verification**:
```bash
# Check if JS files are minified
curl https://truespend.org/assets/index-abc123.js | head -n 1
# Should be single line (Vite minified), not multiple lines
```

---

### Error: "useEffect is null" / Hook errors

**Symptoms**:
```
Uncaught TypeError: (0, _react.useEffect) is not a function
Uncaught TypeError: react__WEBPACK_IMPORTED_MODULE_0___default.a.useEffect is null
```

**Root Cause**: Multiple React instances loaded or React chunk mismatch.

**Solution**:

1. **Check Vite Dedupe Config**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     resolve: {
       dedupe: ['react', 'react-dom'],
     }
   })
   ```

2. **Verify Single React Version**
   ```bash
   npm ls react
   # Should show single version, not duplicates
   ```

3. **Clear node_modules and Rebuild**
   ```bash
   rm -rf node_modules
   rm -rf dist
   npm install
   npm run build
   ```

4. **Check Cloudflare Cache Rules**
   - Ensure HTML is NOT cached (Cache Rule #2)
   - Ensure JS includes query strings in cache key (Cache Rule #1)

---

### Error: Blank White Screen (No Console Errors)

**Symptoms**:
- Page loads but shows nothing
- No errors in console
- React DevTools shows no components

**Root Cause**: CSP blocking inline scripts or missing HTML.

**Solution**:

1. **Check CSP Headers**
   ```bash
   curl -I https://truespend.org
   # Look for: content-security-policy header
   ```

2. **Switch CSP to Report-Only**
   ```
   Transform Rules → Modify Response Header:
   Change: Content-Security-Policy
   To: Content-Security-Policy-Report-Only
   ```

3. **Check HTML Delivery**
   ```bash
   curl https://truespend.org | grep "<div id=\"root\">"
   # Should find root div
   ```

4. **Verify index.html**
   - Must have `<div id="root"></div>`
   - Must have `<script type="module" src="/src/main.tsx"></script>` (dev) or built JS (prod)

---

## Asset Loading Issues

### Error: 404 on /assets/index-[hash].js

**Symptoms**:
- `GET https://truespend.org/assets/index-abc123.js 404 Not Found`
- App worked before, broken after deploy
- Mixed old/new chunk hashes

**Root Cause**: Cached HTML referencing old chunk hashes.

**Solution**:

1. **Verify HTML Cache Bypass**
   ```
   Cache Rules → Rule #2:
   When: (http.request.uri.path.extension eq "html" or http.request.uri.path eq "/")
   Then: Bypass cache
   ```

2. **Purge Entire Cache**
   ```
   Caching → Configuration → Purge Everything
   ```

3. **Force Deploy New Version**
   ```bash
   # Update version in package.json or add timestamp
   npm run build
   # Deploy
   ```

4. **Check cf-cache-status**
   ```bash
   curl -I https://truespend.org/
   # Should show: cf-cache-status: DYNAMIC or BYPASS
   # NOT: cf-cache-status: HIT
   ```

**Prevention**:
- Always bypass cache for HTML
- Never cache `/` or `/index.html`

---

### Error: Assets Load But Are Corrupted

**Symptoms**:
- JS files load (200 OK) but cause syntax errors
- Console shows `Unexpected token '<'`
- Assets contain HTML error pages instead of JS

**Root Cause**: Origin server returning error HTML instead of assets.

**Solution**:

1. **Check Origin Response**
   ```bash
   curl https://your-origin.com/assets/index-abc123.js
   # Should return JavaScript, not HTML
   ```

2. **Check Cloudflare Rules**
   - Ensure no URL rewrite rules affecting /assets/
   - Ensure no page rules redirecting assets

3. **Check Origin Cache**
   - Clear origin CDN cache (Netlify/Vercel)
   - Redeploy application

4. **Verify SPA Fallback**
   - SPA fallback should NOT apply to /assets/
   - Example Netlify _redirects:
     ```
     /assets/*  /assets/:splat  200
     /*         /index.html     200
     ```

---

### Error: Fonts/Images Not Loading (CORS)

**Symptoms**:
```
Access to font at 'https://truespend.org/fonts/inter.woff2' from origin 'https://truespend.org' has been blocked by CORS policy
```

**Root Cause**: Cloudflare not passing CORS headers for static assets.

**Solution**:

1. **Add CORS Headers for Static Assets**
   ```
   Transform Rules → Modify Response Header:
   Rule name: CORS for Static Assets
   When: (http.request.uri.path.extension in {"woff" "woff2" "ttf" "otf"})
   Then set static:
   - Access-Control-Allow-Origin: *
   ```

2. **OR: Let Origin Handle It**
   - Remove CORS transform rule
   - Ensure origin server sends CORS headers
   - Cloudflare will proxy headers through

3. **Verify Headers**
   ```bash
   curl -I https://truespend.org/fonts/inter.woff2
   # Should include: access-control-allow-origin: *
   ```

---

## Cache-Related Problems

### Issue: Changes Not Appearing After Deploy

**Symptoms**:
- Deployed new version
- Old version still showing
- Hard refresh shows new version

**Root Cause**: Cloudflare edge cache serving old content.

**Solution**:

1. **Purge Cache**
   ```
   Caching → Configuration → Purge Everything
   ```

2. **Purge by URL (Faster)**
   ```
   Caching → Configuration → Custom Purge:
   URLs:
   - https://truespend.org/
   - https://truespend.org/assets/index-*.js
   - https://truespend.org/assets/main-*.css
   ```

3. **Check Cache TTLs**
   ```
   Cache Rules → Rule #1 (Static Assets):
   Edge cache TTL: 1 year ✅ (correct for hashed assets)
   
   Cache Rules → Rule #2 (HTML):
   Bypass cache ✅ (HTML should never cache)
   ```

4. **Verify New Version**
   ```bash
   # Check asset hash changed
   curl https://truespend.org/ | grep "assets/index-"
   # Should show NEW hash
   ```

**Prevention**:
- Set up automatic cache purge on deploy
- Use deployment hooks (Netlify/Vercel)

---

### Issue: API Responses Being Cached

**Symptoms**:
- API returning stale data
- POST requests returning cached responses
- `cf-cache-status: HIT` on API calls

**Root Cause**: Missing cache bypass for API routes.

**Solution**:

1. **Add/Update API Cache Bypass Rule**
   ```
   Cache Rules → Rule #3:
   Name: Bypass API and Functions
   When: (starts_with(http.request.uri.path, "/api/") or 
          starts_with(http.request.uri.path, "/functions/"))
   Then: Bypass cache
   Order: 3
   ```

2. **Check Rule Order**
   ```
   Cache Rules order:
   1. Cache Static Assets (specific extensions)
   2. Bypass HTML (specific paths)
   3. Bypass API (broad match for APIs) ← Must be BEFORE default cache
   ```

3. **Verify API Bypass**
   ```bash
   curl -I https://truespend.org/api/health
   # Should show: cf-cache-status: BYPASS or DYNAMIC
   # NOT: cf-cache-status: HIT
   ```

4. **Purge API Cache**
   ```
   Caching → Configuration → Custom Purge → By Tag:
   Tag: api (if you've tagged API responses)
   ```

---

### Issue: Query Strings Causing Cache Miss

**Symptoms**:
- Cache hit rate low (<50%)
- Same asset requested multiple times
- Vite assets have `?v=` query strings

**Root Cause**: Cache key ignoring query strings.

**Solution**:

1. **Include Query Strings in Cache Key**
   ```
   Cache Rules → Rule #1 (Static Assets):
   Cache key:
   - Query string: Include All ✅
   - Headers: Do not include
   ```

2. **Why This Matters for Vite**:
   - Vite generates: `/assets/index-abc123.js?v=xyz789`
   - Without query string: Cache treats all versions as same file
   - With query string: Each version cached separately

3. **Verify Cache Key**
   ```bash
   # Request with different query string
   curl -I "https://truespend.org/assets/index-abc123.js?v=1"
   curl -I "https://truespend.org/assets/index-abc123.js?v=2"
   # Both should return same content (hash is same)
   # But cache treats as different (query differs)
   ```

---

## CORS & API Issues

### Error: CORS Policy Blocking API Requests

**Symptoms**:
```
Access to fetch at 'https://api.truespend.org/functions/v1/...' from origin 'https://truespend.org' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Root Cause**: Missing or incorrect CORS headers from backend.

**Solution**:

1. **DO NOT Set CORS in Cloudflare Transform Rules**
   - ❌ Transform Rules cannot handle preflight OPTIONS requests
   - ❌ Transform Rules cannot validate origins dynamically

2. **Set CORS in Supabase Edge Functions**
   ```typescript
   // supabase/functions/api-gateway/index.ts
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*', // Or specific origins
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   }

   // Handle OPTIONS
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }

   // Add to all responses
   return new Response(JSON.stringify(data), {
     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
   })
   ```

3. **Verify OPTIONS Preflight**
   ```bash
   curl -X OPTIONS https://api.truespend.org/functions/v1/health \
     -H "Origin: https://truespend.org" \
     -H "Access-Control-Request-Method: POST" \
     -v
   # Should return 200 with CORS headers
   ```

4. **Check Cloudflare Not Blocking OPTIONS**
   ```
   WAF → Custom Rules:
   Ensure no rule blocking OPTIONS method
   ```

---

### Error: API Request Timeout

**Symptoms**:
- API calls hanging
- Network tab shows request pending forever
- Eventually times out

**Root Cause**: Cloudflare or origin timeout.

**Solution**:

1. **Check Cloudflare Timeout Limits**
   - Free plan: 100 seconds max
   - Pro: 600 seconds max (10 minutes)
   - If longer needed: Use Workers or Enterprise

2. **Check Origin Timeout**
   ```bash
   # Direct test to origin (bypass Cloudflare)
   curl -w "\nTime: %{time_total}s\n" https://your-origin.com/api/slow
   ```

3. **Optimize Backend**
   - Add timeout to Supabase functions:
     ```typescript
     const controller = new AbortController()
     const timeout = setTimeout(() => controller.abort(), 30000) // 30s
     
     const response = await fetch(url, { signal: controller.signal })
     clearTimeout(timeout)
     ```

4. **Use Async Pattern**
   - Return 202 Accepted immediately
   - Process in background
   - Poll for result or use webhooks

---

## Security Blocking Legitimate Traffic

### Issue: Users Getting 403 Forbidden

**Symptoms**:
- Users report can't access site
- 403 Forbidden error page
- `Security` → `Events` shows blocked requests

**Root Cause**: WAF or custom rule blocking legitimate traffic.

**Solution**:

1. **Check Security Events**
   ```
   Security → Events:
   - Filter by status: 403
   - Look at blocked requests
   - Identify which rule triggered
   ```

2. **Identify False Positive Rule**
   - Managed rule: May need to disable specific rule ID
   - Custom rule: Review expression for overly broad match
   - Rate limiting: User may be making legitimate rapid requests

3. **Add Exception**
   ```
   WAF → Custom Rules → Create rule:
   Name: Allow Legitimate Traffic
   Expression: (ip.src eq 1.2.3.4 or http.user_agent contains "MyLegitimateBot")
   Action: Skip → Select rules to skip
   Order: 1 (before blocking rules)
   ```

4. **Temporarily Disable Rule**
   ```
   WAF → Find rule → Disable (slider to OFF)
   Monitor for 24 hours
   ```

5. **Lower Security Level**
   ```
   Security → Settings → Security Level:
   Change from High → Medium or Low
   ```

---

### Issue: Rate Limiting Blocking Mobile App

**Symptoms**:
- Mobile app users getting 429 Too Many Requests
- Desktop users fine
- Multiple users behind same IP (corporate/mobile network)

**Root Cause**: Rate limiting by IP, but many users share IP (NAT).

**Solution**:

1. **Change Rate Limit Characteristic**
   ```
   Rate Limiting Rules:
   With the same characteristics:
   - IP address ❌ (Remove)
   - Header: Authorization ✅ (Add - rate limit per user)
   ```

2. **Increase Rate Limit**
   ```
   Rate Limiting Rules → API Rate Limit:
   Requests: 100 → 300
   Period: 10 seconds → 60 seconds
   ```

3. **Exclude Known IPs**
   ```
   Rate Limiting Rules → API Rate Limit:
   Expression: 
   (starts_with(http.request.uri.path, "/api/") and 
    not ip.src in {1.2.3.4 5.6.7.8})
   ```

4. **Backend Rate Limiting**
   - Use Supabase rate limiter (already implemented)
   - Rate limit by user ID, not IP
   - More granular control

---

### Issue: Challenge Page Blocking API Clients

**Symptoms**:
- API returning challenge HTML instead of JSON
- Postman/curl getting challenge page
- Automated scripts failing

**Root Cause**: Bot Fight Mode or JS Challenge blocking API clients.

**Solution**:

1. **Disable Bot Fight for API Routes**
   ```
   WAF → Custom Rules:
   Name: Allow API Clients
   Expression: starts_with(http.request.uri.path, "/api/")
   Action: Skip → Bot Fight Mode
   Order: 1
   ```

2. **Use API Tokens**
   - Require API key in header
   - Create custom rule to allow:
     ```
     (starts_with(http.request.uri.path, "/api/") and 
      http.request.headers["X-API-Key"][0] eq "your-key")
     ```
     Action: Skip → All security features (or specific rules)

3. **Whitelist IP Addresses**
   ```
   WAF → Tools → IP Access Rules:
   Add: 1.2.3.4
   Action: Allow
   ```

---

## Performance Issues

### Issue: Slow First Load (3-5 seconds)

**Symptoms**:
- First page load slow
- Subsequent loads fast
- `cf-cache-status: MISS` then `HIT`

**Root Cause**: Cold cache (expected behavior).

**Solution** (Optimization):

1. **Enable Early Hints**
   ```
   Speed → Optimization → Early Hints: ON
   Preloads critical resources while waiting for origin
   ```

2. **Enable HTTP/3**
   ```
   Network → HTTP/3: ON
   Faster connection establishment
   ```

3. **Enable 0-RTT**
   ```
   Network → 0-RTT Connection Resumption: ON
   Faster reconnects for returning visitors
   ```

4. **Pre-warm Cache**
   ```bash
   # Crawl your site after deploy
   wget --spider -r -nd -nv https://truespend.org
   ```

5. **Upgrade to Pro** (Argo Smart Routing)
   - Finds fastest route to origin
   - Reduces TTFB by ~30%

---

### Issue: High TTFB (Time to First Byte)

**Symptoms**:
- TTFB > 1 second
- Origin server slow
- Database queries slow

**Root Cause**: Backend performance, not Cloudflare.

**Solution**:

1. **Measure Origin TTFB**
   ```bash
   # Bypass Cloudflare
   curl -w "TTFB: %{time_starttransfer}s\n" -o /dev/null -s \
     https://your-origin.com \
     -H "Host: truespend.org"
   ```

2. **Optimize Backend**
   - Add database indexes
   - Implement caching (Redis)
   - Optimize Supabase queries
   - Use Supabase connection pooling

3. **Enable Cloudflare Caching**
   - Cache more aggressively (if data allows)
   - Use stale-while-revalidate

4. **Use Argo Tiered Cache** (Enterprise)
   - Reduces origin requests by ~60%

---

### Issue: Large JS Bundle Size

**Symptoms**:
- Slow load even with cache HIT
- Large `/assets/index-*.js` (>1MB)
- Long parse/compile time

**Root Cause**: Vite bundle not optimized.

**Solution**:

1. **Code Splitting**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom'],
             'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
           }
         }
       }
     }
   })
   ```

2. **Lazy Load Routes**
   ```typescript
   import { lazy, Suspense } from 'react'
   const Dashboard = lazy(() => import('./pages/Dashboard'))
   
   <Suspense fallback={<Loading />}>
     <Dashboard />
   </Suspense>
   ```

3. **Analyze Bundle**
   ```bash
   npm install -D rollup-plugin-visualizer
   npm run build
   # Check dist/stats.html
   ```

4. **Remove Unused Dependencies**
   ```bash
   npx depcheck
   npm uninstall unused-package
   ```

5. **Cloudflare Compression** (Already enabled)
   - Brotli: 20% smaller than gzip ✅
   - Check: `content-encoding: br`

---

## Build & Deploy Issues

### Issue: Build Succeeds But App Broken in Production

**Symptoms**:
- `npm run dev` works fine
- Production shows errors
- Build completes without errors

**Root Cause**: Environment variables or build configuration mismatch.

**Solution**:

1. **Check Environment Variables**
   ```bash
   # Ensure these are set in production
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   VITE_API_ORIGIN=...
   ```

2. **Test Production Build Locally**
   ```bash
   npm run build
   npm run preview
   # Visit http://localhost:4173
   ```

3. **Check Base Path**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     base: '/', // Or '/subdirectory/' if deploying to subdirectory
   })
   ```

4. **Verify Source Maps** (for debugging)
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       sourcemap: true, // Or 'hidden' for production
     }
   })
   ```

---

### Issue: Environment Variables Undefined

**Symptoms**:
```
Uncaught TypeError: Cannot read property 'VITE_SUPABASE_URL' of undefined
```

**Root Cause**: Environment variables not available at runtime.

**Solution**:

1. **Check Vite Env Prefix**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     envPrefix: 'VITE_', // Only VITE_* vars exposed to client
   })
   ```

2. **Verify .env File**
   ```bash
   # .env (committed to git for non-sensitive vars)
   VITE_SUPABASE_URL=https://uolpwcngftpmgkopltwz.supabase.co
   
   # .env.local (gitignored for sensitive vars)
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
   ```

3. **Check Deployment Platform**
   - Netlify: `Site settings` → `Environment variables`
   - Vercel: `Project Settings` → `Environment Variables`
   - Ensure variables set for Production environment

4. **Access at Runtime**
   ```typescript
   // Correct
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   
   // Incorrect (Node.js style - doesn't work in Vite)
   const supabaseUrl = process.env.VITE_SUPABASE_URL
   ```

---

## Diagnostic Tools

### Browser DevTools

**Network Tab**:
```
1. Open DevTools (F12)
2. Network tab
3. Reload page (Ctrl+R)
4. Check:
   - Status codes (200, 304, 403, 404, 429)
   - cf-cache-status header
   - content-encoding (br, gzip)
   - Response headers (CORS, security headers)
   - Timing (TTFB, download time)
```

**Console Tab**:
```
Look for:
- Red errors (blocking issues)
- Yellow warnings (non-blocking issues)
- CSP violations
- CORS errors
```

---

### cURL Commands

**Check Response Headers**:
```bash
curl -I https://truespend.org
```

**Check Specific Asset**:
```bash
curl -I https://truespend.org/assets/index-abc123.js
```

**Check Compression**:
```bash
curl -H "Accept-Encoding: br, gzip" -I https://truespend.org
```

**Test API Endpoint**:
```bash
curl https://truespend.org/api/health -H "Authorization: Bearer token"
```

**Test Rate Limiting**:
```bash
for i in {1..110}; do 
  curl -s https://truespend.org/api/health
done
```

---

### Cloudflare Trace

**Test Cloudflare Connection**:
```bash
curl https://truespend.org/cdn-cgi/trace
```

**Output**:
```
fl=123f456
h=truespend.org
ip=1.2.3.4
ts=1642000000.000
visit_scheme=https
uag=curl/7.68.0
colo=SJC
http=http/2
loc=US
tls=TLSv1.3
sni=plaintext
warp=off
gateway=off
```

**Useful Fields**:
- `colo`: Cloudflare data center serving you (SJC = San Jose)
- `tls`: TLS version (should be 1.3)
- `http`: HTTP version (should be http/2 or h3 for HTTP/3)
- `ip`: Your IP as seen by Cloudflare

---

### Cloudflare Dashboard Analytics

**Security Events**:
```
Security → Events:
- Last 24 hours
- Filter by:
  - Action: Block, Challenge, JS Challenge
  - Rule: Specific WAF rule
  - IP: Specific IP address
  - Country: Specific country
```

**Cache Analytics**:
```
Caching → Analytics:
- Cache hit rate (target: >80%)
- Saved bandwidth
- Top cached URLs
```

**Performance Metrics**:
```
Speed → Performance:
- Origin response time
- Edge response time
- TTFB distribution
```

---

### Test Security Rules

**SQL Injection Test**:
```bash
curl "https://truespend.org/?id=1'+OR+'1'='1"
# Expected: 403 Forbidden (blocked by WAF)
```

**XSS Test**:
```bash
curl "https://truespend.org/?q=<script>alert('xss')</script>"
# Expected: 403 Forbidden (blocked by WAF)
```

**Rate Limit Test**:
```bash
# 110 requests in rapid succession
seq 110 | xargs -I{} -P10 curl -s https://truespend.org/api/health
# Expected: Some return 429 Too Many Requests
```

---

### Check CSP Violations

**Browser Console**:
```javascript
// Listen for CSP violations
document.addEventListener('securitypolicyviolation', (e) => {
  console.log('CSP Violation:', {
    blockedURI: e.blockedURI,
    violatedDirective: e.violatedDirective,
    originalPolicy: e.originalPolicy
  })
})
```

**Your CSP Reporter**:
```
Check Supabase logs for csp-reporter function:
supabase functions logs csp-reporter
```

---

## Quick Diagnosis Checklist

When troubleshooting, run through this checklist:

### 1. Basic Connectivity
- [ ] Site loads over HTTPS
- [ ] No DNS errors
- [ ] Cloudflare status: Active

### 2. Cache Configuration
- [ ] `cf-cache-status: HIT` for static assets
- [ ] `cf-cache-status: BYPASS` for HTML
- [ ] `cf-cache-status: BYPASS` for API
- [ ] Query strings included in cache key

### 3. Security Settings
- [ ] No 403 errors for legitimate traffic
- [ ] CORS headers present on API responses
- [ ] Security headers present (HSTS, X-Frame-Options, etc.)
- [ ] CSP in Report-Only mode (initially)

### 4. Performance
- [ ] JS minification: OFF
- [ ] Brotli compression: ON
- [ ] Early Hints: ON
- [ ] HTTP/3: ON
- [ ] Rocket Loader: OFF

### 5. Build Configuration
- [ ] Production build works locally
- [ ] Environment variables set
- [ ] Source maps available (for debugging)
- [ ] Vite dedupe configured

---

## Getting Help

If issues persist after following this guide:

1. **Cloudflare Community**:
   - [Cloudflare Community Forums](https://community.cloudflare.com)
   - Post with:
     - Domain (if comfortable sharing)
     - Exact error message
     - `curl -I` output
     - Screenshot of rule configuration

2. **Cloudflare Support** (Pro+ plans):
   - Create support ticket
   - Include:
     - Ray ID (from error page)
     - Timestamp of issue
     - Detailed description

3. **Project Documentation**:
   - `docs/CLOUDFLARE_COMPLETE_SETUP.md` - Setup guide
   - `docs/CDN_SETUP.md` - CDN overview
   - `docs/WAF_SETUP.md` - WAF configuration
   - `docs/DDOS_PROTECTION.md` - DDoS mitigation

---

**Last Resort**: Temporarily disable Cloudflare to isolate issue:
```
DNS → Records → Click orange cloud to turn gray (DNS only)
Wait 5 minutes for propagation
Test if issue persists without Cloudflare
```

If issue gone: Cloudflare configuration problem
If issue persists: Origin/application problem
