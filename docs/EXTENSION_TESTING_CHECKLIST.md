# Browser Extension Testing Checklist

## Pre-Submission Testing for Chrome, Firefox, Safari

### 1. Installation & Setup (30 minutes)

#### Chrome Web Store
- [ ] Extension loads without errors in `chrome://extensions`
- [ ] All required permissions are requested and explained
- [ ] Icons display correctly (16x16, 48x48, 128x128)
- [ ] Privacy policy is accessible and links work
- [ ] Extension popup opens within 3 seconds

#### Firefox Add-ons (AMO)
- [ ] Extension passes `web-ext lint`
- [ ] Manifest V3 compatibility verified
- [ ] UUID properly configured in manifest
- [ ] All APIs are compatible with Firefox

#### Safari Web Extensions
- [ ] Xcode project builds successfully
- [ ] Extension signed with valid certificate
- [ ] Native messaging bridge works (if used)
- [ ] macOS permissions dialog appears correctly

---

### 2. Authentication Flow (45 minutes)

- [ ] **First-time user flow**
  - [ ] Privacy modal appears before any tracking
  - [ ] Google OAuth redirects correctly
  - [ ] Session stored securely in chrome.storage.local
  - [ ] User sees dashboard after successful auth
  
- [ ] **Returning user flow**
  - [ ] Session restored from storage
  - [ ] Token refresh works (test with expired token)
  - [ ] Re-authentication triggered on 401 errors
  
- [ ] **Sign out**
  - [ ] Session cleared from storage
  - [ ] User returned to sign-in screen
  - [ ] No cached data remains

---

### 3. Merchant Detection (Week 3 - 1 hour)

#### Test on 10+ popular e-commerce sites:
- [ ] Amazon.com - Product page detection
- [ ] eBay.com - Auction page detection
- [ ] Walmart.com - Product page detection
- [ ] Target.com - Product page detection
- [ ] BestBuy.com - Product page detection
- [ ] Etsy.com - Product page detection
- [ ] Nike.com - Product page detection
- [ ] Apple.com - Product page detection
- [ ] Home Depot - Product page detection
- [ ] Local merchant sites

**For each site verify:**
- [ ] Merchant name extracted correctly
- [ ] Product price detected (if available)
- [ ] Notification badge appears
- [ ] Detection logged in background script
- [ ] No console errors in content script

---

### 4. Budget Status Checking (Week 3 - 45 minutes)

- [ ] **Active budgets loaded**
  - [ ] Budgets fetched from Supabase on popup open
  - [ ] Multiple budgets displayed correctly
  - [ ] Spent amounts calculated accurately
  
- [ ] **Threshold alerts**
  - [ ] 90% budget alert triggered correctly
  - [ ] 100% exceeded alert shown
  - [ ] Alert notification shows merchant and price
  - [ ] Budget status updated in real-time
  
- [ ] **Edge cases**
  - [ ] No budgets: Appropriate message shown
  - [ ] Expired budgets: Not included in checks
  - [ ] Multiple categories: Correct budget matched

---

### 5. Notifications (Week 3 - 1 hour)

#### Test all notification types:
- [ ] **Budget alerts**
  - [ ] Notification appears when threshold crossed
  - [ ] Title and body text are clear
  - [ ] Click opens TrueSpend app
  
- [ ] **Deal alerts**
  - [ ] Nearby deals detected based on location
  - [ ] Favorite merchant deals prioritized
  - [ ] Distance calculation accurate
  
- [ ] **Merchant detection**
  - [ ] Detection notification on new sites
  - [ ] Can be disabled in settings
  
#### Notification settings:
- [ ] Toggle switches work in options page
- [ ] Settings persist after browser restart
- [ ] Disabling notifications stops all alerts

---

### 6. Feature Flags (Week 2 - 30 minutes)

- [ ] Flags loaded from Supabase on startup
- [ ] Real-time updates when flags change
- [ ] Features toggle on/off correctly
- [ ] Fallback to defaults if API fails

---

### 7. Telemetry & Analytics (Week 2 - 30 minutes)

- [ ] Events batched and sent every 15 minutes
- [ ] Queue persists across service worker restarts
- [ ] Failed events retry correctly
- [ ] Telemetry can be disabled in settings
- [ ] No PII in telemetry payloads

