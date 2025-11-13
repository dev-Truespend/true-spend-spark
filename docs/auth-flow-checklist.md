# Auth Flow QA Checklist

## Overview
This checklist ensures the enterprise-grade authentication flow for TrueSpend v4.2 works correctly across all scenarios, including 2FA verification, role-based access, and proper UI state management.

---

## Pre-Deployment Testing

### Email + Password Authentication
- [ ] **Login Form Validation**
  - [ ] Empty email shows validation error
  - [ ] Invalid email format shows validation error
  - [ ] Password < 6 characters shows validation error
  - [ ] Valid credentials proceed to 2FA screen

- [ ] **Signup Form Validation**
  - [ ] Same validation as login
  - [ ] Duplicate email shows user-friendly error
  - [ ] Successful signup creates account and shows confirmation

- [ ] **Password Security**
  - [ ] Password field masked (type="password")
  - [ ] Password not logged to console
  - [ ] No password in URL parameters

### Google OAuth Authentication
- [ ] **Google Sign-In Button**
  - [ ] Button visible on `/auth` page
  - [ ] Clicking button redirects to Google OAuth
  - [ ] Google consent screen displays correct app name
  - [ ] Successful OAuth returns to app

- [ ] **OAuth Error Handling**
  - [ ] Cancelled OAuth shows user-friendly message
  - [ ] OAuth error parameters don't persist in URL
  - [ ] Network errors handled gracefully

### 2FA Verification Flow
- [ ] **Email + Password → 2FA**
  - [ ] After valid credentials, user redirected to `/auth/verify-2fa`
  - [ ] User NOT logged in until 2FA complete
  - [ ] Cannot access dashboard without 2FA verification

- [ ] **Google OAuth → 2FA**
  - [ ] After Google OAuth, user redirected to `/auth/verify-2fa`
  - [ ] Same 2FA requirements as email login
  - [ ] User session not established until 2FA complete

- [ ] **2FA Screen**
  - [ ] Shows method selection (Email / SMS)
  - [ ] SMS option disabled with "Coming Soon" label
  - [ ] Email option shows user's email address
  - [ ] "Send Verification Code" button works

- [ ] **OTP Input**
  - [ ] 6-digit numeric input only
  - [ ] Input auto-focuses on page load
  - [ ] Non-numeric characters rejected
  - [ ] Copy-paste of 6-digit code works

- [ ] **OTP Validation**
  - [ ] Invalid OTP shows clear error message
  - [ ] Valid OTP redirects to correct dashboard
  - [ ] Expired OTP (5min) shows timeout message
  - [ ] Wrong OTP doesn't lock account (rate limit only)

- [ ] **Resend OTP**
  - [ ] "Resend code" button available
  - [ ] Countdown timer displays correctly (5:00 → 0:00)
  - [ ] Resend disabled during countdown
  - [ ] New OTP invalidates old OTP
  - [ ] Toast notification confirms code sent

- [ ] **2FA Session Management**
  - [ ] Refreshing `/auth/verify-2fa` doesn't lose state
  - [ ] Closing tab and reopening requires new 2FA
  - [ ] "Back to Login" button clears 2FA state

---

## Route Protection Testing

### Public Routes (No Auth Required)
- [ ] `/` - Home page accessible
- [ ] `/auth` - Login page accessible

### Protected Routes (Auth + 2FA Required)
- [ ] **Dashboard Routes**
  - [ ] `/dashboard` - Accessible after login + 2FA
  - [ ] Redirect to `/auth` when not logged in
  - [ ] Redirect to `/auth/verify-2fa` when logged in but not verified

- [ ] **Admin Routes**
  - [ ] `/launcher` - Accessible only to admin role
  - [ ] `/admin/*` - Accessible only to admin role
  - [ ] User role accessing `/admin` redirected to `/dashboard`
  - [ ] No error messages, silent redirect

### Role-Based Access Control (RBAC)
- [ ] **User Role**
  - [ ] Can access `/dashboard`
  - [ ] Cannot access `/admin`
  - [ ] Cannot access `/launcher`
  - [ ] After login + 2FA, redirected to `/dashboard`

- [ ] **Admin Role**
  - [ ] Can access `/dashboard`
  - [ ] Can access `/admin/*`
  - [ ] Can access `/launcher`
  - [ ] After login + 2FA, redirected to `/launcher`

- [ ] **Developer Role (if implemented)**
  - [ ] Can access `/monitoring`
  - [ ] Access level between user and admin

### Navigation State Management
- [ ] **When NOT Logged In**
  - [ ] Navigation shows "Sign In" button
  - [ ] Navigation shows "Sign Up" button
  - [ ] No user avatar visible
  - [ ] Clicking "Sign In" → `/auth`

- [ ] **When Logged In + 2FA Verified**
  - [ ] "Sign In" button HIDDEN
  - [ ] "Sign Up" button HIDDEN
  - [ ] User avatar visible with email initial
  - [ ] Dropdown shows "My Dashboard" link
  - [ ] Dropdown shows "Logout" button
  - [ ] Clicking "My Dashboard" → correct dashboard based on role

