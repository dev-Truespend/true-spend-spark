# Hugging Face Integration - Production Ready

## Overview
The TrueSpend application now has a complete, production-ready Hugging Face integration for AI-powered OCR and transaction categorization. This integration provides both client-side and server-side capabilities with intelligent fallback chains and comprehensive monitoring.

## Architecture

### Three-Layer Implementation

#### Phase 1: Foundation Layer ✅
- **Dependencies**: `@huggingface/transformers` v3.3.1+
- **Service Infrastructure**: 
  - Type definitions (`types.ts`)
  - Model configurations (`models.ts`)
  - IndexedDB caching (`cache.ts`)
  - Client wrapper (`client.ts`)
  - Categorization service (`categorizer.ts`)
- **Feature Flags**: 3 flags for controlling HF behavior

#### Phase 2: Integration Layer ✅
- **Server-side Edge Functions**:
  - `huggingface-ocr-receipt`: Receipt text extraction via HF Inference API
  - `huggingface-categorize`: Transaction categorization via HF Inference API
- **Circuit Breaker**: Prevents cascading failures with configurable thresholds
- **Fallback Chains**: 
  - OCR: Lovable AI → HF API (configurable primary/fallback)
  - Categorization: Lovable AI → HF API → Rule-based

#### Phase 3: Admin/Monitoring Layer ✅
- **Dashboard**: `/dashboard/huggingface`
- **Real-time Monitoring**: Success rates, latency, request counts
- **Cache Management**: View stats, clear cache
- **Feature Flag Controls**: Toggle HF services dynamically
- **Activity Logs**: Recent API calls with success/failure indicators

## Production Readiness Checklist

### ✅ Core Functionality
- [x] Client-side categorization with Transformers.js
- [x] Server-side OCR with HF Inference API
- [x] Server-side categorization with HF Inference API
- [x] Model caching in IndexedDB (7-day expiry)
- [x] Response caching (24-hour expiry)
- [x] WebGPU acceleration when available

### ✅ Reliability
- [x] Circuit breaker pattern (5 failures = 1-minute cooldown)
- [x] Intelligent fallback chains
- [x] Authentication on all edge functions
- [x] Error handling and logging
- [x] Automatic cache cleanup

### ✅ Monitoring
- [x] Real-time success rate tracking
- [x] Latency monitoring (server and client)
- [x] Cache statistics
- [x] Activity logs in system_metrics table
- [x] Admin dashboard for visibility

### ✅ Control
- [x] Feature flags for runtime configuration
- [x] Admin UI for toggling services
- [x] Manual cache clearing
- [x] Circuit breaker status visibility

### ✅ Security
- [x] JWT authentication on edge functions
- [x] API key stored in Supabase secrets
- [x] User-specific data isolation
- [x] RLS policies respected

### ✅ Performance
- [x] Model download progress tracking
- [x] Batch processing support
- [x] Aggressive caching (models + responses)
- [x] WebGPU acceleration
- [x] Metrics tracking

## Configuration

### Feature Flags

1. **`hf_client_categorization_enabled`** (Default: OFF)
   - Enables browser-based categorization using Transformers.js
   - **Pros**: Reduces server load, no API costs, works offline
   - **Cons**: Initial model download (~50MB), requires modern browser
   - **Recommendation**: Enable for power users with good internet

2. **`hf_server_ocr_fallback`** (Default: OFF)
   - Uses HF Inference API as fallback when Lovable AI OCR fails
   - **Pros**: Improves reliability, maintains service continuity
   - **Cons**: Increases API usage and costs
   - **Recommendation**: Enable for production reliability

3. **`hf_primary_for_ocr`** (Default: OFF)
   - Makes HF Inference API the primary OCR service
   - **Pros**: Reduces dependency on Lovable AI
   - **Cons**: May have higher latency, uses API quota
   - **Recommendation**: Only enable if Lovable AI OCR is rate-limited

### Recommended Production Settings

