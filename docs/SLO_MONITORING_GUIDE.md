# SLO Monitoring Guide

## Overview
Service Level Objectives (SLOs) define reliability targets for TrueSpend. This guide explains how to monitor and maintain SLO compliance.

---

## TrueSpend SLOs

### 1. API Availability SLO
**Target**: 99.5% uptime (43.2 minutes downtime/month)

**Measurement**:
```
Availability = (Successful Requests / Total Requests) × 100
```

**Dashboard**: `/admin/slo-tracking` → API Availability

**Alert Thresholds**:
- Warning: < 99.5% compliance
- Critical: < 99.0% compliance

**Error Budget**: 0.5% = ~216 minutes/month

---

### 2. API Latency P95 SLO
**Target**: 95% of requests complete in < 2000ms

**Measurement**:
```
P95 Latency = 95th percentile of response times
```

**Dashboard**: `/admin/slo-tracking` → API Latency P95

**Alert Thresholds**:
- Warning: P95 > 2000ms for 10 minutes
- Critical: P95 > 3000ms for 5 minutes

**Error Budget**: 5% of requests can exceed 2s

---

### 3. Error Rate SLO
**Target**: < 1% error rate

**Measurement**:
```
Error Rate = (Failed Requests / Total Requests) × 100
```

**Dashboard**: `/admin/slo-tracking` → Error Rate

**Alert Thresholds**:
- Warning: > 1% for 5 minutes
- Critical: > 5% for 5 minutes

**Error Budget**: 1% of requests can fail

---

### 4. Auth Success Rate SLO
**Target**: 99.9% authentication success rate

**Measurement**:
```
Auth Success = (Successful Auth / Total Auth Attempts) × 100
```

**Dashboard**: `/admin/slo-tracking` → Auth Success Rate

**Alert Thresholds**:
- Warning: < 99.9% for 5 minutes
- Critical: < 99.0% for 5 minutes

**Error Budget**: 0.1% = ~43 minutes/month

---

## Monitoring Workflows

### Daily SLO Check (2 minutes)
1. Navigate to `/admin/slo-tracking`
2. Review compliance for all 4 SLOs
3. Check error budget status
4. Verify no active breaches

**Acceptable Range**: All SLOs ≥ 95% compliance

**Action Required If**:
- Any SLO < 95%: Investigate immediately
- Error budget < 20%: Plan corrective actions
- Multiple SLOs degrading: Escalate to engineering

### Weekly SLO Review (15 minutes)
1. **Trend Analysis**
   - Compare week-over-week compliance
   - Identify degradation patterns
   - Correlate with deployments

2. **Error Budget Review**
   - Calculate burn rate
   - Project remaining budget
   - Plan deployment freezes if needed

3. **Historical Comparison**
   ```sql
   -- Get SLO compliance history
   SELECT 
     slo_name,
     date_trunc('day', measured_at) as day,
     AVG(compliance_percentage) as avg_compliance
   FROM slo_compliance_history
   WHERE measured_at > NOW() - INTERVAL '30 days'
   GROUP BY slo_name, day
   ORDER BY day DESC;
   ```

### Monthly SLO Report
1. **Calculate Monthly Compliance**
   ```sql
   SELECT 
     slo_name,
     AVG(compliance_percentage) as monthly_compliance,
     MIN(compliance_percentage) as worst_compliance,
     COUNT(*) FILTER (WHERE compliance_percentage < target_percentage) as breaches
   FROM slo_compliance_history
   WHERE measured_at > DATE_TRUNC('month', NOW())
   GROUP BY slo_name;
   ```

2. **Error Budget Consumption**
   - Total downtime: [X] minutes
   - Available budget: [Y] minutes
   - Consumption rate: [Z]%

3. **Incident Correlation**
   - Link SLO breaches to incidents
   - Identify recurring issues
   - Document improvement actions

---

## SLO Breach Response

### When SLO Drops Below Target

**Step 1: Assess Impact (< 5 minutes)**
```
1. Which SLO is breached?
2. How far below target? (severity)
3. How long has it been breached? (duration)
4. Is it still degrading?
```

**Step 2: Create Incident**
- Auto-created by `slo-manager` edge function
- Manual creation if needed:
  ```sql
  INSERT INTO incidents (
    title, description, severity, status, 
    affected_services, metadata
  ) VALUES (
    'SLO Breach: [SLO Name]',
    'SLO compliance dropped to [X]%',
    'high',
    'open',
    ARRAY['observability'],
    jsonb_build_object('slo_name', '[SLO Name]', 'compliance', [X])
  );
  ```

**Step 3: Investigate Root Cause**
Use relevant playbook:
- API Availability → Check edge functions, database
- API Latency → Performance dashboard
- Error Rate → System logs, traces
- Auth Success → Auth service health

**Step 4: Mitigation**
Apply quick fix to restore SLO compliance:
- Rollback deployment
- Scale infrastructure
- Enable fallbacks
- Clear cache

**Step 5: Document**
```
Dashboard: /admin/incidents/[ID]
Document:
- Root cause
- Mitigation steps
- Time to recovery
- Prevention measures
```

---

## Error Budget Management

### What is Error Budget?
Error budget = (1 - SLO) × time period

Example: 99.5% SLO = 0.5% error budget = 216 minutes/month downtime

### Tracking Error Budget
```
Dashboard: /admin/slo-tracking
Shows: Remaining budget, burn rate, projected depletion
```

### Error Budget Policies