---

### 8. Error Handling (Production - 1 hour)

- [ ] **Error boundaries**
  - [ ] Popup errors caught and displayed
  - [ ] Options page errors caught
  - [ ] Reload button works
  
- [ ] **Offline mode**
  - [ ] Offline indicator appears
  - [ ] Cached data displayed
  - [ ] Actions queue for sync
  
- [ ] **Service worker crashes**
  - [ ] Extension recovers automatically
  - [ ] No data loss
  - [ ] User notified if manual action needed

---

### 9. Performance (Production - 45 minutes)

- [ ] **Bundle sizes**
  - [ ] popup.js < 500KB
  - [ ] options.js < 500KB
  - [ ] background.js < 300KB
  - [ ] content-merchant.js < 100KB
  
- [ ] **Load times**
  - [ ] Popup opens < 500ms
  - [ ] Options page loads < 1s
  - [ ] Merchant detection runs < 200ms
  
- [ ] **Memory usage**
  - [ ] Service worker < 50MB
  - [ ] No memory leaks after 1 hour
  - [ ] Popup cleaned up after close

---

### 10. Security (Production - 1 hour)

- [ ] **CORS validation**
  - [ ] Only extension origins accepted
  - [ ] Development localhost allowed in dev mode
  - [ ] Invalid origins rejected
  
- [ ] **CSP compliance**
  - [ ] No inline scripts in popup/options
  - [ ] All resources loaded from extension
  - [ ] No CSP violations in console
  
- [ ] **Secrets management**
  - [ ] No API keys in source code
  - [ ] Tokens encrypted in storage
  - [ ] Session properly scoped

---

### 11. Cross-Browser Testing (Production - 2 hours)

#### Chrome (Chromium-based)
- [ ] Chrome stable (latest)
- [ ] Chrome beta
- [ ] Edge (Chromium)
- [ ] Brave
- [ ] Opera

#### Firefox
- [ ] Firefox stable (latest)
- [ ] Firefox Developer Edition

#### Safari (macOS only)
- [ ] Safari Technology Preview
- [ ] Safari stable

**For each browser:**
- [ ] Extension installs successfully
- [ ] All features work as expected
- [ ] No console errors
- [ ] Performance acceptable

---

### 12. Automated Tests (Optional but Recommended)

#### Unit Tests (Vitest)
```bash
npm run test:unit
```
- [ ] All utility functions tested
- [ ] Storage helpers tested
- [ ] API client tested

#### E2E Tests (Playwright)
```bash
npm run test:e2e
```
- [ ] Authentication flow
- [ ] Merchant detection on test sites
- [ ] Notification triggers
- [ ] Settings persistence

---

## Store Submission Requirements

### Chrome Web Store
- [ ] Manifest V3 validated
- [ ] All permissions justified in description
- [ ] Privacy policy URL active
- [ ] Support email provided
- [ ] Screenshots (1280x800 or 640x400)
- [ ] Promotional tile (440x280)
- [ ] Store listing description (132 chars short, detailed long)

### Firefox Add-ons (AMO)
- [ ] Source code uploaded (if minified)
- [ ] Add-on passes automated review
- [ ] Self-distribution key (if needed)
- [ ] Privacy policy on AMO

### Safari Extensions Gallery
- [ ] Xcode archive created
- [ ] App signed with distribution certificate
- [ ] Safari Extensions Gallery agreement signed
- [ ] Privacy policy in App Store Connect

---

## Pre-Launch Checklist

- [ ] All tests passed
- [ ] No critical bugs in issue tracker
- [ ] Privacy policy reviewed by legal
- [ ] Marketing materials prepared
- [ ] Support documentation written
- [ ] Rollback plan documented
- [ ] Monitoring/alerting configured
- [ ] Beta testers provided feedback

---

## Post-Launch Monitoring (First 48 hours)

- [ ] Monitor error rates in telemetry
- [ ] Check user reviews on stores
- [ ] Verify usage metrics
- [ ] Monitor API error rates
- [ ] Check crash reports
- [ ] Respond to support tickets

---

## Notes

**Estimated Total Testing Time:** 10-12 hours
**Recommended Team Size:** 2-3 testers
**Testing Frequency:** Before each release
**Automated Coverage Target:** 60% of critical paths
