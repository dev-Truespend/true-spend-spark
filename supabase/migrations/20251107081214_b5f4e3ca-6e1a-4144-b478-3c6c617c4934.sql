-- ============================================
-- TrueSpend v3.0 Project Dashboard Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  objective TEXT,
  duration_weeks INT NOT NULL,
  start_week INT NOT NULL,
  end_week INT NOT NULL,
  team_size INT,
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Blocked')) DEFAULT 'Not Started',
  progress INT CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
  dependencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  capacity_hours INT DEFAULT 40,
  skills JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES team_members(id),
  start_week INT,
  duration_weeks INT,
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'In Review', 'Blocked', 'Completed')) DEFAULT 'Not Started',
  progress INT CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
  priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
  dependencies JSONB DEFAULT '[]'::jsonb,
  success_criteria JSONB DEFAULT '[]'::jsonb,
  architecture_components JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. MILESTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  week INT NOT NULL,
  phase_id UUID REFERENCES phases(id),
  status TEXT CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Missed')) DEFAULT 'Upcoming',
  gate_requirements JSONB DEFAULT '[]'::jsonb,
  date_completed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. READINESS GATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS readiness_gates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  requirements JSONB NOT NULL,
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'Passed', 'Failed')) DEFAULT 'Not Started',
  date_passed TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. RISKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  probability TEXT CHECK (probability IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  impact TEXT CHECK (impact IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  risk_score INT GENERATED ALWAYS AS (
    CASE probability
      WHEN 'Low' THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'High' THEN 3
    END *
    CASE impact
      WHEN 'Low' THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'High' THEN 3
    END
  ) STORED,
  mitigation TEXT,
  status TEXT CHECK (status IN ('Identified', 'Monitoring', 'Mitigated', 'Realized')) DEFAULT 'Identified',
  owner_id UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. METRICS TABLE (Time-series)
-- ============================================
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DECIMAL(12,2),
  target DECIMAL(12,2),
  unit TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. TEST RESULTS TABLE (Time-series)
-- ============================================
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_type TEXT NOT NULL,
  test_suite TEXT,
  pass_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  coverage_percent DECIMAL(5,2),
  duration_seconds DECIMAL(10,2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. PROJECT METADATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. ARCHITECTURE COMPONENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS architecture_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layer_name TEXT NOT NULL,
  component_name TEXT NOT NULL,
  description TEXT,
  technology TEXT,
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Testing')) DEFAULT 'Not Started',
  implementation_progress INT CHECK (implementation_progress >= 0 AND implementation_progress <= 100) DEFAULT 0,
  related_tasks UUID[] DEFAULT ARRAY[]::UUID[],
  color_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(layer_name, component_name)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_milestones_phase_id ON milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_readiness_gates_phase_id ON readiness_gates(phase_id);
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_metrics_type_name ON metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_architecture_components_layer ON architecture_components(layer_name);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_readiness_gates_updated_at BEFORE UPDATE ON readiness_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_metadata_updated_at BEFORE UPDATE ON project_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architecture_components_updated_at BEFORE UPDATE ON architecture_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Disabled for now (public dashboard)
-- ============================================
-- For this project tracking dashboard, we'll keep it public
-- If you need user-specific access, enable RLS and add policies

ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_components ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (public dashboard)
CREATE POLICY "Allow all operations on phases" ON phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on readiness_gates" ON readiness_gates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on risks" ON risks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on metrics" ON metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on test_results" ON test_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on project_metadata" ON project_metadata FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on architecture_components" ON architecture_components FOR ALL USING (true) WITH CHECK (true);