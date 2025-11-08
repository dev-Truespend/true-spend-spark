-- Update project metadata for v4.2
UPDATE project_metadata 
SET value = '"4.2"'::jsonb 
WHERE key = 'blueprint_version';

UPDATE project_metadata 
SET value = '48'::jsonb 
WHERE key = 'total_weeks';

UPDATE project_metadata 
SET value = '587'::jsonb 
WHERE key = 'total_story_points';

-- Add Phase 12: Performance Optimization (Weeks 38-40)
INSERT INTO phases (phase_number, name, objective, duration_weeks, start_week, end_week, team_size, risk_level, status, progress, story_points, dependencies)
VALUES (
  12,
  'Performance Optimization',
  'Implement GraphQL BFF, read replicas, multi-tier cache (L1/L2/L3), request deduplication, and response compression',
  3,
  38,
  40,
  4,
  'Medium',
  'Not Started',
  0,
  52,
  '["Phase 11"]'::jsonb
);

-- Add Phase 13: ML Infrastructure (Weeks 41-43)
INSERT INTO phases (phase_number, name, objective, duration_weeks, start_week, end_week, team_size, risk_level, status, progress, story_points, dependencies)
VALUES (
  13,
  'ML Infrastructure',
  'Deploy model registry, A/B testing framework, RL-based caching, LSTM anomaly detection, collaborative filtering',
  3,
  41,
  43,
  5,
  'High',
  'Not Started',
  0,
  48,
  '["Phase 12"]'::jsonb
);

-- Add Phase 14: Advanced ML & Layer 10B (Weeks 44-46)
INSERT INTO phases (phase_number, name, objective, duration_weeks, start_week, end_week, team_size, risk_level, status, progress, story_points, dependencies)
VALUES (
  14,
  'Advanced ML & Layer 10B',
  'Deploy MAB budget allocation, LambdaMART ranking, Prophet forecasting, and Deals & Cashback Gateway (Impact, CJ, Rakuten)',
  3,
  44,
  46,
  6,
  'High',
  'Not Started',
  0,
  56,
  '["Phase 13"]'::jsonb
);

-- Add Phase 15: Cost Optimization & Polish (Weeks 47-48)
INSERT INTO phases (phase_number, name, objective, duration_weeks, start_week, end_week, team_size, risk_level, status, progress, story_points, dependencies)
VALUES (
  15,
  'Cost Optimization & Polish',
  'Implement R-Tree indexes, Bloom filters, Gorilla compression, data partitioning, adaptive batching, CDN prewarming',
  2,
  47,
  48,
  4,
  'Medium',
  'Not Started',
  0,
  28,
  '["Phase 14"]'::jsonb
);

-- Add Layer 10B architecture components
INSERT INTO architecture_components (layer_name, component_name, description, technology, status, implementation_progress, color_code)
VALUES 
  ('Layer 10B: Deals & Cashback Gateway', 'OffersService', 'Unified interface for affiliate networks', 'TypeScript', 'Not Started', 0, '#ec4899'),
  ('Layer 10B: Deals & Cashback Gateway', 'Impact Adapter', 'Impact Radius integration adapter', 'TypeScript', 'Not Started', 0, '#ec4899'),
  ('Layer 10B: Deals & Cashback Gateway', 'CJ Adapter', 'Commission Junction adapter', 'TypeScript', 'Not Started', 0, '#ec4899'),
  ('Layer 10B: Deals & Cashback Gateway', 'Rakuten Adapter', 'Rakuten Advertising adapter', 'TypeScript', 'Not Started', 0, '#ec4899'),
  ('Layer 10B: Deals & Cashback Gateway', 'Capital One Adapter', 'Capital One Shopping adapter', 'TypeScript', 'Not Started', 0, '#ec4899'),
  ('Layer 10B: Deals & Cashback Gateway', 'Attribution Tracking', 'Click tracking and fraud prevention', 'TypeScript + PostgreSQL', 'Not Started', 0, '#ec4899');

-- Update existing layers with v4.2 enhancements
UPDATE architecture_components
SET description = description || ' | v4.2: Request deduplication, L1 cache, delta sync, lazy loading'
WHERE layer_name = 'Layer 1: Client Layer';

UPDATE architecture_components
SET description = 'GraphQL Gateway with DataLoader batching and field-level caching | v4.2 upgrade',
    technology = 'GraphQL + DataLoader'
WHERE layer_name = 'Layer 7: BFF Layer' AND component_name = 'GraphQL Gateway';

UPDATE architecture_components
SET description = description || ' | v4.2: Multi-tier cache (L1/L2/L3), RL-based admission, 93% hit rate'
WHERE layer_name = 'Layer 10: Egress Gateway & Cache';

UPDATE architecture_components
SET description = description || ' | v4.2: Read replicas, R-Tree indexes, Bloom filters, Gorilla compression'
WHERE layer_name = 'Layer 15: Database';

-- Add new v4.2 milestones
INSERT INTO milestones (name, week, phase_id, status, gate_requirements)
VALUES 
  ('Performance Foundation Ready', 40, (SELECT id FROM phases WHERE phase_number = 12), 'Upcoming', '[
    "GraphQL BFF deployed and tested",
    "Read replicas operational",
    "Cache hit rate >90%",
    "API latency <100ms p95"
  ]'::jsonb),
  ('ML Infrastructure Complete', 43, (SELECT id FROM phases WHERE phase_number = 13), 'Upcoming', '[
    "Model registry deployed",
    "RL cache in production",
    "LSTM anomaly detection live",
    "A/B testing framework operational"
  ]'::jsonb),
  ('Revenue Integration Live', 46, (SELECT id FROM phases WHERE phase_number = 14), 'Upcoming', '[
    "Layer 10B deployed",
    "First affiliate conversion tracked",
    "LambdaMART ranking live",
    "Prophet forecasting active"
  ]'::jsonb),
  ('v4.2 Launch Ready', 48, (SELECT id FROM phases WHERE phase_number = 15), 'Upcoming', '[
    "All 27 optimizations deployed",
    "Cost reduction verified (>50%)",
    "Performance targets met",
    "Revenue >$5k/month"
  ]'::jsonb);