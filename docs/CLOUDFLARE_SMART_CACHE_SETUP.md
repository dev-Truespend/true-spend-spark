# Cloudflare Smart Caching Setup Guide

**Purpose**: Configure Cloudflare to balance performance with fast update propagation (updates visible within 30 seconds to 5 minutes).

## Prerequisites

- Cloudflare account with your domain added
- Domain DNS pointing to Cloudflare nameservers
- Access to Cloudflare dashboard
- Your app deployed and accessible

---

## Overview of Smart Caching Strategy

This configuration implements:
- ✅ **HTML always fresh** - Bypassed from cache (users get updates immediately)
- ✅ **Assets cached briefly** - 5-minute TTL (good performance, fast updates)
- ✅ **APIs never cached** - Real-time data always
- ✅ **Combined with app-level caching** - Service Worker (5 min), React Query (30s)

**Result**: Users see updates within **30 seconds to 5 minutes** while maintaining good performance.

---

## Step 1: Access Cache Rules

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain from the list
3. In the left sidebar, navigate to: **Caching** → **Cache Rules**
4. Click **Create rule** button

---

## Step 2: Create Rule 1 - Bypass HTML (Priority 1)

### Purpose
Ensures users always get the latest HTML shell, which loads the latest JS/CSS bundles.

### Configuration

**Rule Name**: `Bypass HTML`

**When incoming requests match...**
- Click **Edit expression**
- Enter this custom expression:
  ```
  (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/auth") or ends_with(http.request.uri.path, ".html"))
  ```

**Then...**
- **Eligible for cache**: Yes (keep checked)
- **Setting**: Edge TTL
  - **Status code**: All status codes
  - **Ignore cache-control header and use this TTL**: Select this
  - **Duration**: 0 seconds (Bypass cache)
- **Setting**: Browser TTL
  - **Mode**: Respect existing headers

**Save & Deploy**

### Visual Verification
After saving, the rule should show:
- Priority: 1
- Match: `(http.request.uri.path eq "/" or starts_with(...`
- Action: Bypass cache

---

## Step 3: Create Rule 2 - Short TTL for Assets (Priority 2)

### Purpose
Cache static assets (JS, CSS, images) for 5 minutes to reduce bandwidth while allowing quick updates.

### Configuration

**Rule Name**: `Assets - 5 Minute Cache`

**When incoming requests match...**
- Click **Edit expression**
- Enter this custom expression:
  ```
  (http.request.uri.path matches "^/assets/.*\\.(js|css|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$")
  ```

**Then...**
- **Eligible for cache**: Yes (keep checked)
- **Setting**: Edge TTL
  - **Status code**: All status codes
  - **Ignore cache-control header and use this TTL**: Select this
  - **Duration**: 5 minutes (300 seconds)
- **Setting**: Browser TTL
  - **Mode**: Override origin
  - **Duration**: 5 minutes (300 seconds)

**Save & Deploy**

### Visual Verification
After saving, the rule should show:
- Priority: 2
- Match: `(http.request.uri.path matches "^/assets/...`
- Action: Cache with 5-minute TTL

---

## Step 4: Create Rule 3 - Bypass API Calls (Priority 3)

### Purpose
Never cache API responses to ensure real-time data.

### Configuration

**Rule Name**: `Bypass API Calls`

**When incoming requests match...**
- Field: **URI Path**
- Operator: **starts with**
- Value: `/api/`

**OR** if using Supabase Edge Functions:
- Click **Edit expression**
- Enter this custom expression:
  ```
  (starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/functions/"))
  ```

**Then...**
- **Eligible for cache**: Yes (keep checked)
- **Setting**: Edge TTL
  - **Status code**: All status codes
  - **Ignore cache-control header and use this TTL**: Select this
  - **Duration**: 0 seconds (Bypass cache)
- **Setting**: Browser TTL
  - **Mode**: Respect existing headers

**Save & Deploy**

### Visual Verification
After saving, the rule should show:
- Priority: 3
- Match: `(starts_with(http.request.uri.path, "/api/")`
- Action: Bypass cache

---

## Step 5: Verify Rule Order

Go back to **Caching** → **Cache Rules** and verify the rules are in this order:

1. **Bypass HTML** (Priority 1)
2. **Assets - 5 Minute Cache** (Priority 2)
3. **Bypass API Calls** (Priority 3)

**Important**: Order matters! Cloudflare processes rules from top to bottom and stops at the first match.

If needed, drag and drop to reorder rules.

---

## Step 6: Purge Existing Cache

After creating all rules:

1. Navigate to **Caching** → **Configuration**
2. Scroll to **Purge Cache** section
3. Click **Purge Everything**
4. Confirm the purge

**Wait 2-3 minutes** for the purge to complete and new rules to propagate globally.

---

## Step 7: Turn OFF Development Mode

If you enabled Development Mode earlier:

1. Navigate to **Caching** → **Configuration**
2. Find **Development Mode** toggle
3. Turn it **OFF**

This ensures your cache rules are now active.

---

## Verification Tests

### Test 1: HTML Not Cached

```bash
# Replace with your domain
curl -I https://yourdomain.com/

# Check response headers - should see:
# Cache-Control: no-store, no-cache, must-revalidate, max-age=0
# CF-Cache-Status: DYNAMIC (or BYPASS)
```

### Test 2: Assets Cached for 5 Minutes

