# Incident Response Guide

## Overview
This guide provides step-by-step procedures for responding to system incidents in TrueSpend.

---

## Incident Severity Matrix

| Severity | Impact | Response Time | Examples |
|----------|--------|---------------|----------|
| **Critical (P1)** | Complete service outage | < 5 minutes | API down, data breach, auth failure |
| **High (P2)** | Major degradation | < 15 minutes | Slow responses, SLO breach, high error rate |
| **Medium (P3)** | Minor degradation | < 1 hour | Performance issues, cache problems |
| **Low (P4)** | Minimal impact | < 24 hours | UI bugs, cosmetic issues |

---

## Response Workflow

### Step 1: Alert Reception
1. **Acknowledge Alert** (< 2 minutes)
   - Navigate to `/admin/alerts`
   - Click incident link
   - Click "Acknowledge" button

2. **Assess Severity**
   - Review incident details
   - Check affected services
   - Verify current impact

3. **Create Communication Channel**
   - For P1/P2: Create dedicated Slack channel
   - For P3/P4: Use existing #incidents channel

### Step 2: Initial Investigation (< 10 minutes)
1. **Gather Context**
   ```
   Dashboard: /admin/incidents
   - Check incident description
   - Review auto-detected metrics
   - Note start time and duration
   ```

2. **Check System Health**
   ```
   Dashboard: /admin/real-time-metrics
   - System health score
   - Error rate
   - API latency
   - Active users affected
   ```

3. **Review Recent Changes**
   ```
   Questions to ask:
   - Recent deployments?
   - Configuration changes?
   - Infrastructure changes?
   - Third-party API changes?
   ```

4. **Analyze Logs and Traces**
   ```
   Dashboard: /admin/system-logs
   Filter: level = "error", time = last 30 min
   
   Dashboard: /admin/distributed-tracing
   Filter: status = "error", time = last 30 min
   ```

### Step 3: Diagnosis (< 20 minutes)
1. **Identify Root Cause**
   - Review error patterns in logs
   - Analyze slow traces
   - Check external dependencies
   - Review database performance

2. **Determine Impact Scope**
   ```sql
   -- Count affected users
   SELECT COUNT(DISTINCT user_id) 
   FROM system_logs 
   WHERE level = 'error' 
   AND timestamp > NOW() - INTERVAL '30 minutes';
   
   -- Check affected endpoints
   SELECT endpoint, COUNT(*) as error_count
   FROM api_request_log
   WHERE status_code >= 500
   AND created_at > NOW() - INTERVAL '30 minutes'
   GROUP BY endpoint
   ORDER BY error_count DESC;
   ```

3. **Document Findings**
   ```
   Update incident in dashboard:
   - Root cause hypothesis
   - Affected components
   - User impact estimate
   - Mitigation strategy
   ```

### Step 4: Mitigation (Immediate)
1. **Apply Quick Fix**
   - Rollback recent deployment
   - Scale infrastructure
   - Enable circuit breakers
   - Failover to backup systems

2. **Verify Mitigation**
   ```
   Dashboard: /admin/real-time-metrics
   - Check metrics are improving
   - Monitor error rate decline
   - Verify latency reduction
   ```

3. **Update Status**
   ```
   Dashboard: /admin/incidents
   Status: "investigating" → "mitigated"
   Add resolution notes
   ```

### Step 5: Resolution (Long-term Fix)
1. **Implement Permanent Fix**
   - Deploy code fix
   - Update configuration
   - Add monitoring
   - Improve error handling

2. **Test Thoroughly**
   - Verify fix in staging
   - Run load tests
   - Check all affected scenarios

3. **Deploy to Production**
   - Use gradual rollout
   - Monitor metrics during deployment
   - Keep rollback plan ready

4. **Mark Incident Resolved**
   ```
   Dashboard: /admin/incidents
   Status: "mitigated" → "resolved"
   Document:
   - Resolution steps
   - Time to resolution
   - Preventive measures
   ```

### Step 6: Post-Incident Review (Within 48 hours)
1. **Conduct Post-Mortem**
   - Timeline of events
   - Root cause analysis
   - What went well
   - What could be improved
   - Action items

2. **Update Documentation**
   - Add to runbooks
   - Update alert thresholds
   - Improve monitoring
   - Share lessons learned

3. **Track Action Items**
   - Create tickets for improvements
   - Assign owners
   - Set deadlines
   - Track completion

---

## Incident Response Playbooks

### Playbook 1: API Outage (P1)
**Symptoms**: API returning 500 errors, timeout errors

**Immediate Actions**:
1. Check edge function logs
   ```
   Dashboard: /admin/system-logs
   Filter: component = "edge-functions"
   ```

2. Verify database connectivity
   ```sql
   -- Test connection
   SELECT 1;
   
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   ```

3. Check third-party API status
   - Google Maps API
   - Foursquare API
   - Resend (email)

**Resolution Steps**:
1. If edge function timeout: Increase timeout
2. If database connection limit: Scale up connections
3. If third-party API down: Enable fallback/cache

### Playbook 2: High Error Rate (P2)
**Symptoms**: Error rate > 5% for 5+ minutes

