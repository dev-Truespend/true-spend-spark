# Phase 6: External Communication - Implementation Plan
## TrueSpend v4.2 - Weeks 20-22 (42 Story Points)

**Plan Date:** 2025-01-17  
**Phase Duration:** 3 weeks  
**Risk Level:** Medium  
**Dependencies:** Phase 5 complete ✅  
**Team Size:** 2 developers

---

## Executive Summary

Phase 6 introduces external communication capabilities to TrueSpend, enabling SMS notifications, enhanced email templates, and robust webhook infrastructure. This phase focuses on user engagement through timely notifications while maintaining backward compatibility with Phases 1-5.

### Objectives
1. **SMS Notifications:** Implement Twilio integration for budget alerts and transaction notifications
2. **Email Templates:** Create React-based email templates for all notification types
3. **Webhook Infrastructure:** Build secure webhook handling with retry logic
4. **Notification Preferences:** Expand user preferences for granular control
5. **Delivery Tracking:** Comprehensive logging and monitoring of all notifications

### Success Metrics
- SMS delivery rate: >98%
- Email delivery rate: >95%
- Webhook processing time: <200ms p95
- Notification preference adoption: >60%
- Zero security incidents related to webhooks
- No impact on existing Phase 1-5 performance

---

## Code Review Summary

### Phase 1-5 Integration Points

**✅ Existing Code to Leverage:**
- `src/pages/Settings.tsx` - Notification preferences tab (localStorage)
- `supabase/functions/send-push-notification` - Push notification service
- `email_delivery_logs` table - Email tracking foundation
- `notification_queue` table - Notification queueing
- `notification_delivery_status` table - Delivery tracking
- `budget_alerts` table - Budget alert triggers
- `anomaly_detections` table - Anomaly alert triggers

**✅ No Conflicts Identified:**
- Phase 6 adds new edge functions (no modifications to existing)
- Database changes are additive (new columns/tables only)
- UI changes isolated to Settings page and new components
- No changes to authentication, geofencing, or transaction flows

**✅ Compatibility Verified:**
- All Phase 6 features are feature-flagged for gradual rollout
- Existing notification system continues to work
- New SMS/email services run parallel to existing push notifications
- Webhook infrastructure is independent

---

## Blueprint v4.2 Alignment

### Phase 6 Requirements (from blueprint-v4.2.md)

**Week 20: Email Infrastructure (13 SP)**
1. Enhanced email templates (React Email) - 8 SP
2. Email delivery tracking (webhook integration) - 5 SP

**Week 21: SMS Integration (13 SP)**
1. Twilio SMS integration - 8 SP
2. SMS preference management - 5 SP

**Week 22: Webhook Infrastructure (16 SP)**
1. Webhook security (signature verification, replay prevention) - 8 SP
2. Retry scheduler (exponential backoff, DLQ) - 8 SP

**Total Story Points:** 42 SP

### Dependencies
- ✅ Phase 5 complete (BFF layer, notification queue)
- ✅ Resend API configured (email foundation exists)
- ⚠️ Twilio account required (new external dependency)
- ⚠️ React Email library required (new dependency)

---

## Implementation Timeline

### Week 20: Email Infrastructure (Days 1-5)

#### Day 1-2: React Email Templates (5 SP)
**Goal:** Create reusable email components with TrueSpend branding

**Files to Create:**
```
supabase/functions/_shared/email-templates/
  ├── base-layout.tsx (brand wrapper)
  ├── budget-alert.tsx
  ├── transaction-notification.tsx
  ├── weekly-summary.tsx
  ├── anomaly-detected.tsx
  └── email-verification.tsx (enhance existing)
```

**Implementation:**
1. Install `@react-email/components` dependency
2. Create base layout with TrueSpend branding
   - Logo header
   - Primary brand colors (from design system)
   - Footer with unsubscribe link
   - Responsive design
3. Implement budget alert template
   - Progress bar showing spending %
   - Threshold exceeded details
   - Call-to-action button ("View Budget")
