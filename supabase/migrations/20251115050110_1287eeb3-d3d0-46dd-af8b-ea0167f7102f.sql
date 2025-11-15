-- Fix search_path for existing functions that don't have it set
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.get_user_roles(uuid) SET search_path = public;

-- Update Phase 4 objective
UPDATE phases 
SET objective = 'Implement BFF layer for optimized API aggregation, core business logic for transactions/budgets, and AI-powered insights using Lovable AI',
    story_points = 65,
    status = 'In Progress'
WHERE phase_number = 4;