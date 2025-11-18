# Phase 10 Training Guide - Observability & Monitoring

## Welcome to Phase 10! 🎉

This guide will help you master TrueSpend's observability infrastructure.

---

## What You'll Learn

1. **Dashboard Navigation** (15 min)
2. **Monitoring Workflows** (20 min)
3. **Incident Response** (30 min)
4. **Performance Analysis** (20 min)
5. **Alert Management** (15 min)

**Total Time**: ~2 hours

---

## Module 1: Dashboard Navigation (15 min)

### Admin Dashboard Overview

**URL**: `https://app.truespend.ai/admin`

**Key Dashboards**:

1. **Overview** (`/admin`)
   - System health snapshot
   - Recent incidents
   - Key metrics at a glance
   - Quick navigation

2. **Real-Time Metrics** (`/admin/real-time-metrics`)
   - Live system metrics
   - API latency charts
   - Error rate monitoring
   - Cache performance

3. **Incidents** (`/admin/incidents`)
   - Active and resolved incidents
   - Incident details and timeline
   - Resolution actions
   - Statistics

4. **SLO Tracking** (`/admin/slo-tracking`)
   - Service Level Objectives
   - Compliance percentage
   - Error budget status
   - Breach history

5. **Alerts** (`/admin/alerts`)
   - Alert rules configuration
   - Alert delivery history
   - Acknowledgment tracking

6. **Performance** (`/admin/performance`)
   - Slow endpoint analysis
   - Cache efficiency metrics
   - Database performance
   - Optimization recommendations

7. **Security** (`/admin/security`)
   - Security audit results
   - Vulnerability scanning
   - RLS policy verification

8. **System Logs** (`/admin/system-logs`)
   - Application logs
   - Filtering and search
   - Log levels and components

9. **Distributed Tracing** (`/admin/distributed-tracing`)
   - Request traces
   - Performance waterfall
   - Error tracking
   - Span analysis

### Exercise 1: Dashboard Tour
1. Navigate to each dashboard
2. Note the key metrics displayed
3. Try filtering and time ranges
4. Bookmark frequently used dashboards

---

## Module 2: Monitoring Workflows (20 min)

### Daily Health Check (5 min)

**Goal**: Verify system health each morning

**Steps**:
1. Open `/admin/slo-tracking`
2. Check all 4 SLOs are ≥ 95%
3. Review error budget status
4. If any SLO < 95%: Investigate immediately

**What to Look For**:
- ✅ Green badges = Healthy
- ⚠️ Yellow badges = Warning
- 🔴 Red badges = Critical

### Incident Monitoring

**Goal**: Stay on top of system issues

**Workflow**:
1. Open `/admin/incidents`
2. Filter by "Open" incidents
3. Sort by severity (Critical → Low)
4. Review each incident:
   - Read description
   - Check affected services
   - Verify someone is assigned
   - Monitor resolution progress

**Action Required When**:
- Critical incident > 5 min old
- High incident > 15 min old
- Any incident without progress

### Performance Monitoring

**Goal**: Identify slow or problematic endpoints

**Workflow**:
1. Open `/admin/performance`
2. Select time window (24h or 7d)
3. Review "Slowest Endpoints" table
4. Click endpoints with P95 > 2s
5. Navigate to tracing for detailed analysis

**Red Flags**:
- P95 latency > 2000ms
- Error rate > 5%
- Cache hit rate < 70%

### Exercise 2: Mock Health Check
1. Open SLO dashboard
2. Record current compliance %
3. Check for any incidents
4. Review performance dashboard
5. Write a brief status summary

---

## Module 3: Incident Response (30 min)

### Incident Lifecycle

```
Detected → Acknowledged → Investigating → Mitigated → Resolved
```

### Responding to Alerts

**Step 1: Alert Reception**
- Alert arrives via email or push
- Click link to incident dashboard
- Review incident details

**Step 2: Acknowledge**
```
Dashboard: /admin/incidents/[ID]
Action: Click "Acknowledge" button
Effect: Stops escalation, assigns to you
```

**Step 3: Assess Severity**
- Read description carefully
- Check affected services
- Determine user impact
- Estimate resolution time

**Step 4: Investigate**
- Review system logs
- Check distributed traces
- Analyze performance metrics
- Identify root cause

**Step 5: Mitigate**
- Apply quick fix
- Monitor metrics improve
- Update incident status
- Document actions taken

**Step 6: Resolve**
- Verify fix is permanent
- Update incident to "Resolved"
- Document lessons learned
- Update runbooks if needed

### Exercise 3: Incident Walkthrough

