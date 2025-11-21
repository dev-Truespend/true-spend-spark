-- Data retention and cleanup policies

-- Function to cleanup old OCR logs and cost tracking
CREATE OR REPLACE FUNCTION cleanup_old_ocr_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cost_tracking_deleted INTEGER;
  queue_deleted INTEGER;
  batch_analytics_deleted INTEGER;
  anomaly_patterns_deleted INTEGER;
  result JSONB;
BEGIN
  -- Delete cost tracking older than 90 days
  DELETE FROM google_vision_cost_tracking
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS cost_tracking_deleted = ROW_COUNT;

  -- Delete completed/failed queue items older than 30 days
  DELETE FROM ocr_processing_queue
  WHERE status IN ('completed', 'failed')
    AND processing_completed_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS queue_deleted = ROW_COUNT;

  -- Delete batch analytics older than 180 days
  DELETE FROM ocr_batch_analytics
  WHERE created_at < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS batch_analytics_deleted = ROW_COUNT;

  -- Delete resolved anomaly patterns older than 30 days
  DELETE FROM ocr_anomaly_patterns
  WHERE resolved = true
    AND resolved_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS anomaly_patterns_deleted = ROW_COUNT;

  result := jsonb_build_object(
    'timestamp', NOW(),
    'deleted', jsonb_build_object(
      'cost_tracking', cost_tracking_deleted,
      'queue_items', queue_deleted,
      'batch_analytics', batch_analytics_deleted,
      'anomaly_patterns', anomaly_patterns_deleted
    ),
    'total_deleted', cost_tracking_deleted + queue_deleted + batch_analytics_deleted + anomaly_patterns_deleted
  );

  RETURN result;
END;
$$;

-- Operational metrics view
CREATE OR REPLACE VIEW ocr_operational_metrics AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  ROUND(AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100, 2) as success_rate,
  SUM(estimated_cost_usd) as total_cost,
  AVG(estimated_cost_usd) as avg_cost_per_request,
  COUNT(DISTINCT user_id) as unique_users
FROM google_vision_cost_tracking
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;

-- User tier summary view
CREATE OR REPLACE VIEW ocr_user_tier_summary AS
SELECT
  tier,
  COUNT(*) as user_count,
  AVG(daily_cost_limit) as avg_daily_limit,
  AVG(hourly_request_limit) as avg_hourly_limit,
  SUM(monthly_request_limit) as total_monthly_capacity
FROM user_tier_config
GROUP BY tier;

-- Real-time queue status view
CREATE OR REPLACE VIEW ocr_queue_status AS
SELECT
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries,
  MIN(created_at) as oldest_item,
  MAX(created_at) as newest_item
FROM ocr_processing_queue
WHERE status != 'completed'
GROUP BY status;

-- System health dashboard view
CREATE OR REPLACE VIEW ocr_system_health AS
SELECT
  'last_hour' as timeframe,
  COUNT(*) as total_requests,
  ROUND(AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100, 2) as success_rate,
  SUM(estimated_cost_usd) as total_cost,
  COUNT(DISTINCT user_id) as active_users,
  (SELECT COUNT(*) FROM ocr_processing_queue WHERE status = 'pending') as pending_queue,
  (SELECT COUNT(*) FROM ocr_anomaly_patterns WHERE NOT resolved) as active_anomalies
FROM google_vision_cost_tracking
WHERE created_at > NOW() - INTERVAL '1 hour';

COMMENT ON VIEW ocr_operational_metrics IS 'Hourly operational metrics for the past 7 days';
COMMENT ON VIEW ocr_user_tier_summary IS 'Summary of user tier distribution and limits';
COMMENT ON VIEW ocr_queue_status IS 'Real-time status of the OCR processing queue';
COMMENT ON VIEW ocr_system_health IS 'Real-time system health indicators';

-- Grant access to views
GRANT SELECT ON ocr_operational_metrics TO authenticated;
GRANT SELECT ON ocr_user_tier_summary TO authenticated;
GRANT SELECT ON ocr_queue_status TO authenticated;
GRANT SELECT ON ocr_system_health TO authenticated;