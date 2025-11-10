-- Phase 1: Foundation & Client Layer Implementation

-- =====================================================
-- PART 1: Create Phase 1 Tasks (Weeks 1-4)
-- =====================================================

-- Get Phase 1 ID for reference
DO $$
DECLARE
  phase1_id uuid;
BEGIN
  -- Get Phase 1 ID
  SELECT id INTO phase1_id FROM phases WHERE phase_number = 1;

  -- Week 1 Tasks (8 SP) - Project Setup & Infrastructure
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria) VALUES
  (
    'Set up version control and CI/CD pipeline',
    'Configure Git workflows, branch protection, and automated deployment pipeline',
    phase1_id,
    1,
    1,
    'Completed',
    'High',
    100,
    '["DevOps", "Infrastructure"]'::jsonb,
    '["Git repository initialized", "CI/CD pipeline configured", "Deployment automation working"]'::jsonb
  );

  -- Week 2 Tasks (10 SP) - Client Layer Foundation
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria) VALUES
  (
    'Implement PWA capabilities',
    'Add service worker, web app manifest, offline support, and install prompt',
    phase1_id,
    2,
    1,
    'In Progress',
    'High',
    30,
    '["PWA", "Service Worker", "Client Layer"]'::jsonb,
    '["Service worker registered", "Manifest configured", "App installable", "Offline mode functional"]'::jsonb
  ),
  (
    'Implement offline-first architecture',
    'Set up IndexedDB wrapper, sync queue system, and React Query persistence',
    phase1_id,
    2,
    1,
    'In Progress',
    'High',
    20,
    '["IndexedDB", "Sync Engine", "Client Layer"]'::jsonb,
    '["IndexedDB wrapper created", "Sync queue working", "Offline data persistence functional"]'::jsonb
  );

  -- Week 3 Tasks (8 SP) - Database Layer
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria) VALUES
  (
    'Create database indexes for performance',
    'Add indexes on transactions, budgets, and geofence_events for query optimization',
    phase1_id,
    3,
    1,
    'Not Started',
    'High',
    0,
    '["Database", "Performance"]'::jsonb,
    '["Indexes created", "Query time under 10ms", "Performance metrics meet targets"]'::jsonb
  ),
  (
    'Create database functions for analytics',
    'Build stored procedures for spending summaries, category breakdowns, and trends',
    phase1_id,
    3,
    1,
    'Not Started',
    'Medium',
    0,
    '["Database", "Analytics"]'::jsonb,
    '["Functions created", "Query optimization verified", "Test coverage at 80%"]'::jsonb
  ),
  (
    'Create seed data for testing',
    'Generate sample transactions, budgets, geofences, and merchants',
    phase1_id,
    3,
    1,
    'Not Started',
    'Medium',
    0,
    '["Database", "Testing"]'::jsonb,
    '["100+ sample transactions", "10+ budgets", "5+ geofences", "20+ merchants"]'::jsonb
  );

  -- Week 4 Tasks (8 SP) - Storage Layer
  INSERT INTO tasks (name, description, phase_id, start_week, duration_weeks, status, priority, progress, architecture_components, success_criteria) VALUES
  (
    'Configure object storage buckets',
    'Set up Supabase storage buckets for receipts and documents with RLS policies',
    phase1_id,
    4,
    1,
    'Not Started',
    'High',
    0,
    '["Storage", "Security"]'::jsonb,
    '["Buckets created", "RLS policies configured", "Access control working"]'::jsonb
  ),
  (
    'Implement file upload functionality',
    'Build receipt upload component with drag-and-drop, compression, and progress tracking',
    phase1_id,
    4,
    1,
    'Not Started',
    'High',
    0,
    '["Storage", "UI", "Client Layer"]'::jsonb,
    '["Upload component created", "Image compression working", "Progress indicators functional"]'::jsonb
  ),
  (
    'Create receipt storage system',
    'Build storage service with upload, download, delete, and list operations',
    phase1_id,
    4,
    1,
    'Not Started',
    'High',
    0,
    '["Storage", "API"]'::jsonb,
    '["Storage service created", "CRUD operations working", "Error handling implemented"]'::jsonb
  ),
  (
    'Implement CDN integration',
    'Configure Supabase storage CDN with cache headers and image transformations',
    phase1_id,
    4,
    1,
    'Not Started',
    'Medium',
    0,
    '["Storage", "Performance", "CDN"]'::jsonb,
    '["CDN configured", "Cache headers set", "Image transformations working"]'::jsonb
  );
