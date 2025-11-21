-- Documentation Unification Migration
-- Add story_points column and update Phase 13 status

-- Step 1: Add story_points column to phases table
ALTER TABLE public.phases 
ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;

-- Step 2: Update story points for all 16 phases (from SSOT: implementation-timeline-v4.2.md)
UPDATE public.phases SET story_points = 34 WHERE phase_number = 1;  -- Foundation
UPDATE public.phases SET story_points = 40 WHERE phase_number = 2;  -- Security & Ingress
UPDATE public.phases SET story_points = 38 WHERE phase_number = 3;  -- Geofencing
UPDATE public.phases SET story_points = 48 WHERE phase_number = 4;  -- Auth & Supply Chain
UPDATE public.phases SET story_points = 65 WHERE phase_number = 5;  -- Core Services
UPDATE public.phases SET story_points = 42 WHERE phase_number = 6;  -- External Communication
UPDATE public.phases SET story_points = 42 WHERE phase_number = 7;  -- Location Intelligence
UPDATE public.phases SET story_points = 38 WHERE phase_number = 8;  -- Messaging & Events
UPDATE public.phases SET story_points = 45 WHERE phase_number = 9;  -- Data Planes & DR
UPDATE public.phases SET story_points = 28 WHERE phase_number = 10; -- Observability
UPDATE public.phases SET story_points = 44 WHERE phase_number = 11; -- Browser Extension
UPDATE public.phases SET story_points = 53 WHERE phase_number = 12; -- Native Mobile Apps
UPDATE public.phases SET story_points = 45 WHERE phase_number = 13; -- Performance Optimization
UPDATE public.phases SET story_points = 38 WHERE phase_number = 14; -- ML Infrastructure
UPDATE public.phases SET story_points = 42 WHERE phase_number = 15; -- Advanced ML & Revenue
UPDATE public.phases SET story_points = 26 WHERE phase_number = 16; -- Cost Optimization

-- Step 3: Update Phase 13 from 0% to 40% (partial implementation discovered)
UPDATE public.phases 
SET 
  progress = 40,
  status = 'In Progress',
  updated_at = now()
WHERE phase_number = 13;

-- Step 4: Update project metadata for current week
UPDATE public.project_metadata
SET value = '35'
WHERE key = 'currentWeek';

-- If currentWeek doesn't exist, insert it
INSERT INTO public.project_metadata (key, value)
VALUES ('currentWeek', '35')
ON CONFLICT (key) DO UPDATE SET value = '35';

-- Step 5: Add metadata for total story points
INSERT INTO public.project_metadata (key, value)
VALUES ('totalStoryPoints', '677')
ON CONFLICT (key) DO UPDATE SET value = '677';

-- Step 6: Add notes about Phase 13 partial implementation
COMMENT ON COLUMN phases.story_points IS 'Story points for the phase (total: 677 SP across 16 phases)';

-- Verification queries (commented out - for manual verification)
-- SELECT phase_number, name, progress, status, story_points FROM phases ORDER BY phase_number;
-- SELECT SUM(story_points) as total_sp FROM phases;
-- SELECT * FROM project_metadata WHERE key IN ('currentWeek', 'totalStoryPoints');