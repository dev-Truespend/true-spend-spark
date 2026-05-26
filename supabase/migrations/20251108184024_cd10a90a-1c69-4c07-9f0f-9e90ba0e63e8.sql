-- Add story_points column to phases table
ALTER TABLE phases 
ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;

COMMENT ON COLUMN phases.story_points IS 'Total story points for this phase';

-- Clear existing phases and insert correct 11-phase v4.1 structure
DELETE FROM phases;

INSERT INTO phases (
  phase_number, name, objective, start_week, end_week, 
  duration_weeks, status, risk_level, team_size, progress, 
  story_points, dependencies, created_at, updated_at
) VALUES
-- Phase 1: Foundation & Client Layer (Weeks 1-4)
(
  1, 
  'Foundation & Client Layer', 
  'Establish core infrastructure and client foundation (Layers 1, 15, 16: Client, Database, Storage)',
  1, 4, 4, 
  'In Progress', 'Medium', 6, 45, 34,
  '[]'::jsonb,
  NOW(), NOW()
),

-- Phase 2: Security & Ingress (Weeks 5-7)
(
  2, 
  'Security & Ingress', 
  'Implement security layers and request routing (Layers 2, 3, 4: Edge/Ingress, API Gateway, Modern Safety)',
  5, 7, 3, 
  'Not Started', 'High', 6, 0, 40,
  '["Phase 1"]'::jsonb,
  NOW(), NOW()
),

-- Phase 2.5: Geofencing Foundation 📍 (Weeks 8-10)
(
  3, 
  'Geofencing Foundation 📍', 
  'Native GPS tracking and geofence rules (Layers 1, 10, 15)',
  8, 10, 3, 
  'Not Started', 'Medium', 6, 0, 38,
  '["Phase 2"]'::jsonb,
  NOW(), NOW()
),

-- Phase 3: Auth & Supply Chain (Weeks 11-14)
(
  4, 
  'Auth & Supply Chain', 
  'Authentication and dependency security (Layers 5, 6)',
  11, 14, 4, 
  'Not Started', 'High', 6, 0, 48,
  '["Phase 2"]'::jsonb,
  NOW(), NOW()
),

-- Phase 4: Core Services (BFF, Logic, AI) (Weeks 15-19)
(
  5, 
  'Core Services (BFF, Logic, AI)', 
  'Core business logic and AI agents (Layers 7, 8, 9)',
  15, 19, 5, 
  'Not Started', 'Critical', 8, 0, 65,
  '["Phase 3"]'::jsonb,
  NOW(), NOW()
),

-- Phase 5: External Communication (Weeks 20-22)
(
  6, 
  'External Communication', 
  'External API integration (Layers 10, 11, 12)',
  20, 22, 3, 
  'Not Started', 'Medium', 5, 0, 42,
  '["Phase 4"]'::jsonb,
  NOW(), NOW()
),

-- Phase 5.5: Location Intelligence 🗺️ (Weeks 23-25)
(
  7, 
  'Location Intelligence 🗺️', 
  'AI-powered location insights (Layers 8, 9, 13, 14)',
  23, 25, 3, 
  'Not Started', 'Medium', 5, 0, 42,
  '["Phase 5"]'::jsonb,
  NOW(), NOW()
),

-- Phase 6: Messaging & Events (Weeks 26-28)
(
  8, 
  'Messaging & Events', 
  'Notification and event systems (Layers 13, 14)',
  26, 28, 3, 
  'Not Started', 'Medium', 5, 0, 38,
  '["Phase 4"]'::jsonb,
  NOW(), NOW()
),

-- Phase 7: Data Planes & DR (Weeks 29-32)
(
  9, 
  'Data Planes & DR', 
  'Data optimization and disaster recovery (Layers 17, 18, 19)',
  29, 32, 4, 
  'Not Started', 'High', 6, 0, 45,
  '["Phase 1"]'::jsonb,
  NOW(), NOW()
),

-- Phase 8: Observability & Polish (Weeks 33-34)
(
  10, 
  'Observability & Polish', 
  'System monitoring and optimization (Cross-cutting)',
  33, 34, 2, 
  'Not Started', 'Low', 8, 0, 28,
  '["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7"]'::jsonb,
  NOW(), NOW()
),

-- Phase 9: Browser Extension 🔌 (Weeks 35-37)
(
  11, 
  'Browser Extension 🔌', 
  'Browser extension companion (Layer 1B)',
  35, 37, 3, 
  'Not Started', 'Medium', 6, 0, 44,
  '["Phase 2", "Phase 4"]'::jsonb,
  NOW(), NOW()
);

-- Clear existing milestones and insert 6 key v4.1 milestones
DELETE FROM milestones;

INSERT INTO milestones (
  name, week, status, gate_requirements, created_at, updated_at
) VALUES
-- Milestone 1: Week 4 - Foundation Complete
(
  'Foundation Complete ✅',
  4,
  'Upcoming',
  '["Cloudflare and Supabase setup complete", "Database schema deployed", "Storage layer configured", "Client foundation working", "PWA capabilities enabled"]'::jsonb,
  NOW(), NOW()
),

-- Milestone 2: Week 10 - Geofencing Operational 📍
(
  'Geofencing Operational 📍',
  10,
  'Upcoming',
  '["Native GPS tracking active", "JWT location security implemented", "Geofence database tables deployed", "Event queue operational", "Entry/exit detection working"]'::jsonb,
  NOW(), NOW()
),

-- Milestone 3: Week 19 - Core Services Ready
(
  'Core Services Ready ⚙️',
  19,
  'Upcoming',
  '["BFF layer operational", "Transaction processing engine live", "Geofence rules engine working", "AI pattern analysis active", "AI location insights generating"]'::jsonb,
  NOW(), NOW()
),

-- Milestone 4: Week 25 - Location Intelligence Live 🗺️
(
  'Location Intelligence Live 🗺️',
  25,
  'Upcoming',
  '["Background geolocation active", "Merchant discovery functional", "AI location analysis working", "Location event bus operational", "Geofence notifications sending"]'::jsonb,
  NOW(), NOW()
),

-- Milestone 5: Week 34 - System Polish Complete
(
  'System Polish Complete 🎨',
  34,
  'Upcoming',
  '["Full observability stack deployed", "Performance dashboards live", "All layers optimized", "Production monitoring active", "System hardening complete"]'::jsonb,
  NOW(), NOW()
),

-- Milestone 6: Week 37 - Extension Launch 🔌
(
  'Extension Launch 🔌',
  37,
  'Upcoming',
  '["Extension core complete", "Ephemeral service worker working", "CORS and Bearer auth configured", "Realtime filtering active", "Privacy modal implemented", "Feature flags operational", "Telemetry system live", "Chrome/Firefox/Safari builds ready"]'::jsonb,
  NOW(), NOW()
);