# Alerting Configuration Guide

## Overview
This guide explains how to configure, manage, and optimize alerting in TrueSpend's Phase 10 observability system.

---

## Alert Architecture

### Components
1. **Incident Detector** - Auto-detects incidents from metrics
2. **SLO Manager** - Monitors SLO compliance
3. **Alert Manager** - Routes and delivers alerts
4. **Alert Rules** - Define routing and channels
5. **Alert History** - Tracks delivery and acknowledgments

### Flow
```
Incident Detected → Alert Manager → Alert Rules → 
  → Delivery Channels (Email/Push/SMS) → Alert History
```

---

## Alert Rules Configuration

### Dashboard: `/admin/alerts`

### Creating Alert Rules

**Step 1: Navigate to Alert Rules**
```
Dashboard: /admin/alerts
Click: "New Rule" button
```

**Step 2: Configure Rule**
```
Fields:
- Name: Descriptive rule name
- Severity: low | medium | high | critical
- Channels: email, push, sms, dashboard
- Recipients: User IDs or "all admins"
- Escalation Timeout: Minutes before escalation
- Active: Enable/disable rule
```

**Step 3: Save and Test**
```
1. Save rule
2. Click "Test" to verify delivery
3. Check alert history
```

### Default Alert Rules

#### 1. Critical Incidents Rule
```json
{
  "name": "Critical Incidents",
  "severity": "critical",
  "channels": ["email", "push"],
  "escalation_timeout_minutes": 15,
  "trigger_conditions": {
    "incident_severity": "critical"
  }
}
```

#### 2. High Priority Incidents Rule
```json
{
  "name": "High Priority Incidents",
  "severity": "high",
  "channels": ["email", "push"],
  "escalation_timeout_minutes": 30,
  "trigger_conditions": {
    "incident_severity": "high"
  }
}
```

#### 3. SLO Breaches Rule
```json
{
  "name": "SLO Breaches",
  "severity": "high",
  "channels": ["email"],
  "escalation_timeout_minutes": 30,
  "trigger_conditions": {
    "event_type": "slo_breach"
  }
}
```

#### 4. Security Alerts Rule
```json
{
  "name": "Security Alerts",
  "severity": "critical",
  "channels": ["email", "push"],
  "escalation_timeout_minutes": 5,
  "trigger_conditions": {
    "event_type": "security_alert"
  }
}
```

---

## Notification Channels

### Email Notifications

**Configuration**:
- Powered by Resend API
- Templates in `/supabase/functions/_shared/email-templates/`
- Rate limit: 100/hour per recipient

**Email Format**:
```
Subject: [SEVERITY] Title
Body:
  - Severity badge
  - Description
  - Affected services
  - Link to dashboard
  - Quick actions
```

**Testing Email**:
```sql
-- Trigger test email
SELECT * FROM supabase.functions.invoke('send-email-notification', 
  jsonb_build_object(
    'to', 'admin@example.com',
    'subject', 'Test Alert',
    'html', '<h1>Test Alert</h1><p>This is a test.</p>'
  )
);
```

### Push Notifications

**Configuration**:
- Powered by Firebase Cloud Messaging (FCM)
- Mobile app required (Android/iOS)
- Instant delivery

**Push Format**:
```json
{
  "title": "Alert Title",
  "body": "Alert description",
  "data": {
    "type": "alert",
    "severity": "high",
    "incident_id": "uuid"
  }
}
```

**Testing Push**:
```sql
-- Trigger test push
SELECT * FROM supabase.functions.invoke('send-push-notification', 
  jsonb_build_object(
    'userId', '<user-id>',
    'title', 'Test Alert',
    'body', 'This is a test push notification',
    'data', jsonb_build_object('type', 'test')
  )
);
```

### SMS Notifications (Future)

**Status**: Not yet implemented
**Priority**: Low (email + push sufficient for MVP)

**Planned Implementation**:
- Use Twilio API
- Reserve for critical P1 incidents only
- Rate limit: 10/hour

---

## Alert Deduplication

### Purpose
Prevent alert spam when same incident triggers multiple times

### How It Works
```
Time Window: 5 minutes
Logic: If incident_id already alerted in last 5 min, skip
```

### Configuration
```typescript
// supabase/functions/alert-manager/index.ts
const DEDUPLICATION_WINDOW = 5 * 60 * 1000; // 5 minutes

// Check for recent alerts
const recentAlerts = await supabase
  .from('alert_history')
  .select('id')
  .eq('incident_id', incidentId)
  .gte('sent_at', new Date(Date.now() - DEDUPLICATION_WINDOW));
```