4. Implement transaction notification template
   - Transaction amount and merchant
   - Category and geofence (if applicable)
   - Anomaly warning (if detected)
5. Implement weekly summary template
   - Spending by category chart
   - Top merchants
   - Budget status
   - Insights and recommendations

**Testing:**
- Render tests for all templates
- Email client compatibility (Gmail, Outlook, Apple Mail)
- Mobile responsiveness
- Dark mode support

**Success Criteria:**
- All templates render correctly
- <50KB email size
- Passes Litmus email testing

#### Day 3-4: Email Delivery Tracking (5 SP)
**Goal:** Track email delivery, opens, and bounces via Resend webhooks

**Edge Function to Create:**
```
supabase/functions/resend-email-webhook/index.ts
```

**Database Changes:**
```sql
-- Enhance email_delivery_logs table
ALTER TABLE email_delivery_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_delivery_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_delivery_logs ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_delivery_logs ADD COLUMN IF NOT EXISTS bounce_type TEXT; -- hard, soft
ALTER TABLE email_delivery_logs ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- Create email_preferences table
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  budget_alerts BOOLEAN DEFAULT true,
  transaction_notifications BOOLEAN DEFAULT false,
  weekly_summary BOOLEAN DEFAULT true,
  anomaly_alerts BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email preferences"
  ON email_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Implementation:**
1. Create webhook endpoint in Resend dashboard
   - URL: `https://your-project.supabase.co/functions/v1/resend-email-webhook`
   - Events: delivery, open, click, bounce, complaint
2. Implement webhook handler
   - Verify Resend signature
   - Parse event payload
   - Update email_delivery_logs
   - Handle bounces (disable future emails)
   - Handle unsubscribes
3. Create unsubscribe management
   - Unique unsubscribe token per email
   - One-click unsubscribe page
   - Preference center

**Testing:**
- Simulate webhook events from Resend
- Verify database updates
- Test signature verification
- Test bounce handling
- Test unsubscribe flow

**Success Criteria:**
- Webhook processes events <100ms
- 100% signature verification
- Bounce handling automatic
- Unsubscribe rate tracked

#### Day 5: Email Template Integration (3 SP)
**Goal:** Integrate templates with existing notification system

**Edge Functions to Update:**
```
supabase/functions/send-verification-email/index.ts
supabase/functions/send-security-alert/index.ts
```

**New Edge Function:**
```
supabase/functions/send-email-notification/index.ts
```

**Implementation:**
1. Create unified email sending function
   - Accept template name + data
   - Render React Email template
   - Send via Resend API
   - Log to email_delivery_logs
   - Check email_preferences before sending
2. Update existing functions to use new templates
3. Create email scheduler for weekly summaries
   - Check user preferences
   - Aggregate spending data
   - Render summary template
   - Queue for sending

**Testing:**
- Send test emails for all templates
- Verify preference checking
- Test scheduling
- Verify tracking

**Success Criteria:**
- All email types using new templates
- Preferences respected 100%
- Weekly summaries scheduled correctly

### Week 21: SMS Integration (Days 6-10)

#### Day 6-7: Twilio SMS Integration (5 SP)
**Goal:** Implement SMS sending with Twilio

**Supabase Secrets Required:**
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