**Immediate Actions**:
1. Identify failing endpoints
   ```sql
   SELECT endpoint, COUNT(*) as errors
   FROM api_request_log
   WHERE status_code >= 400
   AND created_at > NOW() - INTERVAL '15 minutes'
   GROUP BY endpoint
   ORDER BY errors DESC
   LIMIT 10;
   ```

2. Check recent deployments
3. Review application logs

**Resolution Steps**:
1. If new bug: Rollback deployment
2. If data issue: Fix data corruption
3. If validation error: Update validation logic

### Playbook 3: Slow API Responses (P2)
**Symptoms**: P95 latency > 2s

**Immediate Actions**:
1. Check performance dashboard
   ```
   Dashboard: /admin/performance
   Identify slowest endpoints
   ```

2. Review database queries
3. Check cache hit rate

**Resolution Steps**:
1. Add missing database indexes
2. Implement caching for slow queries
3. Optimize N+1 query patterns
4. Scale infrastructure if needed

### Playbook 4: Authentication Failures (P1)
**Symptoms**: Users unable to log in, auth errors

**Immediate Actions**:
1. Check auth service health
2. Verify JWT secret configuration
3. Check rate limiting

**Resolution Steps**:
1. Clear rate limits if false positive
2. Verify Supabase auth configuration
3. Check session management
4. Review MFA implementation

### Playbook 5: Database Connection Issues (P1)
**Symptoms**: "Too many connections" errors

**Immediate Actions**:
1. Check active connections
   ```sql
   SELECT count(*), state 
   FROM pg_stat_activity 
   GROUP BY state;
   ```

2. Kill idle connections
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < NOW() - INTERVAL '10 minutes';
   ```

**Resolution Steps**:
1. Increase max_connections
2. Implement connection pooling
3. Fix connection leaks in code
4. Add connection timeout logic

### Playbook 6: SLO Breach (P2)
**Symptoms**: SLO compliance < 95%

**Immediate Actions**:
1. Identify breached SLO
   ```
   Dashboard: /admin/slo-tracking
   ```

2. Check error budget status
3. Review recent performance trends

**Resolution Steps**:
1. Address root cause (use other playbooks)
2. Document breach reasoning
3. Update stakeholders
4. Adjust SLO if consistently unachievable

---

## Communication Templates

### Internal Alert (Slack)
```
🚨 INCIDENT: [Severity] - [Title]

Status: [Open/Investigating/Mitigated/Resolved]
Impact: [Description of user impact]
Affected Services: [List]
Started: [Time]
ETA: [Estimated resolution time]

Current Actions:
- [Action 1]
- [Action 2]

Dashboard: https://app.truespend.ai/admin/incidents/[ID]
```

### Status Update (Every 30 min for P1/P2)
```
📊 UPDATE: [Incident Title]

Current Status: [Status]
Time Elapsed: [Duration]

Progress:
✅ [Completed action]
🔄 [In progress action]
⏳ [Pending action]

Next Steps:
- [Step 1]
- [Step 2]

ETA: [Updated estimate]
```

### Resolution Notification
```
✅ RESOLVED: [Incident Title]

Resolution: [Description]
Duration: [Total time]
Root Cause: [Brief explanation]

Prevention:
- [Measure 1]
- [Measure 2]

Post-mortem: [Link to document]
```

---

## Escalation Procedures

### When to Escalate

**Escalate to Engineering Lead if**:
- P1 incident unresolved after 15 minutes
- P2 incident unresolved after 1 hour
- Root cause unclear
- Fix requires architectural changes
- Multiple incidents occurring simultaneously

**Escalate to CTO if**:
- P1 incident unresolved after 30 minutes
- Data breach suspected
- Legal/compliance implications
- Major financial impact
- Media attention likely

### Escalation Contacts
```
Engineering Lead: [Contact info]
CTO: [Contact info]
Security Team: [Contact info]
Legal: [Contact info]
```

---

## Tools and Resources

### Monitoring Dashboards
- Real-time Metrics: `/admin/real-time-metrics`
- Incidents: `/admin/incidents`
- Performance: `/admin/performance`
- Logs: `/admin/system-logs`
- Traces: `/admin/distributed-tracing`

### External Tools
- Supabase Dashboard: Check database and edge functions
- Vercel Dashboard: Check deployment status
- Status Pages: Google Maps, Foursquare, Resend

### Documentation
- Observability Runbook: `/docs/OBSERVABILITY_RUNBOOK.md`
- SLO Monitoring: `/docs/SLO_MONITORING_GUIDE.md`
- Alert Configuration: `/docs/ALERTING_CONFIGURATION.md`

---

## Incident Metrics

### Track These KPIs
- **MTTD** (Mean Time To Detection): How fast incidents are detected
- **MTTA** (Mean Time To Acknowledge): How fast team responds
- **MTTR** (Mean Time To Resolution): How fast incidents are fixed
- **Incident Count**: Total incidents by severity
- **False Positive Rate**: Alerts that weren't real incidents

### Target Metrics
- MTTD: < 2 minutes (auto-detection)
- MTTA: < 5 minutes (P1), < 15 minutes (P2)
- MTTR: < 30 minutes (P1), < 2 hours (P2)
- False Positive Rate: < 10%

---

## Version History
- **v1.0** (2025-01-18): Initial incident response guide
