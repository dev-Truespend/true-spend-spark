# PWA/Offline Features - Disable/Enable Guide

## Current Status: DISABLED

PWA and offline features are currently disabled to ensure users always see the latest content without service worker cache interference.

## What Was Changed

### 1. Feature Flag Control (`VITE_PWA_ENABLED`)
- **Default**: `false` (PWA disabled)
- All PWA features are now gated behind this environment variable
- When disabled, the app functions as a standard web application

### 2. Service Worker Cleanup
- **Self-destruct service worker** deployed to `public/sw.js`
- Automatically unregisters itself and clears all caches
- Ensures clean removal of offline functionality
- All clients are reloaded with fresh content

### 3. UI Components Hidden
The following components are conditionally rendered only when `VITE_PWA_ENABLED=true`:
- `<ServiceWorkerUpdatePrompt />` - Update notifications
- `<PWAInstallPrompt />` - Installation prompt
- `<OfflineIndicator />` - Offline status indicator
- `<SyncIndicator />` - Sync status indicator

### 4. Manifest Disabled
- Manifest link removed from `index.html`
- Prevents PWA installation prompts
- App still has theme color for browser UI

### 5. Production Cleanup Logic
When deployed with `VITE_PWA_ENABLED=false`:
- On page load, unregisters all service workers
- Clears all Cache Storage entries
- Logs cleanup actions to console

## Current Behavior

### ✅ What Works
- **Always fresh content** - No service worker caching
- **Cloudflare edge caching** - Still active (5-minute TTL on assets)
- **React Query caching** - In-memory only (30-second stale time)
- **Browser HTTP cache** - Respects 30-second TTL
- **Real-time updates** - Users see changes within 30 seconds to 5 minutes

### ❌ What's Disabled
- Offline functionality
- Background sync
- Push notifications
- PWA installation
- Service worker caching
- Offline indicators

## How to Re-Enable PWA Features

### For Future Production Use

**Step 1: Set Environment Variable**
```bash
# In your deployment platform (Vercel, Netlify, etc.)
VITE_PWA_ENABLED=true
```

**Step 2: Restore Full Service Worker**
The self-destruct service worker in `public/sw.js` needs to be replaced with a full-featured version. You can:
- Use version control to restore the previous `public/sw.js`
- Or copy from the project's git history before this change
- The full SW includes caching strategies, offline support, and background sync

**Step 3: Re-enable Manifest (Optional)**
In `index.html`, uncomment:
```html
<link rel="manifest" href="/manifest.json" />
```

**Step 4: Deploy**
- Deploy the updated code
- The self-destruct SW will run one final time on existing clients
- New SW will register and enable offline features

**Step 5: Verify**
Open DevTools → Application:
- ✅ Service Worker should be registered
- ✅ Cache Storage should populate
- ✅ PWA install prompt should appear (after criteria met)

## Development Mode

Development mode (`npm run dev`) always:
- Unregisters service workers
- Clears all caches
- Ensures Vite HMR works properly

This prevents confusion during development and ensures you're always testing latest code.

## Testing the Current Setup

### Test 1: No Service Worker
```javascript
// Open DevTools Console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs.length); // Should be 0
});
```

### Test 2: No Cache Storage
```javascript
// Open DevTools Console
caches.keys().then(keys => {
  console.log('Caches:', keys); // Should be empty array []
});
```

### Test 3: Fresh Content on Refresh
1. Deploy a change (e.g., update text)
2. Wait 30 seconds (for React Query stale time)
3. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Changes should appear immediately

### Test 4: Network Tab
1. Open DevTools → Network
2. Refresh page
3. Look for responses:
   - HTML: Should show "from network"
   - Assets: May show "from disk cache" (browser HTTP cache) or "from network"
   - No "(from ServiceWorker)" entries

## Architecture Decision

### Why Disable PWA Now?
1. **Development Phase** - Frequent updates need to reach users immediately
2. **Cache Confusion** - Multiple caching layers (SW, Cloudflare, browser) were stacking
3. **Debugging Complexity** - Service worker cache was masking update issues
4. **User Experience** - Users were seeing stale content despite multiple purges

### When to Re-Enable?
Consider re-enabling PWA features when:
- App is feature-complete and updates are less frequent
- You need offline functionality for users
- You want to reduce server bandwidth usage
- You're targeting markets with poor connectivity
- You need background sync for critical features

### Hybrid Approach (Recommended for Production)
When re-enabling, use this configuration:
```javascript
// Smart caching strategy
- HTML: Never cache (network-only)
- API calls: Never cache (network-only)
- Assets: Cache with short TTL (5-10 minutes max)
- Images/fonts: Cache with medium TTL (1 hour max)
- Aggressive update checks: Every 10-30 seconds
- Auto-reload on update: Prompt or auto with user consent
```

## Monitoring

### Console Messages to Watch

**When PWA is Disabled:**
```
[PWA] PWA disabled - cleaning up service workers and caches
[PWA] Unregistered service worker
[PWA] Deleted cache: truespend-static-v2.0.0-...
[PWA] Deleted cache: truespend-api-v2.0.0-...
[PWA] Cleanup complete
```

**Self-Destruct Service Worker:**
```
[SW self-destruct-v1] Self-destruct service worker loaded
[SW self-destruct-v1] Installing self-destruct worker
[SW self-destruct-v1] Activating - cleaning up and unregistering
[SW self-destruct-v1] Deleting 3 caches
[SW self-destruct-v1] Claimed all clients
[SW self-destruct-v1] Found 1 clients to reload
[SW self-destruct-v1] Unregistered: true
```

## Related Documentation

- [CLOUDFLARE_SMART_CACHE_SETUP.md](./CLOUDFLARE_SMART_CACHE_SETUP.md) - Edge caching configuration
- [CLOUDFLARE_COMPLETE_SETUP.md](./CLOUDFLARE_COMPLETE_SETUP.md) - Full Cloudflare setup
- [CACHING_STRATEGY.md](./caching-strategy.md) - Overall caching architecture

## Troubleshooting

### Issue: Still seeing cached content
**Solution:**
1. Check DevTools → Application → Service Workers (should be empty)
2. Check DevTools → Application → Cache Storage (should be empty)
3. Hard refresh (Ctrl+Shift+R)
4. Clear browser data for the site
5. Try incognito window

### Issue: Console errors about service worker
**Solution:**
- These are expected during the self-destruct process
- Should stop appearing after one page reload
- If persistent, manually unregister in DevTools

### Issue: Want to test PWA features locally
**Solution:**
```bash
# Create .env.local file
echo "VITE_PWA_ENABLED=true" > .env.local

# Build and preview
npm run build
npm run preview
```

## Summary

**Current Configuration:**
- ✅ PWA features disabled
- ✅ Service worker removed
- ✅ All caches cleared
- ✅ Fresh content on every load (after short browser cache)
- ✅ Cloudflare edge caching active (5-min TTL)
- ✅ Simple to re-enable when ready

**User Experience:**
Users now see updates within **30 seconds to 5 minutes** instead of potentially days with old service worker cache.
