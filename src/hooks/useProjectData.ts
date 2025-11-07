import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Phase, Task, TeamMember, Milestone, Risk, ArchitectureComponent } from "@/lib/types/dashboard";

export function usePhases() {
  return useQuery({
    queryKey: ["phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phases")
        .select("*")
        .order("phase_number");
      
      if (error) throw error;
      return data as Phase[];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          owner:team_members(*),
          phase:phases(*)
        `)
        .order("created_at");
      
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as TeamMember[];
    },
  });
}

export function useMilestones() {
  return useQuery({
    queryKey: ["milestones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select(`
          *,
          phase:phases(*)
        `)
        .order("week");
      
      if (error) throw error;
      return data as Milestone[];
    },
  });
}

export function useRisks() {
  return useQuery({
    queryKey: ["risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risks")
        .select(`
          *,
          owner:team_members(*)
        `)
        .order("risk_score", { ascending: false });
      
      if (error) throw error;
      return data as Risk[];
    },
  });
}

export function useArchitectureComponents() {
  return useQuery({
    queryKey: ["architecture_components"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("architecture_components")
        .select("*")
        .order("layer_name");
      
      if (error) throw error;
      return data as ArchitectureComponent[];
    },
  });
}

export function useProjectOverview() {
  const phases = usePhases();
  const tasks = useTasks();
  const milestones = useMilestones();

  const currentWeek = 5; // This should be calculated based on project start date
  const totalWeeks = 28;

  const overallProgress = phases.data
    ? Math.round(
        phases.data.reduce((sum, phase) => sum + phase.progress, 0) / phases.data.length
      )
    : 0;

  const currentPhase = phases.data?.find(
    (phase) => phase.start_week <= currentWeek && phase.end_week >= currentWeek
  );

  const upcomingMilestones = milestones.data
    ?.filter((m) => m.week >= currentWeek && m.status !== 'Completed')
    .slice(0, 3);

  const taskStats = {
    total: tasks.data?.length || 0,
    completed: tasks.data?.filter((t) => t.status === 'Completed').length || 0,
    inProgress: tasks.data?.filter((t) => t.status === 'In Progress').length || 0,
    blocked: tasks.data?.filter((t) => t.status === 'Blocked').length || 0,
  };

  return {
    currentWeek,
    totalWeeks,
    overallProgress,
    currentPhase,
    upcomingMilestones,
    taskStats,
    isLoading: phases.isLoading || tasks.isLoading || milestones.isLoading,
  };
}
