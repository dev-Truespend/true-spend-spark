-- Phase 4 Tasks and Milestones

-- First, get the Phase 4 ID
DO $$
DECLARE
  phase4_id uuid;
BEGIN
  SELECT id INTO phase4_id FROM phases WHERE phase_number = 4;

  -- Insert Phase 4 Tasks
  INSERT INTO tasks (name, description, phase_id, status, progress, priority, start_week, duration_weeks) VALUES
  -- BFF Layer (3 tasks)
  ('Implement BFF Dashboard Endpoint', 'Create aggregated dashboard endpoint in BFF layer', phase4_id, 'Completed', 100, 'High', 13, 1),
  ('Add Response Caching Layer', 'Implement caching for BFF responses to improve performance', phase4_id, 'In Progress', 70, 'High', 14, 1),
  ('API Aggregation Performance Testing', 'Test and optimize BFF aggregation performance', phase4_id, 'Not Started', 0, 'Medium', 15, 1),
  
  -- Business Logic (4 tasks)
  ('Transaction Processing Engine', 'Core transaction processing with geofence matching', phase4_id, 'Completed', 100, 'Critical', 13, 2),
  ('Transaction Rules Engine', 'Build rules engine for automated transaction categorization', phase4_id, 'Not Started', 0, 'High', 17, 2),
  ('Budget Management System', 'Implement budget creation, tracking, and alerts', phase4_id, 'In Progress', 60, 'High', 15, 2),
  ('Alert Threshold Logic', 'Build alerting system for budget thresholds', phase4_id, 'Not Started', 0, 'Medium', 18, 1),
  
  -- AI Services (3 tasks)
  ('AI Transaction Categorization', 'ML-powered transaction categorization service', phase4_id, 'Completed', 100, 'Critical', 14, 2),
  ('AI Spending Analysis', 'Implement AI-based spending pattern analysis', phase4_id, 'Completed', 100, 'High', 15, 2),
  ('Anomaly Detection System', 'Build ML anomaly detection for unusual transactions', phase4_id, 'Not Started', 0, 'Medium', 18, 2),
  
  -- Frontend Integration (2 tasks)
  ('Transactions Page with AI Features', 'Frontend page for transaction management with AI categorization', phase4_id, 'Completed', 100, 'High', 16, 1),
  ('Budgets & Insights Dashboard', 'User-facing budgets and AI insights pages', phase4_id, 'Completed', 100, 'High', 17, 1);

  -- Insert Phase 4 Milestones
  INSERT INTO milestones (name, week, phase_id, status, gate_requirements) VALUES
  ('BFF Layer Operational', 16, phase4_id, 'Completed', '["BFF dashboard endpoint live", "Response caching implemented", "Performance tests passed"]'::jsonb),
  ('Core Business Logic Complete', 17, phase4_id, 'In Progress', '["Transaction processing complete", "Budget management operational", "Rules engine functional"]'::jsonb),
  ('AI Services Integrated', 19, phase4_id, 'Upcoming', '["AI categorization live", "Spending analysis deployed", "Anomaly detection active", "Phase Gate Review"]'::jsonb);

  -- Update Phase 4 progress to 58% (7 of 12 tasks completed)
  UPDATE phases 
  SET 
    progress = 58,
    status = 'In Progress'
  WHERE phase_number = 4;

END $$;