**Scenario**: Error Rate Alert

1. **Alert**: "CRITICAL: Error rate > 5%"
2. **Navigate**: `/admin/incidents` → Find incident
3. **Investigate**:
   - Go to `/admin/system-logs`
   - Filter: level = "error", last 15 min
   - Identify error pattern
4. **Analyze**:
   - Go to `/admin/distributed-tracing`
   - Filter: status = "error"
   - Find failing endpoint
5. **Mitigate** (Hypothetical):
   - Check recent deployments
   - Consider rollback
   - Monitor error rate decline
6. **Document**:
   - Root cause: [Your answer]
   - Resolution: [Your action]
   - Prevention: [Improvement]

---

## Module 4: Performance Analysis (20 min)

### Using the Performance Dashboard

**Dashboard**: `/admin/performance`

### Analyzing Slow Endpoints

**What to Look For**:
- P50: Median latency (typical user experience)
- P95: 95th percentile (focus metric)
- P99: 99th percentile (worst case)
- Error Rate: % of failed requests

**Threshold Guidelines**:
- P95 < 500ms: Excellent ✅
- P95 500-1000ms: Good ✅
- P95 1000-2000ms: Acceptable ⚠️
- P95 > 2000ms: Needs attention 🔴

### Cache Efficiency Analysis

**Metrics**:
- Overall Hit Rate: Target > 70%
- By Cache Type:
  - Google Maps: Target > 80%
  - Foursquare: Target > 75%
  - API Responses: Target > 60%

**Improvement Actions**:
- Low hit rate → Increase TTL
- High miss rate → Implement cache warming
- Uneven distribution → Review caching strategy

### Optimization Recommendations

**Dashboard shows**:
- ⚠️ Performance warnings
- 🔴 Critical issues
- 📦 Cache suggestions
- 🗄️ Database optimizations
- ✅ System healthy

**Take Action**:
1. Prioritize critical (🔴) issues
2. Review warnings (⚠️) weekly
3. Implement database optimizations
4. Test changes in staging
5. Monitor impact in production

### Exercise 4: Performance Review
1. Open `/admin/performance`
2. Find slowest endpoint
3. Record P95 latency
4. Navigate to distributed tracing
5. Analyze slow spans
6. Propose one optimization

---

## Module 5: Alert Management (15 min)

### Configuring Alert Rules

**Dashboard**: `/admin/alerts`

### Creating a New Rule

**Step 1: Navigate**
```
/admin/alerts → Click "New Rule"
```

**Step 2: Configure**
```
Name: Descriptive name
Severity: critical | high | medium | low
Channels: email, push (select one or both)
Recipients: Select users or "all admins"
Escalation: Minutes before escalation
Active: Enable rule
```

**Step 3: Save and Test**
```
1. Click "Save"
2. Click "Test" button
3. Check your email/push
4. Verify in Alert History
```

### Managing Existing Rules

**Actions**:
- **Toggle Active**: Enable/disable rule without deleting
- **Edit**: Modify settings
- **Delete**: Remove rule (careful!)

**Best Practices**:
- Keep rules simple and focused
- Use clear naming
- Test before enabling
- Review quarterly

### Viewing Alert History

**Dashboard Section**: Alert History

**Information Shown**:
- Sent timestamp
- Delivery channel
- Recipient
- Status (sent/failed/acknowledged)
- Severity
- Acknowledgment time

**Use Cases**:
- Verify alert delivery
- Check response times
- Audit alert effectiveness
- Debug delivery issues

### Exercise 5: Alert Configuration
1. Navigate to `/admin/alerts`
2. Review existing alert rules
3. Create a test rule (low severity)
4. Test the rule
5. Check alert history
6. Disable the test rule

---

## Hands-On Lab: Full Scenario (30 min)

### Scenario: Production Issue

**Timeline**:
- **09:00**: System seems normal
- **09:15**: Alert: "High error rate detected"
- **09:30**: Multiple users reporting issues
- **10:00**: Issue must be resolved

**Your Mission**:
Respond to and resolve this incident using Phase 10 tools.

### Step-by-Step

**1. Alert Response (0-5 min)**
- [ ] Acknowledge alert
- [ ] Note incident ID
- [ ] Check severity

**2. Initial Assessment (5-10 min)**
- [ ] Review incident details
- [ ] Check affected services
- [ ] Estimate user impact
- [ ] Determine urgency

**3. Investigation (10-20 min)**
- [ ] Open System Logs dashboard
- [ ] Filter for errors in last 15 min
- [ ] Identify error patterns
- [ ] Open Distributed Tracing
- [ ] Find slow or failed requests
- [ ] Analyze spans
- [ ] Identify root cause

