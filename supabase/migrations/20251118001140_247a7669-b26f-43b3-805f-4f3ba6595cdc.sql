-- Phase 8.5: Workflow Orchestration Schema

-- Workflow definitions table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT UNIQUE NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  definition JSONB NOT NULL, -- Workflow steps and configuration
  enabled BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  workflow_version INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying')),
  trigger_type TEXT, -- manual, scheduled, event, webhook
  trigger_data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  context JSONB DEFAULT '{}'::jsonb, -- Shared data across steps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow step executions table
CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL, -- function, condition, parallel, wait
  step_index INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'retrying')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow schedule table
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  schedule_name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'UTC',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution_id ON workflow_step_executions(execution_id, step_index);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_enabled ON workflow_schedules(enabled, next_run_at) WHERE enabled = true;

-- RLS Policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Workflows readable by authenticated users
CREATE POLICY "Workflows readable by authenticated users"
  ON workflows FOR SELECT
  TO authenticated
  USING (true);

-- Workflows writable by admins
CREATE POLICY "Workflows writable by admins"
  ON workflows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Executions readable by authenticated users
CREATE POLICY "Executions readable by authenticated users"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (true);

-- Executions insertable by system
CREATE POLICY "Executions insertable by authenticated users"
  ON workflow_executions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Executions updatable by system
CREATE POLICY "Executions updatable by authenticated users"
  ON workflow_executions FOR UPDATE
  TO authenticated
  USING (true);

-- Step executions readable by authenticated users
CREATE POLICY "Step executions readable by authenticated users"
  ON workflow_step_executions FOR SELECT
  TO authenticated
  USING (true);

-- Step executions writable by system
CREATE POLICY "Step executions writable by authenticated users"
  ON workflow_step_executions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Schedules readable by authenticated users
CREATE POLICY "Schedules readable by authenticated users"
  ON workflow_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Schedules writable by admins
CREATE POLICY "Schedules writable by admins"
  ON workflow_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
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

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

CREATE TRIGGER workflow_schedules_updated_at
  BEFORE UPDATE ON workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

-- Function to cleanup old executions
CREATE OR REPLACE FUNCTION cleanup_old_workflow_executions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM workflow_executions
  WHERE completed_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed', 'cancelled');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable realtime for workflow tables
ALTER PUBLICATION supabase_realtime ADD TABLE workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_step_executions;

-- Insert example workflow
INSERT INTO workflows (workflow_name, description, definition) VALUES
  ('example-notification-workflow', 'Example workflow for sending notifications', 
   '{
     "steps": [
       {
         "name": "check-conditions",
         "type": "condition",
         "condition": "context.amount > 100",
         "onTrue": "send-notification",
         "onFalse": "skip"
       },
       {
         "name": "send-notification",
         "type": "function",
         "function": "send-push-notification",
         "input": {
           "title": "Large Transaction Alert",
           "body": "Transaction of ${{context.amount}} detected"
         }
       }
     ]
   }'::jsonb
  )
ON CONFLICT (workflow_name) DO NOTHING;