#### Budget > 50% (Healthy)
✅ **Actions Allowed**:
- Normal deployment velocity
- Experimentation encouraged
- Feature releases as planned

#### Budget 20-50% (Caution)
⚠️ **Actions**:
- Reduce deployment frequency
- Focus on stability
- Defer risky changes
- Increase monitoring

#### Budget < 20% (Critical)
🚨 **Actions Required**:
- Deployment freeze (except fixes)
- All hands on reliability
- Root cause analysis
- Increase SLO target if needed

### Burn Rate Alerts
```
Fast Burn: > 10% budget consumed in 1 hour
Moderate Burn: > 20% budget consumed in 6 hours
Slow Burn: > 50% budget consumed in 3 days
```

**Alert Response**:
- Fast Burn: Immediate incident response
- Moderate Burn: Investigate and mitigate
- Slow Burn: Plan corrective actions

---

## SLO Adjustment Guidelines

### When to Adjust SLOs

**Increase Target (Make Stricter)** if:
- Consistently exceeding target by >5%
- Error budget never consumed
- Customer expectations higher
- Competitive pressure

**Decrease Target (Make Looser)** if:
- Consistently missing target despite efforts
- Error budget depleted every month
- Infrastructure constraints
- Cost prohibitive to maintain

### SLO Change Process

1. **Proposal**
   - Document current performance
   - Justify change request
   - Calculate cost impact
   - Get stakeholder approval

2. **Implementation**
   ```sql
   UPDATE service_level_objectives
   SET target_percentage = [NEW_VALUE]
   WHERE slo_name = '[SLO_NAME]';
   ```

3. **Communication**
   - Announce to team
   - Update documentation
   - Adjust alert thresholds
   - Monitor for 30 days

4. **Validation**
   - Verify achievability
   - Check alert noise
   - Assess team satisfaction
   - Review with stakeholders

---

## SLO Correlation Analysis

### Linking SLOs to Business Metrics

```sql
-- Correlate SLO compliance with user activity
SELECT 
  date_trunc('hour', s.measured_at) as hour,
  AVG(s.compliance_percentage) as avg_slo,
  COUNT(DISTINCT t.user_id) as active_users,
  COUNT(t.id) as transactions
FROM slo_compliance_history s
LEFT JOIN transactions t ON date_trunc('hour', t.timestamp) = date_trunc('hour', s.measured_at)
WHERE s.measured_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

### Customer Impact Analysis

**Questions to Answer**:
- How many users affected by SLO breach?
- What features were unavailable?
- Revenue impact of downtime?
- Customer support ticket increase?

```sql
-- Users affected during SLO breach
SELECT COUNT(DISTINCT user_id)
FROM system_logs
WHERE level = 'error'
AND timestamp BETWEEN '[breach_start]' AND '[breach_end]';
```

---

## Best Practices

### ✅ DO
- Monitor SLOs continuously
- Act on error budget alerts
- Document all SLO breaches
- Review SLOs quarterly
- Correlate with business metrics
- Automate SLO calculations
- Set realistic targets
- Communicate SLO status widely

### ❌ DON'T
- Ignore error budget warnings
- Set unachievable SLOs
- Skip post-breach analysis
- Hide SLO breaches
- Manually calculate SLOs
- Change SLOs without process
- Treat all SLOs equally (prioritize)
- Let perfect be enemy of good

---

## SLO Dashboard Guide

### Dashboard: `/admin/slo-tracking`

**Key Sections**:

1. **SLO Overview**
   - Current compliance for each SLO
   - Status badges (Compliant/Breached)
   - Trend indicators (↑↓→)

2. **Error Budget**
   - Remaining budget per SLO
   - Burn rate calculation
   - Projected depletion date

3. **Compliance History**
   - 30-day trend charts
   - Breach markers
   - Deployment annotations

4. **Active Breaches**
   - Currently breached SLOs
   - Duration of breach
   - Auto-created incidents
   - Quick actions

---

## Automation

### Scheduled SLO Calculations
```toml
# supabase/config.toml
[functions.slo-manager]
schedule = "*/15 * * * *"  # Every 15 minutes
```

### Auto-Incident Creation
When SLO breached:
1. `slo-manager` detects breach
2. Creates incident automatically
3. Triggers alert via `alert-manager`
4. Notifies on-call engineer

### Integration with CI/CD
```yaml
# Block deployment if error budget < 10%
- name: Check SLO Error Budget
  run: |
    BUDGET=$(curl -X POST https://[project].supabase.co/functions/v1/slo-manager \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -d '{"action": "check_error_budget"}' \
      | jq '.error_budget_remaining')
    
    if [ "$BUDGET" -lt 10 ]; then
      echo "Error budget depleted. Deployment blocked."
      exit 1
    fi
```

---

## Quick Reference

### SLO Health Check Command
```bash
curl -X POST https://[project].supabase.co/functions/v1/slo-manager \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action": "check_slos", "time_window": "1h"}'
```

### View Compliance History
```sql
SELECT * FROM slo_compliance_history
WHERE slo_name = 'API Availability'
ORDER BY measured_at DESC
LIMIT 100;
```

### Calculate Custom SLO
```sql
-- Custom SLO: Transaction processing success rate
SELECT 
  (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*)) as success_rate
FROM transactions
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

---

## Version History
- **v1.0** (2025-01-18): Initial SLO monitoring guide
- Default SLOs: API Availability, Latency P95, Error Rate, Auth Success
