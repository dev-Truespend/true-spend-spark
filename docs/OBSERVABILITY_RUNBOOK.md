# Observability Runbook - Phase 10

## Overview
This runbook provides operational guidance for using TrueSpend's Phase 10 observability infrastructure.

## Table of Contents
1. [Dashboard Access](#dashboard-access)
2. [Monitoring Workflows](#monitoring-workflows)
3. [Alert Response](#alert-response)
4. [Performance Analysis](#performance-analysis)
5. [Troubleshooting](#troubleshooting)

---

## Dashboard Access

### Admin Dashboard Navigation
- **Base URL**: `/admin/`
- **Authentication**: Requires admin role
- **Key Dashboards**:
  - `/admin/real-time-metrics` - Live system metrics
  - `/admin/incidents` - Incident management
  - `/admin/slo-tracking` - SLO compliance monitoring
  - `/admin/alerts` - Alert configuration and history
  - `/admin/performance` - Performance analysis
  - `/admin/security` - Security audit dashboard
  - `/admin/system-logs` - System log viewer
  - `/admin/distributed-tracing` - Request tracing

### Role Requirements
```sql
-- Check user has admin role
SELECT role FROM user_roles WHERE user_id = '<user-id>' AND role = 'admin';
```

---

## Monitoring Workflows

### Daily Health Check (5 minutes)
1. **Check SLO Dashboard** (`/admin/slo-tracking`)
   - Verify all 4 SLOs are above 95% compliance
   - Review any active SLO breaches
   - Check error budget status

2. **Review Open Incidents** (`/admin/incidents`)
   - Prioritize by severity: Critical → High → Medium → Low
   - Verify auto-detected incidents are being addressed
   - Check resolution times meet targets

3. **Monitor Real-Time Metrics** (`/admin/real-time-metrics`)
   - API latency P95 < 2000ms
   - Error rate < 5%
   - Cache hit rate > 70%
   - System health score > 80

### Weekly Performance Review (30 minutes)
1. **Performance Analysis** (`/admin/performance`)
   - Review slowest endpoints (P95 latency)
   - Analyze cache efficiency trends
   - Identify optimization opportunities

2. **Alert Review** (`/admin/alerts`)
   - Check alert delivery success rate
   - Review false positive rate
   - Adjust alert thresholds if needed

3. **Security Audit** (`/admin/security`)
   - Run full security scan
   - Address any new findings
   - Verify RLS policies are enforced

### Monthly System Audit (2 hours)
1. Review incident trends and patterns
2. Analyze performance degradation over time
3. Update alert rules based on learned patterns
4. Review and update SLO targets
5. Generate executive report on system health

---

## Alert Response

### Alert Severity Levels

#### Critical (P1 - Immediate Response)
- **Response Time**: < 5 minutes
- **Channels**: Email + Push + Dashboard
- **Examples**:
  - Error rate > 5% for 5+ minutes
  - API completely down
  - Database connection failures
  - Security breach detected

**Action Plan**:
1. Acknowledge alert immediately
2. Check Incidents Dashboard for auto-created incident
3. Review distributed traces for affected requests
4. Check system logs for error patterns
5. Execute rollback if recent deployment
6. Escalate to engineering lead if unresolved in 15 minutes

#### High (P2 - Urgent Response)
- **Response Time**: < 15 minutes
- **Channels**: Email + Push
- **Examples**:
  - API latency P95 > 2s for 10+ minutes
  - Auth failure rate > 10 for 5 minutes
  - SLO breach detected

**Action Plan**:
1. Acknowledge within 15 minutes
2. Investigate root cause via performance dashboard
3. Check recent deployments or configuration changes
4. Monitor for escalation to Critical
5. Document findings in incident

#### Medium (P3 - Scheduled Response)
- **Response Time**: < 1 hour
- **Channels**: Email
- **Examples**:
  - Cache miss rate > 80% for 15+ minutes
  - Minor performance degradation

**Action Plan**:
1. Review during next scheduled check-in
2. Analyze trends in performance dashboard
3. Plan optimization work
4. Document for weekly review

#### Low (P4 - Best Effort)
- **Response Time**: < 24 hours
- **Channels**: Dashboard only
- **Examples**:
  - Informational alerts
  - Maintenance notifications

---

## Performance Analysis

### Analyzing Slow Endpoints

**Step 1: Identify Problem Endpoints**
```
Navigate to: /admin/performance
Filter by: P95 latency > 2000ms
```

**Step 2: Investigate Traces**
```
1. Copy endpoint path
2. Go to /admin/distributed-tracing
3. Filter traces by endpoint
4. Analyze slow spans
```

**Step 3: Common Causes**
- **Missing Indexes**: Check database query performance
- **N+1 Queries**: Look for multiple sequential DB calls
- **External API Delays**: Review third-party API response times
- **Unoptimized Queries**: Review query execution plans
- **Missing Caching**: Check if frequently accessed data is cached

**Step 4: Optimization Actions**
```sql
-- Example: Add index for slow query
CREATE INDEX idx_transactions_user_date 
ON transactions(user_id, created_at DESC);

-- Example: Update cache TTL
UPDATE cache_analytics 
SET ttl_seconds = 3600 
WHERE cache_type = 'api_response';
```

### Improving Cache Hit Rate

**Current Metrics** (`/admin/performance` → Cache Efficiency)
- Target: > 70% overall hit rate
- By cache type: Google Maps, Foursquare, API responses

**Optimization Strategies**:
1. **Increase TTL** for stable data (geocoding, place details)
2. **Implement Cache Warming** for predictable requests
3. **Add Cache Layers** (L1: In-memory, L2: Redis, L3: Database)
4. **Review Cache Invalidation** strategy

---

## Troubleshooting

### Common Issues

#### Issue: High Error Rate Alert
**Symptoms**: Error rate > 5% alert triggered

**Investigation Steps**:
1. Check System Logs (`/admin/system-logs`)
   ```
   Filter: level = "error"
   Time: Last 15 minutes
   ```
2. Review Distributed Traces for failed requests
3. Check Recent Deployments
4. Review Database Connection Pool

**Resolution**:
- If recent deployment: Rollback
- If database issue: Check connection limits
- If external API: Enable circuit breaker

#### Issue: SLO Breach
**Symptoms**: SLO compliance < 95%

**Investigation Steps**:
1. Identify affected SLO (`/admin/slo-tracking`)
2. Review historical compliance
3. Check if incident was auto-created
4. Analyze root cause via performance dashboard

**Resolution**:
- Document breach in incident
- Implement corrective actions
- Update error budget
- Adjust SLO target if consistently missed

#### Issue: Slow API Responses
**Symptoms**: P95 latency > 2s

**Investigation Steps**:
1. Performance Dashboard → Slow Endpoints
2. Identify specific endpoints
3. Review traces for slow operations
4. Check database query performance

**Resolution**:
- Add database indexes
- Implement caching
- Optimize queries
- Consider CDN for static assets

#### Issue: Cache Miss Storm
**Symptoms**: Cache hit rate drops to < 30%

**Investigation Steps**:
1. Check cache analytics (`/admin/performance`)
2. Review recent cache invalidation events
3. Check TTL settings
4. Monitor backend load

**Resolution**:
- Implement cache warming
- Adjust TTL settings
- Add circuit breakers
- Scale backend if needed

---

## Edge Function Monitoring

### Key Edge Functions to Monitor
- `metrics-collector` - System metrics aggregation
- `incident-detector` - Auto-detect incidents
- `slo-manager` - Track SLO compliance
- `alert-manager` - Route and deliver alerts
- `performance-analyzer` - Performance analysis

### Checking Edge Function Health
```bash
# View edge function logs (Supabase dashboard)
1. Navigate to Edge Functions
2. Select function name
3. Click "Logs" tab
4. Filter by time range

# Or use the dashboard
Navigate to: /admin/system-logs
Filter: component = "edge-functions"
```

### Common Edge Function Issues
- **Timeout**: Increase timeout in `supabase/config.toml`
- **Memory**: Optimize data processing, add pagination
- **Rate Limits**: Implement exponential backoff

---

## Best Practices

### Alert Configuration
✅ **DO**:
- Set meaningful thresholds based on historical data
- Test alert delivery before going to production
- Configure escalation policies
- Review and adjust alert rules monthly

❌ **DON'T**:
- Set alerts that fire constantly (alert fatigue)
- Use same severity for all alerts
- Skip testing notification delivery

### Incident Management
✅ **DO**:
- Document all incidents with root cause
- Update runbooks based on incidents
- Calculate MTTR (Mean Time To Resolution)
- Conduct post-mortems for major incidents

❌ **DON'T**:
- Close incidents without resolution
- Skip root cause analysis
- Ignore recurring incident patterns

### Performance Monitoring
✅ **DO**:
- Set performance budgets per endpoint
- Monitor trends, not just point-in-time metrics
- Correlate performance with deployments
- Load test before major releases

❌ **DON'T**:
- Only react to alerts
- Ignore gradual performance degradation
- Skip performance testing

---

## Emergency Contacts

### Escalation Path
1. **Level 1**: On-call engineer (5 min response)
2. **Level 2**: Engineering lead (15 min response)
3. **Level 3**: CTO (30 min response)

### Communication Channels
- **Incidents**: Slack #incidents
- **Alerts**: Slack #alerts
- **Performance**: Slack #performance

---

## Metrics Glossary

- **P50 (Median)**: 50% of requests are faster than this
- **P95**: 95% of requests are faster than this (focus metric)
- **P99**: 99% of requests are faster than this
- **MTTR**: Mean Time To Resolution
- **MTTD**: Mean Time To Detection
- **Error Rate**: (Failed requests / Total requests) × 100
- **Cache Hit Rate**: (Cache hits / Total cache requests) × 100
- **SLO**: Service Level Objective (target metric)
- **SLI**: Service Level Indicator (actual measurement)
- **Error Budget**: Allowed downtime = (100% - SLO) × time period

---

## Quick Reference Commands

### Check System Health
```sql
-- Overall system health score
SELECT value FROM system_metrics 
WHERE metric_name = 'system_health_score' 
ORDER BY timestamp DESC LIMIT 1;

-- Recent error rate
SELECT COUNT(*) FILTER (WHERE level IN ('error', 'critical')) * 100.0 / COUNT(*) 
FROM system_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

### Manual Incident Creation
```sql
INSERT INTO incidents (title, description, severity, status, affected_services)
VALUES (
  'Manual Incident Title',
  'Detailed description',
  'high',
  'open',
  ARRAY['service-name']
);
```

### Force Alert Test
```sql
-- Test alert delivery
SELECT * FROM supabase.functions.invoke('alert-manager', 
  jsonb_build_object(
    'incidentId', '<incident-id>',
    'severity', 'medium',
    'title', 'Test Alert',
    'description', 'Testing alert delivery'
  )
);
```

---

## Version History
- **v1.0** (2025-01-18): Initial runbook creation
- Phase 10 implementation complete