**4. Resolution (20-25 min)**
- [ ] Document findings
- [ ] Apply mitigation
- [ ] Verify metrics improving
- [ ] Update incident status

**5. Follow-up (25-30 min)**
- [ ] Mark incident resolved
- [ ] Document in runbook
- [ ] Propose prevention measure
- [ ] Update alert thresholds if needed

### Evaluation Criteria

✅ **Excellent** if you:
- Acknowledged within 2 min
- Identified root cause within 15 min
- Applied appropriate mitigation
- Documented thoroughly
- Proposed prevention

⚠️ **Needs Improvement** if:
- Missed acknowledgment deadline
- Incorrect diagnosis
- Incomplete documentation
- No prevention proposed

---

## Common Mistakes to Avoid

### ❌ Don't

1. **Ignore Alerts**
   - Every alert needs acknowledgment
   - Even if it seems like false positive

2. **Skip Documentation**
   - Always document resolution
   - Update runbooks with learnings

3. **Rush to Production**
   - Test fixes in staging first
   - Monitor closely after deployment

4. **Overlook Patterns**
   - Track recurring issues
   - Address root causes, not symptoms

5. **Work in Isolation**
   - Communicate with team
   - Escalate when stuck

### ✅ Do

1. **Follow Playbooks**
   - Use provided incident response guides
   - Update them as you learn

2. **Communicate Clearly**
   - Update incident status regularly
   - Use clear, concise language

3. **Learn Continuously**
   - Review post-mortems
   - Share knowledge with team

4. **Automate Where Possible**
   - Use auto-detection
   - Leverage alerts
   - Implement fixes that prevent recurrence

5. **Stay Calm**
   - Follow systematic approach
   - Don't panic under pressure

---

## Knowledge Check

### Quiz Questions

1. **What is the target for API Availability SLO?**
   - A) 95%
   - B) 99%
   - C) 99.5% ✅
   - D) 100%

2. **What should you do first when receiving a critical alert?**
   - A) Start fixing immediately
   - B) Acknowledge the alert ✅
   - C) Notify everyone
   - D) Open system logs

3. **What P95 latency threshold triggers a warning?**
   - A) 500ms
   - B) 1000ms
   - C) 2000ms ✅
   - D) 3000ms

4. **What is the minimum acceptable cache hit rate?**
   - A) 50%
   - B) 60%
   - C) 70% ✅
   - D) 80%

5. **How often should you check SLO compliance?**
   - A) Hourly
   - B) Daily ✅
   - C) Weekly
   - D) Monthly

**Answers**: 1-C, 2-B, 3-C, 4-C, 5-B

---

## Resources

### Documentation
- Observability Runbook: `/docs/OBSERVABILITY_RUNBOOK.md`
- Incident Response Guide: `/docs/INCIDENT_RESPONSE_GUIDE.md`
- SLO Monitoring Guide: `/docs/SLO_MONITORING_GUIDE.md`
- Alerting Configuration: `/docs/ALERTING_CONFIGURATION.md`

### Dashboards
- Admin Dashboard: `/admin`
- Real-Time Metrics: `/admin/real-time-metrics`
- Incidents: `/admin/incidents`
- Performance: `/admin/performance`
- Alerts: `/admin/alerts`

### Support
- Slack: #observability
- Email: engineering@truespend.ai
- On-call: See escalation guide

---

## Certification

To become certified in Phase 10 Observability:

### Requirements
- [ ] Complete all modules
- [ ] Pass knowledge check (80%+)
- [ ] Complete hands-on lab
- [ ] Shadow 3 on-call shifts
- [ ] Resolve 5 real incidents

### Benefits
- Eligible for on-call rotation
- Admin dashboard access
- Incident response authority
- Quarterly performance bonus

---

## Next Steps

1. **Practice Daily**
   - Check dashboards every morning
   - Review incidents weekly
   - Analyze performance trends

2. **Shadow On-Call**
   - Observe experienced team members
   - Learn real-world scenarios
   - Build confidence

3. **Contribute**
   - Update runbooks with learnings
   - Share tips with team
   - Propose improvements

4. **Stay Updated**
   - Follow Phase 10 updates
   - Attend training sessions
   - Review quarterly reports

---

## Feedback

Help us improve this training!

**What worked well?**
**What could be better?**
**Suggestions for future topics?**

Submit feedback: [Form link]

---

## Version History
- **v1.0** (2025-01-18): Initial training guide
- Phase 10 complete and production-ready

**Welcome to the observability team! 🚀**