For most users:
```
hf_client_categorization_enabled: OFF (optional, enable for offline support)
hf_server_ocr_fallback: ON (recommended for reliability)
hf_primary_for_ocr: OFF (use Lovable AI as primary)
```

For high-volume users:
```
hf_client_categorization_enabled: ON (reduce server load)
hf_server_ocr_fallback: ON (ensure continuity)
hf_primary_for_ocr: OFF (unless Lovable AI is rate-limited)
```

## API Costs

### Hugging Face Inference API
- **OCR (Donut model)**: ~$0.032 per 1000 requests
- **Categorization (BART)**: ~$0.016 per 1000 requests
- **Rate Limits**: 1000 requests/day (free tier)

### Cost Optimization
1. **Caching**: 24-hour response cache reduces duplicate requests
2. **Client-side**: Enable `hf_client_categorization_enabled` for zero-cost categorization
3. **Circuit Breaker**: Prevents excessive failed API calls
4. **Primary/Fallback**: Use HF only as fallback to minimize usage

## Monitoring

### Dashboard Location
Navigate to: **Admin Dashboard → Hugging Face**

### Key Metrics
- **Success Rate**: Should be >95% for production
- **Avg Latency**: OCR ~2-5s, Categorization ~500-1500ms
- **Cache Hit Rate**: Monitor via cache stats
- **Circuit Breaker Status**: Should stay "closed" normally

### Alerts
Monitor these conditions:
- Success rate drops below 90%
- Circuit breaker opens (indicates repeated failures)
- Cache size exceeds 100MB (may need cleanup)
- Latency spikes above 10s

## Usage Examples

### Client-side Categorization
```typescript
import { categorizeTransaction } from '@/services/huggingface/categorizer';

const result = await categorizeTransaction({
  merchantName: 'Whole Foods',
  description: 'Grocery shopping',
  amount: 125.50
});

console.log(result.category); // 'groceries'
console.log(result.confidence); // 0.95
```

### Server-side OCR
```typescript
const { data } = await supabase.functions.invoke('huggingface-ocr-receipt', {
  body: { imageUrl: 'https://...' }
});

console.log(data.rawText);
```

### Server-side Categorization
```typescript
const { data } = await supabase.functions.invoke('huggingface-categorize', {
  body: {
    merchantName: 'Starbucks',
    description: 'Coffee',
    amount: 5.75
  }
});

console.log(data.category); // 'dining'
```

## Troubleshooting

### Circuit Breaker Opens
**Symptom**: Service unavailable errors  
**Cause**: 5+ consecutive failures within circuit window  
**Solution**: 
1. Check HF API key validity
2. Verify network connectivity
3. Wait 1 minute for auto-retry
4. Check dashboard for error details

### High Latency
**Symptom**: OCR/categorization takes >10s  
**Cause**: Model cold start or HF API congestion  
**Solution**:
1. Enable caching (automatically enabled)
2. Consider client-side categorization
3. Monitor HF API status

### Cache Size Growing
**Symptom**: IndexedDB cache exceeds 100MB  
**Cause**: Many unique requests, models not expiring  
**Solution**:
1. Clear cache via admin dashboard
2. Reduce cache expiry times if needed
3. Enable automatic cleanup (runs on init)

## Production Status: ✅ READY

All three phases are complete and tested:
- ✅ Foundation infrastructure deployed
- ✅ Integration with fallbacks working
- ✅ Monitoring and controls available

### Remaining Steps for Launch
1. Set feature flags based on usage patterns
2. Monitor metrics for first 24 hours
3. Adjust fallback chains if needed
4. Set up alerts for circuit breaker events

### Known Limitations
1. Client-side models require ~50MB download on first use
2. Free HF API tier limited to 1000 requests/day
3. WebGPU not available in all browsers (graceful fallback to CPU)

## Support
- **Documentation**: This file + inline code comments
- **Dashboard**: `/dashboard/huggingface` for real-time monitoring
- **Logs**: Check `system_metrics` table for detailed API call history