### Bypass Deduplication
For testing or urgent re-alerts:
```sql
-- Manually trigger alert (bypasses deduplication)
SELECT * FROM supabase.functions.invoke('alert-manager',
  jsonb_build_object(
    'incidentId', '<incident-id>',
    'severity', 'critical',
    'title', 'Test Alert',
    'description', 'Manual test',
    'bypass_deduplication', true
  )
);
```

---

## Escalation Policies

### Automatic Escalation

**Trigger**: Alert not acknowledged within timeout period

**Configuration per Severity**:
- Critical: 15 minutes
- High: 30 minutes
- Medium: 60 minutes
- Low: No escalation

**Escalation Flow**:
```
1. Initial alert → Primary on-call
2. If not acked → Secondary on-call (after timeout)
3. If not acked → Engineering lead (after 2x timeout)
4. If not acked → CTO (after 3x timeout)
```

**Implementation** (Planned):
```sql
-- Check for unacknowledged alerts
SELECT * FROM alert_history
WHERE status = 'sent'
AND acknowledged_at IS NULL
AND sent_at < NOW() - INTERVAL '15 minutes'
AND severity IN ('critical', 'high');

-- Escalate to next level
UPDATE alert_history
SET status = 'escalated'
WHERE id IN (...);

-- Create new alert for escalation recipient
INSERT INTO alert_history (...)
VALUES (...);
```

---

## Alert Thresholds

### Setting Effective Thresholds

**Principles**:
1. **Historical Data**: Base on 90 days of metrics
2. **Seasonal Patterns**: Account for daily/weekly patterns
3. **False Positive Rate**: Target < 10%
4. **User Impact**: Correlate with actual user issues

**Threshold Calculation Method**:
```sql
-- Calculate P95 of metric over 90 days
WITH metric_history AS (
  SELECT value
  FROM system_metrics
  WHERE metric_name = 'api_latency_p95'
  AND timestamp > NOW() - INTERVAL '90 days'
)
SELECT 
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_threshold
FROM metric_history;

-- Add 20% buffer for noise
-- Critical threshold = p95 + 20%
```

### Current Thresholds

| Metric | Warning | Critical | Duration |
|--------|---------|----------|----------|
| Error Rate | 1% | 5% | 5 min |
| API Latency P95 | 2000ms | 3000ms | 10 min |
| Auth Failures | 10/5min | 50/5min | 5 min |
| Cache Miss Rate | 80% | 90% | 15 min |
| System Health | <80 | <60 | 10 min |

### Adjusting Thresholds

**Step 1: Analyze Alert History**
```sql
-- Get false positive rate
SELECT 
  COUNT(*) FILTER (WHERE incident_id IS NULL) * 100.0 / COUNT(*) as false_positive_rate
FROM alert_history
WHERE sent_at > NOW() - INTERVAL '30 days';
```

**Step 2: Update Detection Rule**
```sql
-- Example: Increase error rate threshold from 5% to 7%
UPDATE incident_detection_rules
SET threshold = 7.0
WHERE metric = 'error_rate' AND severity = 'critical';
```

**Step 3: Monitor for 7 Days**
- Check if alerts are more accurate
- Verify no missed incidents
- Adjust again if needed

---

## On-Call Rotation

### Setting Up On-Call Schedule

**Step 1: Define Rotation**
```
Primary: Week 1, Week 3, Week 5...
Secondary: Week 2, Week 4, Week 6...
```

**Step 2: Configure Recipients**
```sql
-- Set on-call user for alert rules
UPDATE alert_rules
SET user_ids = ARRAY['<primary-user-id>', '<secondary-user-id>']
WHERE severity IN ('critical', 'high');
```

**Step 3: Test Alert Delivery**
```
1. Trigger test alert
2. Verify primary receives alert
3. Verify secondary receives escalation
4. Document any issues
```

### On-Call Best Practices

✅ **DO**:
- Have clear handoff procedures
- Document common issues
- Keep runbooks updated
- Test alerts weekly
- Rotate fairly

❌ **DON'T**:
- Change schedule last minute
- Skip handoff meetings
- Ignore alert testing
- Burn out team members
- Make schedule too complex

---

## Alert Fatigue Prevention

### Symptoms of Alert Fatigue
- Decreased response times
- Ignored alerts
- Low acknowledgment rate
- Team burnout
- Missed critical incidents

### Prevention Strategies

