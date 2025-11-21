# Browser Extension Development Guide

## Production Readiness Status

**Phase 11 Status:** 🟡 **30% Complete (Basic Structure Only)**  
**Production Ready:** ❌ **No - Significant Work Needed**  
**Timeline:** Weeks 35-37 (3 weeks to complete)

### What's Implemented (30%)
- ✅ Manifest V3 structure (`manifest.json`)
- ✅ Basic popup UI (`popup/Popup.tsx`)
- ✅ Privacy modal (`popup/PrivacyModal.tsx`)
- ✅ Error boundary (`popup/ErrorBoundary.tsx`)
- ✅ Background service worker skeleton (`background/index.ts`)
- ✅ Content script skeleton (`content/merchant-detector.ts`)
- ✅ Shared utilities (API client, logger, storage)

### What's Missing (70%)
- ❌ Complete OAuth authentication flow
- ❌ Production-tested merchant detection
- ❌ Feature flags integration
- ❌ Telemetry system
- ❌ Options page for settings
- ❌ Chrome Web Store listing & assets
- ❌ E2E tests for extension
- ❌ Cross-browser compatibility testing
- ❌ Performance optimization
- ❌ Security audit

## Overview
The TrueSpend Browser Extension provides real-time budget tracking while users shop online. Built with Manifest V3 for Chrome/Edge/Brave compatibility.

## Build & Development

### Building the Extension

```bash
# Build for production
npm run build:extension

# Development build with watch mode
npm run dev:extension
```

### Project Structure

```
extension/
├── manifest.json              # Chrome Manifest V3 config
├── popup/                     # Extension popup UI
│   ├── index.html
│   ├── index.tsx             # Popup entry point
│   ├── Popup.tsx             # Main popup component
│   └── PrivacyModal.tsx      # GDPR compliance modal
├── background/                # Service worker (ephemeral)
│   ├── index.ts              # Main background script
│   └── auth.ts               # OAuth authentication
└── content/                   # Content scripts
    └── merchant-detector.ts   # Detect merchants on e-commerce sites
```

## Local Testing

### Chrome/Edge/Brave

1. Build the extension:
   ```bash
   npm run build:extension
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked"

5. Select the `dist/extension` directory

6. The extension icon should appear in your toolbar

### Firefox (Optional)

1. Build the extension:
   ```bash
   npm run build:extension
   ```

2. Navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```

3. Click "Load Temporary Add-on"

4. Select `dist/extension/manifest.json`

**Note:** Firefox uses Manifest V2, so some features may need adaptation.

## Testing Checklist

### Core Functionality
- [ ] Extension icon appears in browser toolbar
- [ ] Popup opens when clicking icon
- [ ] Privacy modal appears on first use
- [ ] "Sign In with Google" button works
- [ ] OAuth flow completes successfully
- [ ] Budgets display correctly after auth
- [ ] Progress bars show correct percentages
- [ ] Budget alerts show when threshold reached

### Merchant Detection
- [ ] Visit Amazon.com - merchant detected
- [ ] Visit Walmart.com - merchant detected
- [ ] Visit Target.com - merchant detected
- [ ] Price extraction works on product pages
- [ ] Detection works on single-page apps (SPAs)

### Background Worker
- [ ] Service worker starts on browser launch
- [ ] Alarms trigger every 15 minutes
- [ ] Budget cache refreshes automatically
- [ ] Badge updates on budget threshold
- [ ] Works after browser restart

### Authentication
- [ ] OAuth flow works end-to-end
- [ ] Session persists across popup closes
- [ ] Token refresh works before expiry
- [ ] Re-auth triggered on 401 errors
- [ ] Logout clears stored session

### Cross-Browser
- [ ] Works on Chrome (latest)
- [ ] Works on Edge (latest)
- [ ] Works on Brave (latest)
- [ ] Firefox compatibility verified (optional)

## Troubleshooting

### Popup Not Showing Budgets

**Symptoms:** Popup opens but shows "Loading..." forever or "No budgets found"

**Solutions:**
1. Check browser console (F12) for errors
2. Verify authentication:
   ```javascript
   chrome.storage.local.get(['session'], console.log)
   ```
3. Check CORS configuration in edge functions
4. Ensure Supabase project allows extension origin

### Service Worker Crashes

**Symptoms:** Background script stops responding after 30 seconds

**Cause:** Manifest V3 service workers are ephemeral (30s timeout)

**Solutions:**
1. Use `chrome.alarms` for persistent tasks (already implemented)
2. Store state in `chrome.storage`, not memory
3. Check service worker console:
   - Go to `chrome://extensions`
   - Click "Service Worker" link
   - View console logs

### Merchant Detection Not Working

**Symptoms:** No merchant detected on e-commerce sites

**Solutions:**
1. Check content script is injected:
   ```javascript
   // In page console
   console.log('Content script loaded?')
   ```
2. Verify `content_scripts` in manifest.json
3. Check `host_permissions` allow the domain
4. Look for price selector matches in merchant-detector.ts

### Authentication Fails

**Symptoms:** OAuth flow opens but never completes

**Solutions:**
1. Verify `oauth2.client_id` in manifest.json
2. Check Chrome Identity API permissions
3. Ensure redirect URL matches Supabase config
4. Check Supabase Auth settings allow OAuth

### Build Errors

**Symptoms:** `npm run build:extension` fails

**Solutions:**
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. Check Vite config for extension mode
3. Ensure all import paths use `@/` alias
4. Verify TypeScript types are correct

## Environment Variables

The extension uses the same environment variables as the main app:

```env
VITE_SUPABASE_URL=https://uolpwcngftpmgkopltwz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key-here
```

These are automatically included during build.

## Security Notes

1. **No Inline Scripts:** Manifest V3 requires all code in separate files
2. **CSP Compliance:** No `eval()` or dynamic code execution
3. **Host Permissions:** Only request necessary domains
4. **Token Storage:** Uses `chrome.storage.local` (encrypted by browser)
5. **HTTPS Only:** Content scripts only run on HTTPS sites

## Performance Tips

1. **Debounce Detection:** Merchant detector uses 1s debounce
2. **Cache Budgets:** Refreshed every 15 minutes via alarm
3. **Lazy Load:** Popup components load on demand
4. **Small Bundle:** Extension-specific build config

## Next Steps

After Week 1 is complete, Week 2 will add:
- Options page for user settings
- Real-time budget alerts
- Enhanced telemetry
- Feature flags service
- Advanced merchant detection

## Resources

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
