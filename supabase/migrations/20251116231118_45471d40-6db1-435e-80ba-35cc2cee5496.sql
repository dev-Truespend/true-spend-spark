-- Update Phase 1 to realistic 40% completion (NO PWA)
UPDATE phases 
SET progress = 40, 
    status = 'In Progress',
    objective = 'Client foundation with IndexedDB storage, React Query persistence, camera integration, and network monitoring (NO PWA service workers)',
    updated_at = now()
WHERE phase_number = 1;

-- Update Phase 3 to realistic 50% completion
UPDATE phases 
SET progress = 50, 
    status = 'In Progress',
    updated_at = now()
WHERE phase_number = 3;

-- Add comment for tracking
COMMENT ON TABLE phases IS 'Updated 2025-01-16: Phase 1 (40%) and Phase 3 (50%) reflect actual implementation without PWA. Phases 2,4,5 remain at 100%.';