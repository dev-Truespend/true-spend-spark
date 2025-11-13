# Caching Strategy

## Overview
This document outlines the enterprise-grade caching strategy for TrueSpend v4.2 to ensure users always see the latest changes after deployment while maximizing performance through aggressive asset caching.

## Static Assets (JS/CSS/Images)

### Pattern
- `/assets/*-[hash].*` (e.g., `/assets/index-a1b2c3d4.js`)

### Cache Headers
```
Cache-Control: public, max-age=31536000, immutable
```

### Why This Works
- **Hashed filenames** = Safe to cache forever
- Each build generates new hash = New unique filename
- Old assets are automatically invalidated (new hash = different URL)
- Browsers never serve stale JS/CSS

### Implementation
- **Vite Build**: Configured in `vite.config.ts` to output hashed filenames
- **CDN Headers**: Configured in `vercel.json` (or Cloudflare) to set appropriate cache headers
- **Service Worker**: Only caches hashed assets matching pattern `/assets/[name]-[hash].[ext]`

### Purge Strategy
**Never needed** - New hash creates new file, old cached files become unused

---

## HTML/Index Pages

### Pattern
- `/`, `/index.html`, any HTML document

### Cache Headers
```
Cache-Control: no-cache, must-revalidate
```

### Why This Matters
- Ensures users **always** fetch latest HTML shell from server
- HTML references the latest hashed JS/CSS bundles
- Without this, users could load old HTML that references old (deleted) assets

### Implementation
- **CDN Headers**: Configured in `vercel.json` for all non-asset routes
- **Service Worker**: Explicitly excludes HTML from aggressive caching

### Purge Strategy
**Automatic** - `no-cache` directive forces revalidation on every request

---

## API Responses

### Pattern
- `/rest/v1/*` (Supabase Data API)
- `/auth/v1/*` (Supabase Auth API)
- `/functions/v1/*` (Edge Functions)

### Cache Headers
```
Cache-Control: private, max-age=0
```

### Why Private
- Data is **user-specific** and must not be cached by CDN
- Only browser cache (if any) should store responses

### Service Worker Strategy
- **Stale-While-Revalidate** with 7-day expiration
- Returns cached data immediately while fetching fresh data in background
- Provides offline capability without serving forever-stale data

### Purge Strategy
**Not needed** - Service worker respects `max-age` and expires entries after 7 days

---

## Deployment Checklist

### Pre-Deployment
1. **Build the app**: `npm run build`
2. **Verify hashed filenames**: Check `dist/assets/` folder
   - ✅ Should see: `index-a1b2c3d4.js`, `main-e5f6g7h8.css`
   - ❌ Should NOT see: `index.js`, `main.css`

### Post-Deployment
3. **Test static asset caching**:
   ```bash
   curl -I https://yourdomain.com/assets/index-a1b2c3d4.js
   ```
   - ✅ Should see: `cache-control: public, max-age=31536000, immutable`

4. **Test HTML caching**:
   ```bash
   curl -I https://yourdomain.com/
   ```
   - ✅ Should see: `cache-control: no-cache, must-revalidate`

5. **Test API caching**:
   ```bash
   curl -I https://yourdomain.com/rest/v1/profiles
   ```
   - ✅ Should see: `cache-control: private, max-age=0`

### Troubleshooting

#### Users still seeing old UI after deployment
1. Check browser DevTools → Network tab
2. Look at `index.html` response headers
3. If `cache-control` shows `max-age=31536000`, CDN config is wrong
4. Fix: Update `vercel.json` or Cloudflare Page Rules

#### Service worker serving stale assets
1. Check SW version: Open DevTools → Application → Service Workers
2. New SW should show "waiting to activate"
3. Click "skipWaiting" or refresh page
4. Verify `CACHE_VERSION` was updated in `public/sw.js`

---

## CDN Configuration Examples

### Vercel (`vercel.json`)
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, must-revalidate"
        }
      ]
    }
  ]
}
```

### Cloudflare (Page Rules)
1. Rule 1: `*yourdomain.com/assets/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year
   - Browser Cache TTL: 1 year

2. Rule 2: `*yourdomain.com/*`
   - Cache Level: Standard
   - Edge Cache TTL: Bypass Cache
   - Browser Cache TTL: Respect Existing Headers

---

## Service Worker Cache Strategy

### Static Assets (Hashed)
- **Strategy**: Cache-first with background update
- **Max Age**: 30 days
- **Pattern**: `/assets/*-[hash].*`

### API Responses
- **Strategy**: Stale-while-revalidate
- **Max Age**: 7 days
- **Pattern**: `/rest/v1/*`, `/auth/v1/*`, `/functions/v1/*`

### Runtime Cache (Images, etc.)
- **Strategy**: Network-first, fallback to cache
- **Max Age**: 1 day
- **Max Entries**: 50

---

## Safe Cache Purge

### When to Purge
- **Never** for static assets (hash changes automatically)
- **Rarely** for HTML (short TTL handles it)
- **Only if emergency** for API cache (service worker expires in 7 days)

### How to Purge

#### Cloudflare
1. Dashboard → Caching → Configuration
2. Click "Purge Everything" or "Purge by URL"

#### Vercel
- Auto-purged on each deployment

#### Service Worker
- Update `CACHE_VERSION` in `public/sw.js`
- Redeploy app
- Users will get new SW on next visit

---

## Performance Metrics

### Target Metrics (Lighthouse)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cache Hit Rate**: > 90% (static assets)

### Monitoring
- Use Cloudflare Analytics or Vercel Analytics
- Monitor cache hit ratio
- Track asset size over time
- Set alerts for cache hit rate < 80%

---

## Security Considerations

### Subresource Integrity (SRI)
- Enabled for production builds via `rollup-plugin-sri`
- Ensures hashed assets haven't been tampered with
- Configured in `vite.config.ts`

### CORS Headers
- Strict CORS on API endpoints
- Public assets served with `Access-Control-Allow-Origin: *`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-13 | Initial caching strategy |
| 1.1 | 2025-01-13 | Added hashed asset caching |
| 1.2 | 2025-01-13 | Removed HTML from SW cache |

---

## Support

For questions or issues:
1. Check Troubleshooting section above
2. Review Network tab in browser DevTools
3. Verify CDN configuration matches this document
4. Contact DevOps team if persistent issues
