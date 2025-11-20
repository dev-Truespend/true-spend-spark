# Redis Operations & Monitoring Guide

## Overview

This application uses **Upstash Redis** for high-performance server-side caching. Redis serves as Layer 1 (L1) cache, providing sub-millisecond latency for frequently accessed data.

## Architecture

```
L1: Redis (Upstash) - Server-side, 5-10 min TTL
  ↓ (on miss)
L2: Supabase Database - Source of truth
```

## Cache Key Patterns

All Redis keys follow structured naming conventions for easy management and invalidation:

### 1. Merchant Discovery Cache
**Pattern**: `merchants:{geohash}:{category}:{deals}`
- **TTL**: 5 minutes (300 seconds)
- **Example**: `merchants:dr5regw:restaurant:true`
- **Purpose**: Cache Google Places API results to reduce external API costs
- **Invalidation**: On merchant data updates or manual refresh

```typescript
// Edge Function: merchant-discovery
const cacheKey = `merchants:${geohash}:${category || 'all'}:${dealsOnly}`;
```

### 2. Dashboard Data Cache
**Pattern**: `dashboard:{user_id}`
- **TTL**: 5 minutes (300 seconds)
- **Example**: `dashboard:550e8400-e29b-41d4-a716-446655440000`
- **Purpose**: Aggregate user dashboard data (transactions, budgets, alerts)
- **Invalidation**: On user data changes, transaction updates

```typescript
// Edge Function: bff-dashboard
const cacheKey = `dashboard:${userId}`;
```

### 3. Location Analytics Cache
**Pattern**: `location_analytics:{user_id}:{days}:{geofence_id}`
- **TTL**: 10 minutes (600 seconds)
- **Example**: `location_analytics:550e8400-e29b-41d4-a716-446655440000:30:geo123`
- **Purpose**: Cache location-based spending analytics and heatmap data
- **Invalidation**: On transaction updates, geofence changes

```typescript
// Edge Function: location-analytics-bff
const cacheKey = `location_analytics:${userId}:${days}:${geofenceId || 'all'}`;
```

## Cache Invalidation Triggers

### Automatic Invalidation
Cache entries automatically expire after their TTL period. No manual intervention required for normal operations.

### Manual Invalidation Required For:

1. **User Data Changes**
   - New transaction added → Invalidate `dashboard:{user_id}` and `location_analytics:{user_id}:*`
   - Budget updated → Invalidate `dashboard:{user_id}`
   - Geofence modified → Invalidate `location_analytics:{user_id}:*:{geofence_id}`

2. **Merchant Data Updates**
   - Merchant information changed → Invalidate `merchants:*`
   - Deals/cashback updated → Invalidate `merchants:*:*:true`

3. **System-Wide Updates**
   - Configuration changes → Invalidate all matching patterns
   - Data migrations → Flush entire cache (use with caution)

### Invalidation API

Use the `redis-metrics` edge function to trigger invalidation:

```typescript
// Invalidate specific user's dashboard
await supabase.functions.invoke('redis-metrics', {
  body: { 
    operation: 'invalidate',
    pattern: 'dashboard:550e8400-e29b-41d4-a716-446655440000'
  }
});

// Invalidate all merchant caches
await supabase.functions.invoke('redis-metrics', {
  body: { 
    operation: 'invalidate',
    pattern: 'merchants:*'
  }
});

// Invalidate location analytics for specific user
await supabase.functions.invoke('redis-metrics', {
  body: { 
    operation: 'invalidate',
    pattern: 'location_analytics:550e8400-e29b-41d4-a716-446655440000:*'
  }
});
```

## Monitoring & Alerts

### Key Performance Indicators (KPIs)

1. **Hit Rate**: Percentage of requests served from cache
   - **Target**: >70% after warm-up period
   - **Alert Threshold**: <60% sustained for >15 minutes
   - **Action**: Investigate cache invalidation frequency, check TTL values

2. **Average Latency**: Time to retrieve data from Redis
   - **Target**: <5ms (P99 <10ms)
   - **Alert Threshold**: >10ms sustained for >5 minutes
   - **Action**: Check Upstash dashboard for Redis performance, verify network connectivity

3. **Memory Usage**: Redis memory consumption
   - **Target**: <80% of quota
   - **Alert Threshold**: >90% of quota
   - **Action**: Review cache key patterns, reduce TTL, increase quota, implement LRU eviction

4. **Quota Remaining**: Available memory before limit
   - **Target**: >20% remaining
   - **Alert Threshold**: <10% remaining
   - **Action**: Immediate review of cache size, consider upgrading Upstash plan

### Monitoring Dashboard

Access real-time Redis metrics in the application:
1. Navigate to **Dashboard** → **Performance**
2. View the **Redis Cache Monitor** section
3. Metrics updated every 10 seconds

**Available Metrics:**
- Cache Hit Rate (%)
- Average Latency (ms)
- Total Requests (count)
- Memory Usage (MB)
- Quota Remaining (%)

### Upstash Dashboard Monitoring

For production-level monitoring, use the Upstash dashboard:

1. **Login**: https://console.upstash.com/
2. **Navigate**: Redis → [Your Database Name]
3. **Key Metrics**:
   - Throughput (ops/sec)
   - Hit/Miss ratio
   - Memory usage
   - Connection count
   - Command statistics

4. **Alerts Setup**:
   - Configure email alerts for high memory usage
   - Set up Slack notifications for performance degradation
   - Enable webhook alerts for critical events

## Troubleshooting Guide

### Problem: Low Hit Rate (<60%)