**Database Changes:**
```sql
-- Create sms_delivery_logs table
CREATE TABLE sms_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL, -- encrypted
  phone_hash TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL, -- budget_alert, transaction, anomaly, verification
  twilio_message_id TEXT,
  status TEXT DEFAULT 'queued', -- queued, sent, delivered, failed, undelivered
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_code TEXT,
  error_message TEXT,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SMS logs"
  ON sms_delivery_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage SMS logs"
  ON sms_delivery_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add phone number to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Create SMS preferences
CREATE TABLE sms_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  budget_alerts BOOLEAN DEFAULT true,
  transaction_threshold NUMERIC, -- only notify if transaction > threshold
  anomaly_alerts BOOLEAN DEFAULT true,
  quiet_hours_start TIME, -- e.g., 22:00
  quiet_hours_end TIME, -- e.g., 08:00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE sms_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own SMS preferences"
  ON sms_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Edge Function to Create:**
```
supabase/functions/send-sms-notification/index.ts
```

**Implementation:**
1. Install Twilio SDK in edge function
2. Implement SMS sending
   - Check user phone verified
   - Check SMS preferences
   - Check quiet hours
   - Format message (<160 chars)
   - Send via Twilio
   - Log to sms_delivery_logs
3. Implement rate limiting
   - Max 10 SMS per user per day
   - Max 100 SMS total per hour (cost control)
4. Implement cost tracking
   - Record per-message cost
   - Daily/monthly aggregation
   - Alert on unusual spend

**Testing:**
- Send test SMS to verified numbers
- Verify delivery tracking
- Test rate limiting
- Test quiet hours
- Test cost calculation

**Success Criteria:**
- SMS delivery rate >98%
- Rate limiting functional
- Cost tracking accurate
- Quiet hours respected

#### Day 8-9: Phone Verification (3 SP)
**Goal:** Verify user phone numbers before SMS

**Edge Functions to Create:**
```
supabase/functions/send-phone-verification/index.ts
supabase/functions/verify-phone-code/index.ts
```

**Database Changes:**
```sql
-- Create phone_verification_codes table
CREATE TABLE phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_hash TEXT NOT NULL,
  code TEXT NOT NULL, -- 6-digit code
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can verify own phone"
  ON phone_verification_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-cleanup expired codes
CREATE INDEX idx_phone_verification_expires ON phone_verification_codes(expires_at);
```

**Implementation:**
1. Phone verification flow
   - User enters phone number
   - Generate 6-digit code
   - Send via Twilio
   - User enters code
   - Verify and mark phone_verified_at
2. Code expiration (15 minutes)
3. Retry limit (3 attempts)
4. Rate limiting (1 code per 5 minutes)

**Testing:**
- Test verification flow end-to-end
- Test code expiration
- Test retry limit
- Test rate limiting

**Success Criteria:**
- Verification completes in <2 minutes
- Code delivery >98%
- No abuse via rate limiting

#### Day 10: SMS Preference UI (5 SP)
**Goal:** Create SMS preference management in Settings

**Component to Create:**
```
src/components/settings/SMSPreferences.tsx
```

**Implementation:**
1. Add "SMS Notifications" section to Settings page
   - Enable/disable SMS toggle
   - Phone number input + verification
   - Budget alert toggle
   - Transaction threshold slider ($0-$500)
   - Anomaly alert toggle
   - Quiet hours time picker
2. Integrate with `sms_preferences` table
3. Show SMS delivery status and history

**Testing:**
- Test all preference toggles
- Test phone verification UI
- Test quiet hours picker
- Test delivery history display

**Success Criteria:**
- All preferences save correctly
- Phone verification integrated
- UI responsive on mobile
- Delivery history accurate

### Week 22: Webhook Infrastructure (Days 11-15)

#### Day 11-12: Webhook Security (5 SP)
**Goal:** Implement secure webhook handling

**Edge Function to Create:**
```
supabase/functions/process-webhook/index.ts
```

**Database Changes:**
```sql
-- Create webhook_events table
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- twilio, resend, stripe, etc.
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON webhook_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage webhook events"
  ON webhook_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create webhook_signatures table (for replay prevention)