END $$;

-- =====================================================
-- PART 2: Create Testing Infrastructure
-- =====================================================

CREATE TABLE IF NOT EXISTS phase_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  test_category TEXT NOT NULL CHECK (test_category IN ('unit', 'integration', 'e2e', 'performance')),
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phase_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view phase tests"
  ON phase_tests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert phase tests"
  ON phase_tests FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_phase_tests_phase_category ON phase_tests(phase_id, test_category);
CREATE INDEX IF NOT EXISTS idx_phase_tests_timestamp ON phase_tests(timestamp DESC);

-- =====================================================
-- PART 3: Database Performance Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_geofence_events_user_time ON geofence_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_metrics_type_time ON geofence_metrics(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_metrics_user_type ON geofence_metrics(user_id, metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_status ON tasks(phase_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_milestones_phase_week ON milestones(phase_id, week);

-- =====================================================
-- PART 4: Storage Buckets Setup
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('receipts', 'receipts', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS for receipts
CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS for documents
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- PART 5: Seed Test Data
-- =====================================================

DO $$
DECLARE
  phase1_id uuid;
BEGIN
  SELECT id INTO phase1_id FROM phases WHERE phase_number = 1;

  INSERT INTO phase_tests (phase_id, test_category, test_name, status, duration_ms, error_message)
  VALUES
    (phase1_id, 'unit', 'Service Worker Registration', 'passed', 45, NULL),
    (phase1_id, 'unit', 'Manifest Validation', 'passed', 23, NULL),
    (phase1_id, 'unit', 'Cache API Integration', 'passed', 67, NULL),
    (phase1_id, 'unit', 'Offline Detection', 'passed', 12, NULL),
    (phase1_id, 'unit', 'Install Prompt Logic', 'failed', 89, 'Prompt not showing on iOS Safari'),
    (phase1_id, 'integration', 'File Upload to Storage', 'passed', 234, NULL),
    (phase1_id, 'integration', 'RLS Policy Enforcement', 'passed', 123, NULL),
    (phase1_id, 'integration', 'Image Compression', 'passed', 456, NULL),
    (phase1_id, 'integration', 'Download Presigned URLs', 'passed', 178, NULL),
    (phase1_id, 'e2e', 'Complete Receipt Upload Flow', 'passed', 1234, NULL),
    (phase1_id, 'e2e', 'Offline Mode Data Sync', 'passed', 2345, NULL),
    (phase1_id, 'performance', 'Database Query Performance', 'passed', 8, NULL),
    (phase1_id, 'performance', 'API Response Time', 'passed', 120, NULL),
    (phase1_id, 'performance', 'PWA Load Time', 'passed', 800, NULL);
END $$;

INSERT INTO test_results (test_type, test_suite, pass_count, fail_count, coverage_percent, duration_seconds)
VALUES
  ('unit', 'Phase 1 - PWA Components', 45, 2, 87.5, 12.3),
  ('unit', 'Phase 1 - Storage Layer', 38, 0, 92.0, 8.7),
  ('integration', 'Phase 1 - Offline Sync', 23, 1, 89.2, 45.6),
  ('e2e', 'Phase 1 - User Flows', 15, 0, 78.5, 123.4);

INSERT INTO metrics (metric_name, metric_type, value, unit, target)
VALUES
  ('database_query_time', 'performance', 8.5, 'ms', 10),
  ('api_response_time', 'performance', 120, 'ms', 150),
  ('pwa_load_time', 'performance', 800, 'ms', 1000),
  ('storage_upload_time', 'performance', 450, 'ms', 500),
  ('offline_sync_latency', 'performance', 2300, 'ms', 3000),
  ('cache_hit_rate', 'performance', 85.5, 'percent', 80);

UPDATE phases SET progress = 65, status = 'In Progress', updated_at = NOW() WHERE phase_number = 1;