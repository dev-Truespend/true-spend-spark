# OCR Enterprise Production Guide

## Overview

This guide covers the enterprise-grade OCR implementation with comprehensive protections, monitoring, and operational features.

## Architecture

### Core Components

1. **Google Vision OCR** (`google-vision-ocr`)
   - Primary OCR service with circuit breaker
   - Retry logic with exponential backoff
   - Rate limiting (50 req/hour per user)
   - Cost tracking ($0.0015 per request)
   - Daily limit ($5 per user)

2. **Queue Processing** (`ocr-queue-processor`)
   - Batch processing with priority
   - Concurrent processing (5 items at a time)
   - Automatic retry on failure
   - Status tracking

3. **Health Monitoring** (`ocr-health-check`)
   - Database connectivity checks
   - Rate limiter health
   - API availability monitoring
   - Cost tracking verification

4. **Alert System** (`ocr-alert-monitor`)
   - Daily cost warnings ($4 threshold)
   - Hourly cost spikes (>$0.50)
   - High failure rate detection (>30%)
   - Rate limit warnings (45/50 requests)

5. **Security Monitor** (`ocr-security-monitor`)
   - IP-based abuse detection
   - Anomaly pattern recognition
   - Automatic blocking for high-severity threats
   - Request signature validation

6. **Maintenance** (`ocr-maintenance`)
   - Automated data cleanup (90-day retention)
   - Request signature cleanup
   - Rate limit cleanup
   - System health reporting

## Protection Mechanisms

### 1. Circuit Breaker
```typescript
Configuration:
- Failure threshold: 5 consecutive failures
- Reset timeout: 1 minute
- Half-open max attempts: 3
```

**States:**
- **CLOSED**: Normal operation
- **OPEN**: Service unavailable, returns error immediately
- **HALF_OPEN**: Testing if service recovered

### 2. Rate Limiting
```typescript
Default Limits:
- 50 requests per hour per user
- Configurable per tier via user_tier_config
```

**Headers Returned:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying

### 3. Cost Protection
```typescript
Cost Tracking:
- Per-request cost: $0.0015
- Daily limit: $5 per user (default)
- Hourly spike threshold: $0.50
```

**Tables:**
- `google_vision_cost_tracking`: All API calls with cost
- `user_tier_config`: Per-user limits

### 4. Retry Logic
```typescript
Configuration:
- Max retries: 2 (for Vision API)
- Initial delay: 500ms
- Max delay: 5s
- Backoff multiplier: 2x
- Timeout: 15s per attempt
```

**Retryable Errors:**
- Network timeouts
- 503 Service Unavailable
- 429 Rate Limit Exceeded
- Connection reset/refused

### 5. Security & Abuse Prevention
```typescript
Detection:
- Rapid requests: >20 in 5 minutes
- Cost spikes: >3x hourly average
- High failure rate: >30% failures
```

**Actions:**
- **Warning**: Log anomaly pattern
- **Blocking**: 1-hour block for high-severity
- **Signature Validation**: Prevent replay attacks

## Database Schema

### Core Tables

#### `google_vision_cost_tracking`
Tracks all API calls with costs and outcomes.

```sql
Columns:
- id, user_id, endpoint
- estimated_cost_usd
- success, error_message
- created_at
```

#### `user_tier_config`
Per-user configuration for scalable limits.

```sql
Columns:
- user_id, tier
- daily_cost_limit
- hourly_request_limit
- monthly_request_limit
- priority
```

#### `ocr_processing_queue`
Async queue for batch processing.

```sql
Columns:
- id, user_id, image_url
- status, priority
- retry_count, max_retries
- result, error_message
- processing_started_at, processing_completed_at
```

#### `ocr_abuse_tracking`
IP-based abuse detection and blocking.

```sql
Columns:
- id, ip_address_hash, user_id
- request_count, anomaly_score
- suspicious_patterns
- blocked_until
```

#### `ocr_anomaly_patterns`
Detected security anomalies.

```sql
Columns:
- id, user_id
- pattern_type, severity
- pattern_data
- resolved, resolved_at
```

### Views for Monitoring

#### `ocr_operational_metrics`
Hourly metrics for the past 7 days.

#### `ocr_user_tier_summary`
User tier distribution and capacity.

#### `ocr_queue_status`
Real-time queue status.

#### `ocr_system_health`
Current system health indicators.

## Operational Procedures