#### 1. Reduce Alert Noise
```sql
-- Identify noisy alerts
SELECT 
  alert_rule_id,
  COUNT(*) as alert_count,
  COUNT(*) FILTER (WHERE incident_id IS NULL) as false_positives
FROM alert_history
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY alert_rule_id
HAVING COUNT(*) > 50
ORDER BY alert_count DESC;

-- Disable or adjust noisy rules
UPDATE alert_rules
SET active = false
WHERE id IN (...);
```

#### 2. Intelligent Grouping
```
Instead of: 100 alerts for same incident
Better: 1 alert with incident count
```

#### 3. Actionable Alerts Only
```
Every alert should answer:
- What is wrong?
- Why does it matter?
- What should I do?
- Where to find more info?
```

#### 4. Regular Review
```
Weekly:
- Review false positive rate
- Adjust thresholds
- Disable unused rules
- Document improvements
```

---

## Alert Testing

### Pre-Production Testing

**Test Checklist**:
- [ ] Alert triggers correctly
- [ ] Email delivers to recipients
- [ ] Push notifications work
- [ ] Alert history records delivery
- [ ] Deduplication works
- [ ] Escalation triggers on timeout
- [ ] Acknowledgment updates status

**Test Script**:
```sql
-- 1. Create test incident
INSERT INTO incidents (
  title, description, severity, status
) VALUES (
  'TEST: Alert Delivery Test',
  'Testing alert system',
  'medium',
  'open'
) RETURNING id;

-- 2. Trigger alert manually
SELECT * FROM supabase.functions.invoke('alert-manager',
  jsonb_build_object(
    'incidentId', '<test-incident-id>',
    'severity', 'medium',
    'title', 'Test Alert',
    'description', 'This is a test alert'
  )
);

-- 3. Verify in alert history
SELECT * FROM alert_history
WHERE incident_id = '<test-incident-id>'
ORDER BY sent_at DESC;

-- 4. Clean up
DELETE FROM incidents WHERE title LIKE 'TEST:%';
DELETE FROM alert_history WHERE incident_id = '<test-incident-id>';
```

### Production Testing

**Schedule**: Weekly, off-peak hours

**Process**:
1. Announce test window in Slack
2. Run test script
3. Verify all channels
4. Document any issues
5. Update runbooks

---

## Troubleshooting

### Issue: Alerts Not Delivering

**Checklist**:
1. Check alert rule is active
   ```sql
   SELECT * FROM alert_rules WHERE active = true;
   ```

2. Verify edge function is deployed
   ```bash
   # Check Supabase dashboard → Edge Functions → alert-manager
   ```

3. Check alert history for errors
   ```sql
   SELECT * FROM alert_history
   WHERE status = 'failed'
   ORDER BY sent_at DESC
   LIMIT 10;
   ```

4. Test email/push services directly
5. Review edge function logs

### Issue: Too Many False Positives

**Solution**:
1. Analyze alert patterns
2. Increase thresholds
3. Add duration requirements
4. Implement smarter detection logic

### Issue: Missed Critical Alerts

**Solution**:
1. Lower thresholds
2. Reduce deduplication window
3. Add redundant alert paths
4. Implement multi-channel alerts

---

## Metrics

### Track Alert System Health

```sql
-- Alert delivery success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) as success_rate
FROM alert_history
WHERE sent_at > NOW() - INTERVAL '7 days';

-- Average time to acknowledgment
SELECT 
  AVG(EXTRACT(EPOCH FROM (acknowledged_at - sent_at))) / 60 as avg_minutes
FROM alert_history
WHERE acknowledged_at IS NOT NULL
AND sent_at > NOW() - INTERVAL '7 days';

-- Alerts by severity
SELECT 
  ar.severity,
  COUNT(*) as alert_count
FROM alert_history ah
JOIN alert_rules ar ON ah.alert_rule_id = ar.id
WHERE ah.sent_at > NOW() - INTERVAL '7 days'
GROUP BY ar.severity
ORDER BY alert_count DESC;
```

---

## Best Practices Summary

### ✅ DO
- Set realistic thresholds based on data
- Test alert delivery weekly
- Document all alert rules
- Review false positives monthly
- Keep runbooks updated
- Use deduplication
- Implement escalation
- Track alert metrics

### ❌ DON'T
- Alert on everything
- Ignore false positives
- Use same threshold for all
- Skip testing
- Forget to update docs
- Let alerts go unacknowledged
- Change thresholds without analysis
- Overwhelm on-call team

---

## Version History
- **v1.0** (2025-01-18): Initial alerting configuration guide
