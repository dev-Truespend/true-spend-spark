-- Step 1: Comprehensive Audit Logging System (Phase 9 - Week 29)

-- Create data_access_audit table
CREATE TABLE IF NOT EXISTS data_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  row_id UUID,
  ip_address_hash TEXT,
  user_agent TEXT,
  accessed_fields JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON data_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON data_access_audit(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON data_access_audit(timestamp DESC);

-- Enable RLS
ALTER TABLE data_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
  ON data_access_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own audit logs"
  ON data_access_audit FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert audit logs"
  ON data_access_audit FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO data_access_audit (
    user_id,
    table_name,
    operation,
    row_id,
    accessed_fields
  )
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW)
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE to_jsonb(OLD)
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_data_access();

DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_data_access();

DROP TRIGGER IF EXISTS audit_mfa_settings ON mfa_settings;
CREATE TRIGGER audit_mfa_settings
  AFTER INSERT OR UPDATE OR DELETE ON mfa_settings
  FOR EACH ROW EXECUTE FUNCTION audit_data_access();

DROP TRIGGER IF EXISTS audit_budgets ON budgets;
CREATE TRIGGER audit_budgets
  AFTER INSERT OR UPDATE OR DELETE ON budgets
  FOR EACH ROW EXECUTE FUNCTION audit_data_access();

-- Cleanup function (90-day retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM data_access_audit
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;