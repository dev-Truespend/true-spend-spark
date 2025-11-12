# Monitoring & Alerts Setup Guide
## TrueSpend v4.2 - Security Monitoring Configuration

**Version**: 1.0  
**Last Updated**: 2025-11-12  
**Status**: Ready for Configuration

---

## 📊 Overview

This guide covers the configuration of monitoring alerts and notifications for the TrueSpend v4.2 security infrastructure. After completing Phase 2 implementation, you should set up proactive monitoring to detect and respond to security events in real-time.

### Alert Categories
1. **CSP Violations** - Content Security Policy breaches
2. **Rate Limit Hits** - API rate limiting events
3. **WAF Blocks** - Web Application Firewall blocks
4. **DDoS Attacks** - Distributed denial of service attempts
5. **Security Headers** - Missing or misconfigured headers

---

## 🔔 Cloudflare Alert Configuration

### Prerequisites
- Cloudflare account with your domain configured
- Admin access to Cloudflare dashboard
- Email address for receiving alerts
- (Optional) Webhook endpoint for integrations (Slack, PagerDuty, etc.)

---

## 1️⃣ WAF Alerts - Firewall Events

### Access Cloudflare Dashboard
1. Login to https://dash.cloudflare.com/
2. Select your domain
3. Navigate to **Security > WAF**

### Configure WAF Event Notifications

#### Option A: Email Alerts (Recommended for Start)

1. Go to **Notifications** (left sidebar)
2. Click **Add** > **New Notification**
3. Select **Firewall Events**
4. Configure settings:

```
Notification Name: TrueSpend WAF Blocks
Description: Alert when WAF blocks suspicious requests

Event Trigger:
- Event type: Firewall Events
- Threshold: 10 events in 1 minute
- Action taken: Block, Challenge, or Managed Challenge

Filters (Optional):
- Country: (leave empty for all)
- User Agent: (leave empty for all)
- Path: (leave empty for all)

Notification Delivery:
- Email: your-email@domain.com
- Frequency: As soon as possible
```

5. Click **Create Notification**

#### Option B: Webhook Alerts (For Advanced Integrations)

**For Slack Integration**:

1. Create Slack Webhook:
   - Go to https://api.slack.com/apps
   - Create New App > From scratch
   - Name: "TrueSpend Security Alerts"
   - Select workspace
   - Go to **Incoming Webhooks** > Activate
   - Click **Add New Webhook to Workspace**
   - Select channel (e.g., #security-alerts)
   - Copy Webhook URL

2. Configure in Cloudflare:
   - Notifications > Add > Firewall Events
   - Webhook URL: Paste Slack webhook
   - Test connection
   - Save

**Slack Message Format**:
```json
{
  "text": "🚨 *TrueSpend Security Alert*",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*WAF Block Detected*\n• Events: {{event_count}}\n• Time: {{timestamp}}\n• Action: {{action_taken}}"
      }
    }
  ]
}
```

---

## 2️⃣ Rate Limiting Alerts

### Monitor API Gateway Rate Limits

Since rate limiting is handled by your edge functions, you'll monitor via database queries and logs.

#### Database-Based Monitoring

Create a monitoring query to run daily:

```sql
-- Check rate limit hits in last 24 hours
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN request_count >= 100 THEN 1 END) as rate_limit_hits,
  ROUND(100.0 * COUNT(CASE WHEN request_count >= 100 THEN 1 END) / COUNT(*), 2) as hit_percentage
FROM rate_limits
WHERE window_start >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY rate_limit_hits DESC;
```

#### Set Up Supabase Database Webhook (Optional)

For real-time alerts when rate limits are exceeded:

1. Create edge function for alerts:

```typescript
// supabase/functions/rate-limit-alert/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

Deno.serve(async (req) => {
  const { record } = await req.json();
  
  // Check if rate limit exceeded
  if (record.request_count >= 95) { // Alert at 95% of limit
    // Send email or webhook notification
    await sendSlackAlert({
      text: `⚠️ Rate limit approaching for ${record.identifier} on ${record.endpoint}`,
      count: record.request_count,
      limit: 100
    });
  }
  
  return new Response('OK', { status: 200 });
});
```

2. Create database trigger:
```sql
-- Create trigger to call webhook on rate limit updates
CREATE OR REPLACE FUNCTION notify_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_count >= 95 THEN
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/rate-limit-alert',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rate_limit_alert_trigger
AFTER UPDATE ON rate_limits
FOR EACH ROW
EXECUTE FUNCTION notify_rate_limit();
```

---

## 3️⃣ CSP Violation Alerts

### Monitor Content Security Policy Violations

#### Dashboard Monitoring

1. Access `/admin/security` in your application
2. View CSP Violations widget
3. Review violations daily (first week), then weekly

#### Email Digest Setup

Create a scheduled task to send CSP violation summary:

```typescript
// supabase/functions/csp-daily-digest/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get violations from last 24 hours
  const { data: violations } = await supabase
    .from('csp_violations')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false });

  if (!violations || violations.length === 0) {
    return new Response('No violations', { status: 200 });
  }

  // Group by directive
  const groupedViolations = violations.reduce((acc, v) => {
    acc[v.violated_directive] = (acc[v.violated_directive] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Send email summary
  const emailBody = `
    CSP Violations Summary (Last 24 Hours)
    ======================================
    
    Total Violations: ${violations.length}
    
    Breakdown by Directive:
    ${Object.entries(groupedViolations)
      .map(([directive, count]) => `  • ${directive}: ${count}`)
      .join('\n')}
    
    Recent Violations:
    ${violations.slice(0, 5).map(v => 
      `  • ${v.violated_directive} - ${v.blocked_uri || 'inline'} at ${new Date(v.timestamp).toLocaleString()}`
    ).join('\n')}
    
    View full details: ${Deno.env.get('APP_URL')}/admin/security
  `;

  // Send via your email service (e.g., SendGrid, AWS SES)
  // await sendEmail(emailBody);

  return new Response(JSON.stringify({ sent: true, count: violations.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### Schedule with Cron

Add to `supabase/config.toml`:

```toml
[functions.csp-daily-digest]
verify_jwt = false

[functions.csp-daily-digest.cron]
schedule = "0 9 * * *"  # Daily at 9 AM UTC
```

---

## 4️⃣ DDoS Protection Alerts

### Cloudflare DDoS Notifications

1. Go to **Notifications** in Cloudflare dashboard
2. Click **Add** > **DDoS Attack Alerting**
3. Configure:

```
Notification Name: TrueSpend DDoS Alerts
Description: Alert when DDoS attack is detected or mitigated

Event Trigger:
- Attack type: All types (HTTP, Network layer, Advanced)
- Severity: Medium, High, Very High
- Status: Attack ongoing, Attack ended

Notification Delivery:
- Email: security-team@yourdomain.com
- Send SMS: (Optional) +1-XXX-XXX-XXXX
- Webhook: (Optional) Slack/PagerDuty URL
```

4. Click **Save**

### DDoS Response Playbook

When you receive a DDoS alert:

1. **Immediate Actions**:
   - Login to Cloudflare dashboard
   - Verify attack details (Security > Analytics)
   - Check if traffic is being mitigated
   - Enable "I'm Under Attack Mode" if needed (Security > Settings)

2. **Monitor Impact**:
   - Check application response time
   - Monitor error rates at `/admin/metrics`
   - Verify edge function performance

3. **Post-Attack Analysis**:
   - Review attack patterns (Security > Events)
   - Document attack details
   - Adjust WAF rules if needed
   - Update incident response plan

---

## 5️⃣ Security Header Monitoring

### Automated Header Checks

Create a health check that runs periodically:

```typescript
// supabase/functions/security-headers-check/index.ts
Deno.serve(async () => {
  const appUrl = Deno.env.get('APP_URL') || 'https://yourdomain.com';
  
  const response = await fetch(appUrl, { method: 'HEAD' });
  
  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'strict-transport-security',
  ];
  
  const missing = requiredHeaders.filter(
    header => !response.headers.has(header)
  );
  
  if (missing.length > 0) {
    // Alert: Missing security headers
    await sendAlert({
      severity: 'high',
      message: `Missing security headers: ${missing.join(', ')}`,
      url: appUrl
    });
  }
  
  return new Response(JSON.stringify({ 
    ok: missing.length === 0,
    missing 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

Schedule with cron (daily check):
```toml
[functions.security-headers-check.cron]
schedule = "0 6 * * *"  # Daily at 6 AM UTC
```

---

## 6️⃣ Uptime & Performance Monitoring

### External Monitoring Services (Recommended)

Choose one or more:

#### Option 1: UptimeRobot (Free Tier Available)
1. Sign up at https://uptimerobot.com/
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://yourdomain.com/functions/v1/health-check`
   - Interval: 5 minutes
   - Alert contacts: Your email
3. Set up:
   - Email alerts on downtime
   - Webhook to Slack (optional)

#### Option 2: Pingdom (Paid)
1. Sign up at https://www.pingdom.com/
2. Create uptime check:
   - URL: Your domain
   - Check interval: 1 minute
   - Locations: Multiple (US, EU, Asia)
3. Configure alerts:
   - Email on downtime
   - SMS for critical alerts (optional)

#### Option 3: StatusCake (Free Tier)
1. Sign up at https://www.statuscake.com/
2. Add test:
   - Type: Uptime
   - URL: Your health check endpoint
   - Check rate: 5 minutes
3. Contact groups:
   - Email alerts
   - Webhook integrations

---

## 7️⃣ Log Aggregation (Advanced)

### Cloudflare Logpush (Enterprise Feature)

For high-traffic applications, consider Cloudflare Logpush to send logs to:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Datadog
- Splunk

Configuration (Enterprise only):
1. Security > Analytics > Logpush
2. Select destination
3. Configure filters (WAF, Firewall events)
4. Set up retention policy

---

## 📊 Monitoring Dashboard Setup

### Custom Security Dashboard

Create a centralized monitoring view:

1. **Metrics to Track**:
   - WAF blocks per hour
   - Rate limit hits per endpoint
   - CSP violations per day
   - Average response time
   - Error rate (5xx responses)

2. **Visualization Options**:
   - Use existing `/admin/security` page
   - Integrate Grafana (advanced)
   - Use Cloudflare Analytics

3. **Daily Review Checklist**:
   ```
   □ Check CSP violations (target: < 10/day)
   □ Review WAF blocks (identify patterns)
   □ Monitor rate limit hits (< 1% of requests)
   □ Verify uptime (target: 99.9%+)
   □ Check edge function errors (target: < 0.1%)
   ```

---

## 🚨 Alert Priority Matrix

### Alert Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **Critical** | Service down or security breach | Immediate (< 5 min) | DDoS attack, WAF bypass, mass CSP violations |
| **High** | Degraded performance or elevated risk | < 15 minutes | High rate limit hits, repeated WAF blocks from same IP |
| **Medium** | Potential issue requiring attention | < 1 hour | Unusual CSP violation pattern, slow response times |
| **Low** | Informational, no immediate action | < 24 hours | Daily CSP digest, weekly security summary |

### On-Call Rotation (For Teams)

If you have a team, set up on-call rotation:

1. **Tools**:
   - PagerDuty: https://www.pagerduty.com/
   - Opsgenie: https://www.atlassian.com/software/opsgenie
   - VictorOps: https://victorops.com/

2. **Schedule**:
   - Primary on-call: 24/7 rotation
   - Secondary on-call: Backup
   - Escalation after 15 minutes

3. **Escalation Path**:
   ```
   Critical Alert
   ↓
   Primary On-Call (5 min)
   ↓ (no response)
   Secondary On-Call (5 min)
   ↓ (no response)
   Engineering Manager (5 min)
   ↓ (no response)
   CTO/VP Engineering
   ```

---

## 📧 Sample Alert Templates

### Slack Alert Format

```json
{
  "text": "🚨 TrueSpend Security Alert",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Security Alert: WAF Block"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Severity:*\nHigh"
        },
        {
          "type": "mrkdwn",
          "text": "*Time:*\n2025-11-12 22:30 UTC"
        },
        {
          "type": "mrkdwn",
          "text": "*Event:*\n50+ WAF blocks in 1 minute"
        },
        {
          "type": "mrkdwn",
          "text": "*Source:*\n192.168.1.100"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Dashboard"
          },
          "url": "https://dash.cloudflare.com/",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Security Logs"
          },
          "url": "https://yourdomain.com/admin/security"
        }
      ]
    }
  ]
}
```

### Email Alert Format

```html
Subject: [CRITICAL] TrueSpend Security Alert - WAF Blocks

<!DOCTYPE html>
<html>
<body>
  <h2>🚨 Security Alert Notification</h2>
  
  <table style="border-collapse: collapse; width: 100%;">
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">High</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Event Type</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">WAF Block</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Count</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">50+ events in 1 minute</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">2025-11-12 22:30:00 UTC</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Action Taken</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">Traffic blocked by WAF</td>
    </tr>
  </table>
  
  <p>
    <a href="https://dash.cloudflare.com/" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin-top: 20px;">
      View Cloudflare Dashboard
    </a>
    
    <a href="https://yourdomain.com/admin/security" style="background: #00cc66; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin-top: 20px; margin-left: 10px;">
      View Security Logs
    </a>
  </p>
  
  <p style="color: #666; font-size: 12px; margin-top: 20px;">
    This is an automated alert from TrueSpend Security Monitoring.
  </p>
</body>
</html>
```

---

## 🔧 Implementation Checklist

### Initial Setup (One-Time)
- [ ] Configure Cloudflare WAF email alerts
- [ ] Set up DDoS attack notifications
- [ ] Create Slack webhook for security channel
- [ ] Deploy CSP daily digest edge function
- [ ] Configure rate limit monitoring queries
- [ ] Set up external uptime monitoring (UptimeRobot/Pingdom)
- [ ] Create security headers health check
- [ ] Document incident response procedures

### Daily Tasks
- [ ] Review CSP violations dashboard
- [ ] Check rate limit metrics
- [ ] Monitor WAF block patterns
- [ ] Verify uptime status (99.9%+ target)

### Weekly Tasks
- [ ] Review security metrics trends
- [ ] Analyze WAF false positives
- [ ] Check edge function performance
- [ ] Update security documentation if needed

### Monthly Tasks
- [ ] Security incident review
- [ ] Update alert thresholds based on traffic patterns
- [ ] Test incident response procedures
- [ ] Review and update on-call rotation

---

## 📞 Incident Response Contacts

### Internal Contacts
```
Primary Security Contact: security@yourdomain.com
Engineering Manager: manager@yourdomain.com
DevOps Lead: devops@yourdomain.com
```

### External Contacts
```
Cloudflare Support: https://support.cloudflare.com/
Supabase Support: https://supabase.com/support
Emergency Hotline: (for enterprise plans)
```

---

## 📚 Additional Resources

### Documentation
- Cloudflare Notifications: https://developers.cloudflare.com/notifications/
- Cloudflare Analytics: https://developers.cloudflare.com/analytics/
- Supabase Edge Functions Cron: https://supabase.com/docs/guides/functions/cron

### Security Tools
- SecurityHeaders.com: https://securityheaders.com/ (Check your headers)
- SSL Labs: https://www.ssllabs.com/ssltest/ (Test TLS configuration)
- Observatory by Mozilla: https://observatory.mozilla.org/ (Security assessment)

---

## ✅ Verification Steps

After completing setup:

1. **Test WAF Alert**:
   - Trigger intentional WAF block (use curl test)
   - Verify alert received within 5 minutes

2. **Test CSP Alert**:
   - Insert inline script to trigger CSP violation
   - Check violation appears in database
   - Verify daily digest sends (if configured)

3. **Test Uptime Monitor**:
   - Temporarily disable edge function
   - Verify downtime alert received
   - Re-enable and verify recovery alert

4. **Test Slack Integration** (if configured):
   - Send test notification
   - Verify message appears in channel
   - Check formatting and links work

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-12  
**Next Review**: Start of Phase 3  
**Owner**: Security Team

---

**Questions or Issues?**  
Contact: security@yourdomain.com  
Slack Channel: #security-alerts  
