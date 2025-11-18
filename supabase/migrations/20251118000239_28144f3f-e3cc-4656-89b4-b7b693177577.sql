-- Phase 8.4: Feature Flags & Service Registry Enhancement

-- Enhance feature_flags table with user targeting
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
ADD COLUMN IF NOT EXISTS target_users TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production', 'all')),
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create service registry table
CREATE TABLE IF NOT EXISTS service_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT UNIQUE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('edge_function', 'external_api', 'internal_service', 'database')),
  endpoint TEXT,
  status TEXT DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  last_health_check TIMESTAMPTZ,
  health_check_interval_seconds INTEGER DEFAULT 300,
  metadata JSONB DEFAULT '{}'::jsonb,
  dependencies TEXT[] DEFAULT ARRAY[]::TEXT[],
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create service health history table
CREATE TABLE IF NOT EXISTS service_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES service_registry(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create feature flag audit log
CREATE TABLE IF NOT EXISTS feature_flag_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('evaluated', 'enabled', 'disabled', 'updated', 'created', 'deleted')),
  previous_state JSONB,
  new_state JSONB,
  result BOOLEAN,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_service_registry_status ON service_registry(status);
CREATE INDEX IF NOT EXISTS idx_service_registry_type ON service_registry(service_type);
CREATE INDEX IF NOT EXISTS idx_service_health_history_service_checked ON service_health_history(service_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_flag_timestamp ON feature_flag_audit(flag_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_user_timestamp ON feature_flag_audit(user_id, timestamp DESC);

-- RLS Policies
ALTER TABLE service_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_audit ENABLE ROW LEVEL SECURITY;

-- Service registry policies (admin only for writes, authenticated users can read)
CREATE POLICY "Service registry readable by authenticated users"
  ON service_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service registry writable by admins"
  ON service_registry FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service health history policies
CREATE POLICY "Service health history readable by authenticated users"
  ON service_health_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service health history insertable by authenticated users"
  ON service_health_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Feature flag audit policies
CREATE POLICY "Feature flag audit readable by authenticated users"
  ON feature_flag_audit FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Feature flag audit insertable by authenticated users"
  ON feature_flag_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to evaluate feature flag for user
CREATE OR REPLACE FUNCTION evaluate_feature_flag(
  p_flag_name TEXT,
  p_user_id UUID,
  p_environment TEXT DEFAULT 'production'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flag RECORD;
  v_user_roles TEXT[];
  v_hash INTEGER;
  v_result BOOLEAN;
BEGIN
  -- Get flag details
  SELECT * INTO v_flag
  FROM feature_flags
  WHERE flag_name = p_flag_name
  AND (environment = p_environment OR environment = 'all')
  LIMIT 1;

  -- Flag doesn't exist or is disabled
  IF v_flag IS NULL OR NOT v_flag.enabled THEN
    RETURN false;
  END IF;

  -- Check user targeting
  IF array_length(v_flag.target_users, 1) > 0 THEN
    IF NOT (p_user_id::TEXT = ANY(v_flag.target_users)) THEN
      RETURN false;
    END IF;
  END IF;

  -- Check role targeting
  IF array_length(v_flag.target_roles, 1) > 0 THEN
    SELECT ARRAY_AGG(role::TEXT) INTO v_user_roles
    FROM user_roles
    WHERE user_id = p_user_id;

    IF v_user_roles IS NULL OR NOT (v_user_roles && v_flag.target_roles) THEN
      RETURN false;
    END IF;
  END IF;

  -- Check rollout percentage (deterministic based on user_id)
  IF v_flag.rollout_percentage < 100 THEN
    v_hash := abs(hashtext(p_user_id::TEXT || v_flag.flag_name));
    IF (v_hash % 100) >= v_flag.rollout_percentage THEN
      RETURN false;
    END IF;
  END IF;

  v_result := true;

  -- Log evaluation
  INSERT INTO feature_flag_audit (flag_id, user_id, action, result)
  VALUES (v_flag.id, p_user_id, 'evaluated', v_result);

  RETURN v_result;
END;
$$;

-- Function to cleanup old health history
CREATE OR REPLACE FUNCTION cleanup_old_health_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM service_health_history
  WHERE checked_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_feature_flag_audit()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only evaluation logs for 7 days, other actions for 90 days
  DELETE FROM feature_flag_audit
  WHERE (action = 'evaluated' AND timestamp < NOW() - INTERVAL '7 days')
     OR (action != 'evaluated' AND timestamp < NOW() - INTERVAL '90 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Trigger to update service_registry updated_at
CREATE OR REPLACE FUNCTION update_service_registry_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER service_registry_updated_at
  BEFORE UPDATE ON service_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_service_registry_updated_at();

-- Insert default services
INSERT INTO service_registry (service_name, service_type, endpoint, metadata) VALUES
  ('publish-event', 'edge_function', '/functions/v1/publish-event', '{"description": "Event publishing service"}'::jsonb),
  ('event-consumer', 'edge_function', '/functions/v1/event-consumer', '{"description": "Event consumption service"}'::jsonb),
  ('event-batch-processor', 'edge_function', '/functions/v1/event-batch-processor', '{"description": "Batch event processor"}'::jsonb),
  ('supabase-db', 'database', null, '{"description": "Primary PostgreSQL database"}'::jsonb)
ON CONFLICT (service_name) DO NOTHING;