CREATE TABLE webhook_signatures (
  signature TEXT PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-cleanup old signatures (24 hours)
CREATE INDEX idx_webhook_signatures_received ON webhook_signatures(received_at);

-- Create webhook_config table
CREATE TABLE webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL UNIQUE,
  signing_secret TEXT NOT NULL, -- encrypted
  enabled BOOLEAN DEFAULT true,
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Implementation:**
1. Signature verification
   - Twilio: HMAC-SHA1 with X-Twilio-Signature
   - Resend: HMAC-SHA256 with svix signature
   - Generic: Support multiple algorithms
2. Replay attack prevention
   - Check signature not seen before (24hr window)
   - Store in webhook_signatures
   - Verify timestamp freshness (<5 min)
3. IP whitelisting (optional)
   - Twilio IP ranges
   - Resend IP ranges
   - Cloudflare IP ranges
4. Rate limiting
   - Max 1000 webhooks per minute
   - Per-source rate limits

**Testing:**
- Simulate webhook from Twilio
- Simulate webhook from Resend
- Test signature verification
- Test replay prevention
- Test rate limiting

**Success Criteria:**
- 100% signature verification
- Zero replay attacks
- Rate limiting functional
- Processing <200ms p95

#### Day 13-14: Retry Scheduler (5 SP)
**Goal:** Implement webhook retry with exponential backoff

**Edge Function to Create:**
```
supabase/functions/retry-failed-webhook/index.ts
```

**Database Changes:**
```sql
-- Create webhook_retry_queue table
CREATE TABLE webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id UUID NOT NULL REFERENCES webhook_events(id),
  retry_attempt INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_error TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE webhook_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage retry queue"
  ON webhook_retry_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for retry scheduler
CREATE INDEX idx_retry_queue_next_retry ON webhook_retry_queue(next_retry_at)
  WHERE status = 'pending';

-- Create dead_letter_queue table
CREATE TABLE webhook_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id UUID NOT NULL REFERENCES webhook_events(id),
  retry_attempts INTEGER NOT NULL,
  final_error TEXT NOT NULL,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view DLQ"
  ON webhook_dead_letter_queue
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

**Implementation:**
1. Retry scheduler
   - Cron job every minute
   - Query webhook_retry_queue for next_retry_at <= now()
   - Process webhook
   - Update retry_attempt and next_retry_at
2. Exponential backoff
   - Attempt 1: Immediate
   - Attempt 2: +1 minute
   - Attempt 3: +5 minutes
   - Attempt 4: +15 minutes
   - Attempt 5: +1 hour
   - After 5 attempts: Move to DLQ
3. Circuit breaker pattern
   - If source fails 10 times in 1 minute, disable for 5 minutes
   - Auto-re-enable after cooldown
4. Failure alerting
   - Send admin email on DLQ entries
   - Slack notification (future)

**Testing:**
- Simulate webhook failure
- Verify retry attempts
- Test exponential backoff
- Test DLQ movement
- Test circuit breaker
- Test failure alerts

**Success Criteria:**
- Retry success rate >90%
- DLQ for persistent failures
- Circuit breaker prevents cascades
- Alerts sent within 1 minute

#### Day 15: Webhook Dashboard (6 SP)
**Goal:** Create admin dashboard for webhook monitoring

**Component to Create:**
```
src/pages/dashboard/Webhooks.tsx
```

**Implementation:**
1. Webhook event list
   - Recent events (last 24 hours)
   - Filter by source, event_type, status
   - Payload viewer (JSON)
   - Signature verification status
2. Retry queue status
   - Pending retries
   - In-progress retries
   - Failed retries
3. Dead letter queue
   - Failed events requiring manual intervention
   - Retry button (manual retry)
   - Payload editor (for fixing)
4. Metrics
   - Total events by source
   - Success/failure rate
   - Average processing time
   - Retry statistics
5. Configuration
   - Enable/disable per source
   - Adjust retry settings
   - Update signing secrets

**Testing:**
- View webhook events
- Test filtering and search
- Test payload viewer
- Test retry button
- Test configuration updates

**Success Criteria:**
- Dashboard loads <1s
- Real-time updates (via Supabase realtime)
- All metrics accurate
- Manual retry functional

---

## Database Schema Summary

### New Tables (8)
1. `email_preferences` - Email notification preferences
2. `sms_preferences` - SMS notification preferences
3. `sms_delivery_logs` - SMS delivery tracking
4. `phone_verification_codes` - Phone verification
5. `webhook_events` - Webhook event log
6. `webhook_signatures` - Replay prevention
7. `webhook_config` - Webhook configuration
8. `webhook_retry_queue` - Retry scheduler
9. `webhook_dead_letter_queue` - Failed webhooks

### Table Enhancements (2)
1. `email_delivery_logs` - Add opened_at, clicked_at, bounced_at, unsubscribed_at
2. `profiles` - Add phone, phone_verified_at (if not exists)

### Total Database Changes
- **New Tables:** 8
- **New Columns:** 6
- **New Indexes:** 4
- **New Policies:** 12

---

## Edge Functions Summary

### New Edge Functions (10)
1. `send-email-notification` - Unified email sender
2. `resend-email-webhook` - Email delivery tracking
3. `send-sms-notification` - SMS sender
4. `send-phone-verification` - Phone verification SMS
5. `verify-phone-code` - Verify phone code
6. `twilio-webhook` - Twilio delivery status
7. `process-webhook` - Generic webhook processor
8. `retry-failed-webhook` - Webhook retry handler
9. `cleanup-old-webhooks` - Cleanup cron job
10. `send-weekly-summary` - Weekly summary scheduler

### Enhanced Edge Functions (2)
1. `send-verification-email` - Use React Email template
2. `send-security-alert` - Use React Email template

### Total Edge Functions: 12 new + 2 enhanced = 14

---

## Security Considerations

### No Impact on Existing Auth
- ✅ Phase 4 MFA remains unchanged
- ✅ Email verification flow preserved
- ✅ Password reset flow preserved
- ✅ Google OAuth unaffected
- ✅ Session management unchanged

### New Security Measures
1. **Webhook Signatures**
   - All webhooks verified via HMAC
   - Replay attack prevention (24hr window)
   - IP whitelisting (optional)
   - Rate limiting per source

2. **SMS Security**
   - Phone verification required
   - Rate limiting (10/day per user)
   - Quiet hours respected
   - Cost monitoring

3. **Email Security**
   - Unsubscribe tokens unique per send
   - Bounce handling (disable hard bounces)
   - Preference checking before send
   - DKIM/SPF via Resend

4. **PII Protection**
   - Phone numbers encrypted (same as Phase 4)
   - Email addresses encrypted
   - SMS content not logged (only metadata)
   - Webhook payloads sanitized

### Audit Trails
- All SMS sends logged in `sms_delivery_logs`
- All emails logged in `email_delivery_logs`
- All webhooks logged in `webhook_events`
- All retries logged in `webhook_retry_queue`
- All failures logged in `webhook_dead_letter_queue`

---

## Testing Strategy

### Unit Tests (20 tests)
1. React Email template rendering (5 tests)
2. Webhook signature verification (5 tests)
3. Retry scheduler logic (5 tests)
4. SMS preference checking (5 tests)

### Integration Tests (15 tests)
1. Email delivery flow end-to-end (3 tests)
2. SMS delivery flow end-to-end (3 tests)
3. Phone verification flow (3 tests)
4. Webhook processing flow (3 tests)
5. Retry flow with backoff (3 tests)

### E2E Tests (10 tests)
1. User enables SMS notifications
2. User receives budget alert via SMS
3. User verifies phone number
4. User updates notification preferences
5. User receives weekly summary email
6. Webhook is received and processed
7. Failed webhook is retried
8. User unsubscribes from emails
9. Admin views webhook dashboard
10. Admin manually retries DLQ item

### Load Tests (3 tests)
1. 1000 SMS sends in 1 minute
2. 10,000 emails queued and sent
3. 1000 webhooks received simultaneously

### Chaos Tests (3 tests)
1. Twilio API down (SMS fallback)
2. Resend API down (email queue)
3. Database connection lost (retry logic)

---

## Rollout Plan

### Week 20: Email Templates (Feature-Flagged)
**Days 1-5**
- Deploy email templates to staging
- Test all templates
- Enable for internal team (10 users)
- Monitor delivery rates
- Production deploy (feature flag off)

**Success Gate:**
- ✅ All templates render correctly
- ✅ Delivery rate >95% on staging
- ✅ Zero errors in email_delivery_logs

### Week 21: SMS to Beta Users (10%)
**Days 6-10**
- Deploy SMS infrastructure to staging
- Test phone verification
- Enable for beta users (10% of active users)
- Monitor delivery and costs
- Gradual rollout to 25%, 50%, 100%

**Success Gate:**
- ✅ SMS delivery rate >98% on staging
- ✅ Phone verification success >95%
- ✅ Cost per SMS <$0.01
- ✅ Zero rate limit violations

### Week 22: Full Rollout with Monitoring
**Days 11-15**
- Deploy webhook infrastructure
- Enable all communication channels
- Monitor webhook processing
- Monitor retry rates
- Monitor DLQ entries

**Success Gate:**
- ✅ Webhook success rate >95%
- ✅ Retry success rate >90%
- ✅ DLQ <1% of total webhooks
- ✅ No impact on Phase 1-5 performance

---

## Monitoring & Alerts

### Key Metrics to Track
1. **Email Metrics**
   - Delivery rate (target: >95%)
   - Open rate (target: >30%)
   - Bounce rate (target: <5%)
   - Unsubscribe rate (target: <1%)

2. **SMS Metrics**
   - Delivery rate (target: >98%)
   - Cost per SMS (target: <$0.01)
   - Daily send volume
   - Verification success rate (target: >95%)

3. **Webhook Metrics**
   - Processing time (target: <200ms p95)
   - Success rate (target: >95%)
   - Retry rate (target: <10%)
   - DLQ entries (target: <1%)

4. **Performance Metrics**
   - No impact on API latency (maintain 65ms p95)
   - No impact on database queries (maintain 8ms p95)
   - No impact on cache hit rate (maintain 93%)

### Alerts to Configure
1. **Critical Alerts** (PagerDuty/Slack)
   - Email delivery rate <90%
   - SMS delivery rate <95%
   - Webhook processing time >500ms
   - DLQ entries >10 per hour
   - Daily SMS cost >$100

2. **Warning Alerts** (Email)
   - Email bounce rate >5%
   - SMS cost >$50/day
   - Retry rate >15%
   - Unsubscribe rate >2%

3. **Info Alerts** (Dashboard)
   - New webhook source detected
   - Phone verification success rate <90%
   - Weekly summary send complete

---

## Cost Estimates

### New External Service Costs

**Twilio (SMS)**
- Cost per SMS: $0.0079 (US)
- Estimated volume: 1000 SMS/day
- Monthly cost: ~$237

**Twilio (Phone Verification)**
- Cost per verification: $0.05
- Estimated volume: 100 verifications/day
- Monthly cost: ~$150

**Resend (Email)**
- Cost: $0 for first 3,000 emails/month
- Estimated volume: 5,000 emails/month
- Monthly cost: $0-$20

**React Email**
- Cost: Free (open source)

**Total New Monthly Cost: ~$400-$450**

### Cost Optimization
- SMS only for high-priority alerts (user configurable)
- Email for lower-priority notifications
- Push notifications still free (Phase 5)
- Weekly summaries batched

---

## Dependencies & Prerequisites

### NPM Packages to Add
```json
{
  "@react-email/components": "^0.0.14",
  "twilio": "^4.20.0",
  "react-email": "^2.0.0"
}
```

### Supabase Secrets to Add
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
RESEND_WEBHOOK_SECRET (optional, for signature verification)
```

### External Accounts Required
1. **Twilio Account** (new)
   - Sign up at twilio.com
   - Purchase phone number (~$1/month)
   - Configure webhook URLs
   - Add to Supabase secrets

2. **Resend Account** (existing, enhance)
   - Configure webhook URL
   - Add webhook secret to Supabase

### Manual Setup Steps
1. **Twilio Configuration**
   - Create Twilio account
   - Purchase US phone number
   - Configure webhook for delivery status
   - Copy credentials to Supabase secrets

2. **Resend Webhook**
   - Add webhook URL in Resend dashboard
   - Select events: delivery, open, click, bounce, complaint
   - Copy signing secret to Supabase secrets

3. **Email Domain Verification**
   - Verify sending domain in Resend
   - Configure DKIM/SPF records

---

## Risk Assessment & Mitigation

### Identified Risks

**1. SMS Cost Overrun (Medium Risk)**
- **Risk:** User abuse or bugs could send excessive SMS
- **Mitigation:**
  - Hard limit: 10 SMS per user per day
  - Global limit: 100 SMS per hour
  - Cost monitoring with alerts
  - Feature flag for emergency shutoff

**2. Email Deliverability (Low Risk)**
- **Risk:** Emails marked as spam
- **Mitigation:**
  - Use reputable provider (Resend)
  - DKIM/SPF configured
  - Clear unsubscribe links
  - Monitor bounce rates
  - Gradual rollout

**3. Webhook DDoS (Medium Risk)**
- **Risk:** Attacker floods webhook endpoint
- **Mitigation:**
  - Signature verification required
  - Rate limiting per source
  - Cloudflare protection
  - IP whitelisting (optional)

**4. Performance Impact (Low Risk)**
- **Risk:** Notification processing slows down app
- **Mitigation:**
  - Async processing via queue
  - Separate edge function instances
  - No blocking operations
  - Feature flags for rollback

**5. Data Privacy (Low Risk)**
- **Risk:** Phone numbers or email addresses leaked
- **Mitigation:**
  - PII encryption (Phase 4 infrastructure)
  - No plaintext in logs
  - GDPR compliance
  - User-controlled deletion

---

## Compatibility Matrix

### Phase 1: Foundation & Client Layer
- ✅ No conflicts
- ✅ Notification queue leveraged
- ✅ IndexedDB unaffected
- ✅ Offline sync preserved

### Phase 2: Security & Ingress
- ✅ No conflicts
- ✅ Rate limiting extended to webhooks
- ✅ CSP allows new email domains
- ✅ Security logs include SMS events

### Phase 3: Geofencing
- ✅ No conflicts
- ✅ Geofence alerts via SMS/email
- ✅ Location-based notifications
- ✅ Budget alerts enhanced

### Phase 4: Auth & Supply Chain
- ✅ No conflicts
- ✅ Phone verification uses MFA infrastructure
- ✅ PII encryption reused for phone numbers
- ✅ Email verification enhanced with templates

### Phase 5: Core Services (BFF, Logic, AI)
- ✅ No conflicts
- ✅ Budget alerts trigger SMS/email
- ✅ Anomaly detection sends notifications
- ✅ AI insights in weekly summary

---

## Success Criteria

### Week 20 (Email Infrastructure)
- ✅ All React Email templates created
- ✅ Email delivery tracking operational
- ✅ Webhook handler processing Resend events
- ✅ Unsubscribe management functional
- ✅ Weekly summary scheduler working
- ✅ Delivery rate >95% on staging

### Week 21 (SMS Integration)
- ✅ Twilio integration operational
- ✅ Phone verification flow complete
- ✅ SMS preferences UI functional
- ✅ Rate limiting enforced
- ✅ Cost tracking accurate
- ✅ Delivery rate >98% on staging

### Week 22 (Webhook Infrastructure)
- ✅ Webhook signature verification working
- ✅ Replay attack prevention functional
- ✅ Retry scheduler operational
- ✅ DLQ for failed webhooks
- ✅ Webhook dashboard complete
- ✅ Circuit breaker tested

### Overall Phase 6
- ✅ All 42 story points delivered
- ✅ All tests passing (unit, integration, E2E)
- ✅ No security vulnerabilities
- ✅ No performance regression
- ✅ Documentation complete
- ✅ Production deployment successful

---

## Documentation Deliverables

### User Documentation
1. **SMS Notification Guide**
   - How to enable SMS
   - Phone verification steps
   - Managing preferences
   - Quiet hours configuration

2. **Email Preference Guide**
   - Managing email subscriptions
   - Unsubscribe process
   - Weekly summary content
   - Spam/bounce troubleshooting

3. **Notification Best Practices**
   - Choosing SMS vs Email vs Push
   - Cost considerations
   - Privacy settings

### Technical Documentation
1. **Webhook Integration Guide**
   - Signature verification examples
   - Retry logic explanation
   - DLQ management
   - Circuit breaker configuration

2. **Email Template Development**
   - React Email setup
   - Creating new templates
   - Testing templates
   - Email client compatibility

3. **SMS Integration Guide**
   - Twilio setup
   - Cost optimization
   - Rate limiting configuration
   - Troubleshooting delivery issues

### API Documentation
1. **Edge Function Reference**
   - `send-email-notification` API
   - `send-sms-notification` API
   - `process-webhook` API
   - Error codes and responses

---

## Appendix: Implementation Checklist

### Pre-Implementation ☐
- ☐ Review Phase 1-5 code (complete)
- ☐ Create Twilio account
- ☐ Configure Resend webhooks
- ☐ Add Twilio secrets to Supabase
- ☐ Install NPM dependencies

### Week 20: Email ☐
- ☐ Create React Email base layout
- ☐ Create budget alert template
- ☐ Create transaction notification template
- ☐ Create weekly summary template
- ☐ Create anomaly alert template
- ☐ Implement email webhook handler
- ☐ Create email_preferences table
- ☐ Implement unsubscribe management
- ☐ Create send-email-notification function
- ☐ Test all templates
- ☐ Deploy to staging
- ☐ Enable for internal team

### Week 21: SMS ☐
- ☐ Create sms_delivery_logs table
- ☐ Create sms_preferences table
- ☐ Create phone_verification_codes table
- ☐ Implement send-sms-notification function
- ☐ Implement send-phone-verification function
- ☐ Implement verify-phone-code function
- ☐ Implement twilio-webhook function
- ☐ Create SMS preferences UI
- ☐ Add phone verification to Settings
- ☐ Implement rate limiting
- ☐ Implement cost tracking
- ☐ Test SMS delivery
- ☐ Deploy to staging
- ☐ Enable for beta users (10%)

### Week 22: Webhooks ☐
- ☐ Create webhook_events table
- ☐ Create webhook_signatures table
- ☐ Create webhook_config table
- ☐ Create webhook_retry_queue table
- ☐ Create webhook_dead_letter_queue table
- ☐ Implement process-webhook function
- ☐ Implement retry-failed-webhook function
- ☐ Implement cleanup-old-webhooks function
- ☐ Create webhook dashboard
- ☐ Implement circuit breaker
- ☐ Implement failure alerting
- ☐ Test webhook processing
- ☐ Test retry logic
- ☐ Test DLQ
- ☐ Deploy to staging
- ☐ Full production rollout

### Post-Implementation ☐
- ☐ Monitor all metrics
- ☐ Verify alerts working
- ☐ Document lessons learned
- ☐ Update architecture diagrams
- ☐ Create Phase 6 completion report
- ☐ Prepare for Phase 7

---

## Next Steps After Phase 6

**Phase 7: Smart Insights (Weeks 23-25)**
- ML spending predictions
- Personalized recommendations
- Advanced anomaly patterns
- Budget optimization algorithms

**Integration Points:**
- Use SMS/email for insight delivery
- Weekly summary includes predictions
- Anomaly alerts leverage Phase 6 infrastructure

---

*End of Phase 6 Implementation Plan*
