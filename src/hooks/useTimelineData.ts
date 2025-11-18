import { useMemo } from 'react';
import { usePhases, useMilestones } from './useProjectData';

export function useTimelineData() {
  const phases = usePhases();
  const milestones = useMilestones();

  const currentWeek = 29; // Current week in the timeline (Phase 9 Step 1 - Week 29)
  const totalWeeks = 51; // Blueprint v4.2: 51 weeks with 16 phases - 677 SP total

  const timelineData = useMemo(() => {
    if (!phases.data) return null;

    return phases.data.map(phase => ({
      id: phase.id,
      name: phase.name,
      phaseNumber: phase.phase_number,
      startWeek: phase.start_week,
      endWeek: phase.end_week,
      duration: phase.duration_weeks,
      progress: phase.progress,
      status: phase.status,
      riskLevel: phase.risk_level,
      teamSize: phase.team_size,
      dependencies: phase.dependencies,
    }));
  }, [phases.data]);

  const criticalPath = useMemo(() => {
    if (!phases.data) return [];
    
    // Identify phases on the critical path (high risk or blocking dependencies)
    return phases.data
      .filter(phase => phase.risk_level === 'Critical' || phase.risk_level === 'High')
      .sort((a, b) => a.start_week - b.start_week);
  }, [phases.data]);

  const upcomingMilestones = useMemo(() => {
    if (!milestones.data) return [];
    
    return milestones.data
      .filter(m => m.week >= currentWeek && m.status !== 'Completed')
      .sort((a, b) => a.week - b.week)
      .slice(0, 5);
  }, [milestones.data, currentWeek]);

  return {
    phases: phases.data,
    milestones: milestones.data,
    timelineData,
    criticalPath,
    upcomingMilestones,
    currentWeek,
    totalWeeks,
    isLoading: phases.isLoading || milestones.isLoading,
    error: phases.error || milestones.error,
  };
}
