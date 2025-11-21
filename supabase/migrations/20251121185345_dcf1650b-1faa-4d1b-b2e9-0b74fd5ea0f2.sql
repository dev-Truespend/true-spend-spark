-- IP-based abuse tracking and detection
CREATE TABLE IF NOT EXISTS ocr_abuse_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address_hash TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 1,
  suspicious_patterns JSONB DEFAULT '[]'::jsonb,
  anomaly_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  blocked_until TIMESTAMP WITH TIME ZONE,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OCR anomaly patterns detection
CREATE TABLE IF NOT EXISTS ocr_anomaly_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  detection_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  pattern_data JSONB NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Request signatures for replay attack prevention
CREATE TABLE IF NOT EXISTS ocr_request_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_abuse_tracking_ip ON ocr_abuse_tracking(ip_address_hash, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_tracking_user ON ocr_abuse_tracking(user_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_patterns_user ON ocr_anomaly_patterns(user_id, detection_time DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_patterns_unresolved ON ocr_anomaly_patterns(resolved, detection_time DESC) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_request_signatures_expires ON ocr_request_signatures(expires_at);

-- Enable RLS
ALTER TABLE ocr_abuse_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_anomaly_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_request_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage abuse tracking"
  ON ocr_abuse_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their own anomaly patterns"
  ON ocr_anomaly_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage anomaly patterns"
  ON ocr_anomaly_patterns FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage request signatures"
  ON ocr_request_signatures FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Cleanup expired request signatures
CREATE OR REPLACE FUNCTION cleanup_expired_request_signatures()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ocr_request_signatures
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to detect anomalies
CREATE OR REPLACE FUNCTION detect_ocr_anomalies(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_requests INTEGER;
  hourly_avg DECIMAL;
  cost_spike BOOLEAN := FALSE;
  rapid_requests BOOLEAN := FALSE;
  anomalies JSONB := '[]'::jsonb;
BEGIN
  -- Check for rapid request patterns (>20 requests in 5 minutes)
  SELECT COUNT(*) INTO recent_requests
  FROM google_vision_cost_tracking
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '5 minutes';

  IF recent_requests > 20 THEN
    rapid_requests := TRUE;
    anomalies := anomalies || jsonb_build_object(
      'type', 'rapid_requests',
      'severity', 'high',
      'details', jsonb_build_object('count', recent_requests, 'timeframe', '5 minutes')
    );
  END IF;

  -- Check for unusual cost spikes
  SELECT AVG(hourly_cost) INTO hourly_avg
  FROM (
    SELECT DATE_TRUNC('hour', created_at) as hour,
           SUM(estimated_cost_usd) as hourly_cost
    FROM google_vision_cost_tracking
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY hour
  ) AS hourly_costs;

  IF hourly_avg IS NOT NULL THEN
    DECLARE
      current_hour_cost DECIMAL;
    BEGIN
      SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO current_hour_cost
      FROM google_vision_cost_tracking
      WHERE user_id = p_user_id
        AND created_at > DATE_TRUNC('hour', NOW());

      IF current_hour_cost > (hourly_avg * 3) THEN
        cost_spike := TRUE;
        anomalies := anomalies || jsonb_build_object(
          'type', 'cost_spike',
          'severity', 'medium',
          'details', jsonb_build_object(
            'current_cost', current_hour_cost,
            'average_cost', hourly_avg,
            'spike_factor', ROUND(current_hour_cost / NULLIF(hourly_avg, 0), 2)
          )
        );
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'timestamp', NOW(),
    'anomalies_detected', jsonb_array_length(anomalies) > 0,
    'anomalies', anomalies
  );
END;
$$;