**Symptoms:**
- Cache hit rate below target
- Increased external API costs
- Slower response times

**Diagnosis:**
```typescript
// Check cache analytics
const { data } = await supabase
  .from('cache_analytics')
  .select('*')
  .eq('cache_type', 'redis')
  .order('timestamp', { ascending: false })
  .limit(100);

// Analyze hit/miss patterns
console.log('Recent cache operations:', data);
```

**Solutions:**
1. Verify TTL values are appropriate for data volatility
2. Check for excessive cache invalidation
3. Review cache key patterns for consistency
4. Ensure SCAN-based invalidation isn't too aggressive

### Problem: High Latency (>10ms)

**Symptoms:**
- Slow API responses
- Timeout errors
- Poor user experience

**Diagnosis:**
```typescript
// Check Redis metrics
const { data } = await supabase.functions.invoke('redis-metrics');
console.log('Redis stats:', data);
```

**Solutions:**
1. Verify Upstash instance region (should be close to Supabase region)
2. Check network connectivity to Upstash
3. Review Upstash dashboard for performance issues
4. Consider upgrading Upstash plan for better performance
5. Verify SCAN operations aren't blocking (should use cursor-based iteration)

### Problem: Memory Usage >90%

**Symptoms:**
- Cache evictions
- Decreasing hit rate
- Potential cache failures

**Diagnosis:**
```typescript
// List all keys (use with caution in production)
const { data } = await supabase.functions.invoke('redis-metrics', {
  body: { operation: 'keys', pattern: '*' }
});
console.log('Total keys:', data?.keys?.length);
```

**Solutions:**
1. Reduce TTL values for less critical data
2. Implement more aggressive cache invalidation
3. Review cache key patterns for redundancy
4. Upgrade Upstash plan for larger memory quota
5. Enable LRU eviction policy in Upstash

### Problem: SCAN Operation Timeout

**Symptoms:**
- Cache invalidation failures
- 500 errors from edge functions
- Redis blocking

**Diagnosis:**
```typescript
// Check SCAN operation performance
console.time('cache-invalidation');
await supabase.functions.invoke('redis-metrics', {
  body: { 
    operation: 'invalidate',
    pattern: 'merchants:*'
  }
});
console.timeEnd('cache-invalidation');
```

**Solutions:**
1. Verify `SCAN` is used instead of `KEYS` (check `redis-metrics` function)
2. Reduce SCAN batch size (COUNT parameter)
3. Implement rate limiting for invalidation operations
4. Consider scheduled invalidation instead of on-demand

### Problem: Inconsistent Cache Data

**Symptoms:**
- Stale data served to users
- Mismatch between cache and database

**Diagnosis:**
```sql
-- Compare cached vs. database data
SELECT * FROM cache_analytics 
WHERE operation = 'hit' 
ORDER BY timestamp DESC 
LIMIT 20;
```

**Solutions:**
1. Reduce TTL for affected cache keys
2. Implement cache invalidation on data updates
3. Add cache version headers for breaking changes
4. Review edge function caching logic

## Performance Benchmarks

### Expected Performance (Production)

| Metric | Target | Good | Needs Attention |
|--------|--------|------|----------------|
| Hit Rate | >80% | 70-80% | <70% |
| Avg Latency | <3ms | 3-5ms | >5ms |
| P99 Latency | <5ms | 5-10ms | >10ms |
| Memory Usage | <60% | 60-80% | >80% |
| Quota Remaining | >40% | 20-40% | <20% |

### Load Test Results

Based on `e2e/redis-cache.spec.ts`:
- **100 concurrent requests**: <50ms P99 latency, <20ms average
- **SCAN invalidation**: <5s for 1000+ keys
- **Cache warm-up**: 5-10 requests to reach 70% hit rate

## Best Practices

1. **Cache Key Design**
   - Use hierarchical naming (e.g., `resource:id:subresource`)
   - Include version numbers for breaking changes
   - Keep keys short but descriptive

2. **TTL Strategy**
   - Start with conservative TTLs (5 min) and adjust based on data volatility
   - Use longer TTLs (10-15 min) for rarely changing data
   - Use shorter TTLs (1-2 min) for frequently updated data

3. **Invalidation Strategy**
   - Prefer TTL-based expiration over manual invalidation
   - Use pattern-based invalidation sparingly
   - Batch invalidation requests when possible

4. **Monitoring**
   - Set up alerts for critical metrics
   - Review Upstash dashboard weekly
   - Track cache analytics for optimization opportunities

5. **Security**
   - Store Redis credentials as secrets (already configured)
   - Use HTTPS for all Redis connections
   - Implement rate limiting for cache operations

## Configuration

### Environment Variables

These are automatically configured via Lovable Cloud secrets:

```bash
UPSTASH_REDIS_REST_URL=https://[instance].upstash.io
UPSTASH_REDIS_REST_TOKEN=[your-token]
```

**Never expose these values in client-side code or logs.**

### Upstash Redis Configuration

**Recommended Settings:**
- **Eviction Policy**: `allkeys-lru` (automatically remove least recently used keys)
- **Max Memory Policy**: Alert at 90% usage
- **TLS**: Enabled (required)
- **Region**: Same as Supabase instance (minimize latency)

## Additional Resources

- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [Redis Best Practices](https://redis.io/topics/best-practices)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Cache Invalidation Strategies](https://www.google.com/search?q=cache+invalidation+strategies)

## Support

For issues or questions:
1. Check this operations guide first
2. Review Upstash dashboard for service status
3. Check application logs in Supabase dashboard
4. Contact development team with diagnostic information