### Setup Automated Tasks

#### 1. Health Checks (Every 5 minutes)
```sql
SELECT cron.schedule(
  'ocr-health-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/ocr-health-check',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

#### 2. Alert Monitoring (Every 15 minutes)
```sql
SELECT cron.schedule(
  'ocr-alert-monitor',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/ocr-alert-monitor',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

#### 3. Security Monitor (Every 30 minutes)
```sql
SELECT cron.schedule(
  'ocr-security-monitor',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/ocr-security-monitor',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

#### 4. Queue Processor (Every 2 minutes)
```sql
SELECT cron.schedule(
  'ocr-queue-processor',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/ocr-queue-processor',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{"batchSize": 10}'::jsonb
  ) as request_id;
  $$
);
```

#### 5. Maintenance (Daily at 2 AM)
```sql
SELECT cron.schedule(
  'ocr-maintenance',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://[PROJECT_ID].supabase.co/functions/v1/ocr-maintenance',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Monitoring Queries

#### Check Current System Health
```sql
SELECT * FROM ocr_system_health;
```

#### View Recent Anomalies
```sql
SELECT * FROM ocr_anomaly_patterns
WHERE NOT resolved
ORDER BY detection_time DESC
LIMIT 20;
```

#### Check Queue Backlog
```sql
SELECT * FROM ocr_queue_status;
```

#### User Cost Analysis
```sql
SELECT 
  user_id,
  COUNT(*) as requests_today,
  SUM(estimated_cost_usd) as total_cost_today,
  AVG(estimated_cost_usd) as avg_cost_per_request,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM google_vision_cost_tracking
WHERE created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY total_cost_today DESC;
```

### Troubleshooting

#### High Failure Rate
1. Check circuit breaker status in logs
2. Verify Google Vision API key is valid
3. Check for rate limit exhaustion
4. Review error messages in `google_vision_cost_tracking`

#### Queue Backlog
1. Check `ocr_queue_status` for pending count
2. Review failed items for common errors
3. Increase queue processor frequency
4. Consider scaling queue processor concurrency

#### Cost Overruns
1. Review `ocr_anomaly_patterns` for cost spikes
2. Check `ocr_abuse_tracking` for suspicious patterns
3. Audit user tier configurations
4. Implement stricter rate limits

## Security Best Practices

1. **API Keys**: Store Google Vision API key in secrets
2. **Rate Limiting**: Monitor and adjust based on usage patterns
3. **Cost Limits**: Set per-user and system-wide limits
4. **Anomaly Detection**: Review alerts regularly
5. **Access Control**: Use RLS policies for data isolation
6. **Audit Logs**: Maintain comprehensive logging

## Scalability Considerations

### Tier Configuration
```sql
INSERT INTO user_tier_config (user_id, tier, daily_cost_limit, hourly_request_limit)
VALUES
  ('user-uuid', 'free', 5.00, 50),
  ('user-uuid', 'pro', 50.00, 500),
  ('user-uuid', 'enterprise', 500.00, 5000);
```

### Queue Processing
- Adjust `batchSize` parameter for throughput
- Increase concurrency limit for faster processing
- Monitor queue age and processing times

### Database Performance
- Indexes are optimized for common queries
- Regular VACUUM and ANALYZE (requires superuser)
- Consider partitioning for large datasets

## Cost Optimization

1. **Caching**: Implement receipt deduplication
2. **Fallback Strategy**: Use cheaper alternatives when appropriate
3. **Batch Processing**: Queue non-urgent requests
4. **Tier-based Limits**: Enforce stricter limits for free tier
5. **Monitoring**: Track cost per user and alert on anomalies

## Support & Maintenance

### Regular Tasks
- [ ] Review anomaly patterns weekly
- [ ] Audit cost tracking monthly
- [ ] Update tier limits as needed
- [ ] Review and optimize queue processing
- [ ] Check circuit breaker statistics
- [ ] Verify cron job execution

### Emergency Procedures
- Circuit breaker manual reset via database
- Temporary user blocking in `ocr_abuse_tracking`
- Queue purging for stuck items
- Rate limit override for legitimate traffic spikes

## Metrics & KPIs

- **Success Rate**: Target >95%
- **Response Time**: P95 <3s
- **Cost Per Request**: <$0.002
- **Queue Processing**: <5 minute lag
- **Anomaly Detection**: <1% false positives