- [ ] **Logout Flow**
  - [ ] Clicking "Logout" clears session
  - [ ] Redirected to `/auth`
  - [ ] Cannot use browser back button to access protected routes
  - [ ] Toast notification confirms logout

---

## Post-Deployment Verification

### Caching and Latest Changes
- [ ] **After Deployment**
  - [ ] All users see latest UI after hard refresh
  - [ ] "Sign in with Google" button visible (if added)
  - [ ] No users loading old JS bundles
  - [ ] Service worker updates automatically

- [ ] **Cache Busting**
  - [ ] JS files have hashed filenames (e.g., `index-a1b2c3d4.js`)
  - [ ] CSS files have hashed filenames
  - [ ] HTML file NOT cached aggressively
  - [ ] Static assets cached with `max-age=31536000`

- [ ] **Browser Testing**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile Safari (iOS)
  - [ ] Mobile Chrome (Android)

### Security Verification
- [ ] **API Keys and Secrets**
  - [ ] No API keys in client-side code
  - [ ] No secrets in localStorage/sessionStorage
  - [ ] Supabase keys used correctly (anon key only)

- [ ] **Session Security**
  - [ ] Session tokens stored in httpOnly cookies (if possible)
  - [ ] No session data in URL parameters
  - [ ] XSS prevention (CSP headers active)
  - [ ] CSRF tokens on state-changing operations

- [ ] **Rate Limiting**
  - [ ] OTP requests rate-limited (max 5/hour per user)
  - [ ] Login attempts rate-limited (max 10/hour per IP)
  - [ ] Password reset rate-limited

### Error Handling
- [ ] **Network Errors**
  - [ ] Offline state detected and displayed
  - [ ] Failed API calls show user-friendly errors
  - [ ] Retry mechanism for transient failures

- [ ] **User Errors**
  - [ ] Invalid credentials: Clear error message
  - [ ] Expired OTP: Clear explanation + resend option
  - [ ] Account locked: Contact support message
  - [ ] Already logged in: Redirect to dashboard

---

## Edge Cases

### Concurrent Sessions
- [ ] Logging in from Device A
- [ ] Logging in from Device B
- [ ] Device A session remains valid
- [ ] Logout from Device A doesn't affect Device B

### Expired Sessions
- [ ] Token expires after inactivity
- [ ] User redirected to `/auth` with `redirectTo` param
- [ ] After re-login + 2FA, return to intended page

### Interrupted Flows
- [ ] User closes tab during 2FA
- [ ] Re-opening requires starting from login
- [ ] User closes tab during Google OAuth
- [ ] Re-opening shows OAuth error handled

### Role Changes
- [ ] Admin demoted to user
- [ ] User promoted to admin
- [ ] Role change takes effect on next login
- [ ] No cached role bypasses checks

---

## Performance Benchmarks

### Load Times
- [ ] `/auth` page loads < 2 seconds
- [ ] `/dashboard` loads < 3 seconds (after auth)
- [ ] 2FA screen appears < 1 second after login

### API Response Times
- [ ] Login: < 500ms (p95)
- [ ] OTP send: < 1s (p95)
- [ ] OTP verify: < 500ms (p95)
- [ ] Role check: < 200ms (p95)

---

## Accessibility

### Keyboard Navigation
- [ ] All forms navigable with Tab key
- [ ] Enter submits forms
- [ ] Escape closes dropdowns
- [ ] Focus visible on interactive elements

### Screen Readers
- [ ] Form labels properly associated
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] Success messages announced

### Mobile Experience
- [ ] Touch targets ≥ 44x44 pixels
- [ ] Forms zoom-friendly (no fixed viewport)
- [ ] OTP input triggers numeric keyboard
- [ ] Dropdown menus mobile-optimized

---

## Rollback Plan

### If Critical Issues Found Post-Deployment
1. **Immediate Actions**
   - [ ] Notify team in Slack/Discord
   - [ ] Document exact issue and reproduction steps
   - [ ] Check error logs in Supabase/Sentry

2. **Rollback Procedure**
   - [ ] Revert to previous Git commit
   - [ ] Redeploy via Vercel/hosting platform
   - [ ] Purge CDN cache (Cloudflare)
   - [ ] Verify rollback successful (check /auth page)

3. **Post-Rollback**
   - [ ] Analyze root cause
   - [ ] Fix in development environment
   - [ ] Re-test full checklist
   - [ ] Schedule re-deployment

---

## Sign-Off

### Before Production Release
- [ ] **QA Lead**: All tests passed
- [ ] **Security Lead**: Security review complete
- [ ] **DevOps**: Caching headers verified
- [ ] **Product Owner**: Flow matches requirements
- [ ] **Deployment Date**: _____________
- [ ] **Deployed By**: _____________

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-13 | Initial checklist |
| 1.1 | 2025-01-13 | Added 2FA flow tests |
| 1.2 | 2025-01-13 | Added role-based access tests |

---

## Support Contacts

- **Auth Issues**: auth-support@truespend.com
- **Security Issues**: security@truespend.com
- **Deployment Issues**: devops@truespend.com
- **Emergency Hotline**: 1-800-TRUESPEND