```bash
# Test an asset
curl -I https://yourdomain.com/assets/index-abc123.js

# First request should show:
# CF-Cache-Status: MISS

# Second request (immediate) should show:
# CF-Cache-Status: HIT
# Cache-Control: public, max-age=300
```

### Test 3: API Not Cached

```bash
# Test API endpoint
curl -I https://yourdomain.com/api/some-endpoint

# Should show:
# CF-Cache-Status: DYNAMIC (or BYPASS)
```

### Test 4: Browser DevTools Check

1. Open your site in Chrome/Firefox
2. Open DevTools (F12) → **Network** tab
3. Check **Disable cache** (to see actual server behavior)
4. Reload page (Ctrl+R)
5. Look at the **Size** column:
   - HTML files: Should show size (not "disk cache")
   - Assets in `/assets/`: May show "disk cache" after first load
   - Subsequent loads within 5 minutes: Assets from "disk cache"
6. Check **Response Headers** for an asset:
   - Should see `cache-control: public, max-age=300`

---

## Troubleshooting

### Issue: Changes Not Visible After 5 Minutes

**Solution**:
1. Verify rules are active (not in simulate mode)
2. Check rule order - HTML bypass must be first
3. Purge cache again: **Caching** → **Configuration** → **Purge Everything**
4. Check browser isn't caching aggressively:
   - Try incognito mode
   - Hard refresh (Ctrl+Shift+R)
5. Wait 5-10 minutes after deployment for CDN propagation

### Issue: Assets Always Fetched (No Caching)

**Check**:
1. Verify Rule 2 (Assets) has correct regex pattern
2. Check asset URLs match pattern (should be `/assets/*.js`, `/assets/*.css`, etc.)
3. Verify "Eligible for cache" is checked
4. Check origin server isn't sending `Cache-Control: no-store`

### Issue: Old Version Stuck for Users

**Emergency Fix**:
1. **Caching** → **Configuration** → **Purge Everything**
2. Turn on **Development Mode** for 3 hours (bypasses all caching)
3. Fix the issue
4. Redeploy
5. Turn off Development Mode
6. Purge cache again

### Issue: API Responses Being Cached

**Check**:
1. Rule 3 (API Bypass) is active
2. API paths match the rule pattern
3. No other rules are interfering (check rule order)
4. If using `/functions/v1/` for Supabase, update Rule 3 pattern

---

## Monitoring Cache Performance

### Cloudflare Analytics

1. Go to **Analytics & Logs** → **Traffic**
2. Check:
   - **Cache Hit Rate**: Should be 40-60% (assets cached, HTML/API not)
   - **Bandwidth Saved**: Shows how much traffic is served from cache
   - **Requests by Status**: Look for 200 (success) vs 304 (not modified)

### Expected Metrics

- **Cache Hit Rate**: 40-70% (lower than aggressive caching, but acceptable)
- **Origin Requests**: Higher than long TTL, but reduces bandwidth costs
- **TTFB (Time to First Byte)**: Should be fast for cached assets

---

## Advanced: Country-Specific or Mobile-Specific Caching

If you need different cache behavior for mobile or specific countries:

### Mobile-Specific Cache

Add to Rule 2 (Assets):
```
and (http.user_agent contains "Mobile")
```

### Country-Specific Bypass

Create a new rule (Priority 1):
```
(ip.geoip.country eq "US")
```
Then: Bypass cache for US traffic (useful for testing)

---

## Updating Cache Rules Later

To adjust TTL values:

1. **More aggressive caching** (slower updates, better performance):
   - Rule 2: Change 5 minutes → 15 minutes (900 seconds)
   - Update `public/sw.js`: Change `static: 5 * 60 * 1000` → `15 * 60 * 1000`
   - Update `vercel.json`: Change `max-age=300` → `max-age=900`

2. **Faster updates** (more aggressive freshness checks):
   - Rule 2: Change 5 minutes → 2 minutes (120 seconds)
   - Update `src/main.tsx`: Change `10000` → `5000` (check every 5 seconds)
   - Update `src/App.tsx`: Change `staleTime: 1000 * 30` → `1000 * 15` (15 seconds)

After changes, always:
1. **Save rules**
2. **Purge cache**
3. **Redeploy app** (if you changed code)
4. **Wait 5 minutes** for propagation

---

## Summary

✅ **What This Achieves**:
- Users see updates within **30 seconds to 5 minutes**
- Good performance for static assets (5-minute cache)
- HTML always fresh (immediate updates)
- APIs always real-time (no cache)
- Combined with Service Worker (10s update checks) and React Query (30s refetch)

✅ **Balance Achieved**:
- **Performance**: Assets cached briefly (reduces bandwidth)
- **Consistency**: HTML bypassed (users get updates fast)
- **Real-time Data**: APIs never cached

✅ **Maintenance**:
- No manual cache purging needed for normal deploys
- Cache auto-expires in 5 minutes
- Update checks every 10 seconds ensure users are prompted

---

## Next Steps

1. ✅ Complete this guide
2. ✅ Deploy your app
3. ✅ Monitor Cloudflare Analytics for 24 hours
4. ✅ Adjust TTLs if needed based on user feedback
5. ✅ Document your specific cache strategy for your team

---

## Emergency Contacts

- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **Cloudflare Community**: https://community.cloudflare.com/
- **Cloudflare Support**: Available in dashboard (paid plans)

---

## Related Documentation

- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/)
- [Understanding Cache-Control Headers](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [Cloudflare Cache Analytics](https://developers.cloudflare.com/analytics/account-and-zone-analytics/zone-analytics/)
