export interface Phase {
  id: string;
  phase_number: number;
  name: string;
  objective: string | null;
  duration_weeks: number;
  start_week: number;
  end_week: number;
  team_size: number | null;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  progress: number;
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  avatar_url: string | null;
  capacity_hours: number;
  skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  phase_id: string | null;
  name: string;
  description: string | null;
  owner_id: string | null;
  start_week: number | null;
  duration_weeks: number | null;
  status: 'Not Started' | 'In Progress' | 'In Review' | 'Blocked' | 'Completed';
  progress: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dependencies: string[];
  success_criteria: string[];
  architecture_components: string[];
  created_at: string;
  updated_at: string;
  owner?: TeamMember;
  phase?: Phase;
}

export interface Milestone {
  id: string;
  name: string;
  week: number;
  phase_id: string | null;
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Missed';
  gate_requirements: string[];
  date_completed: string | null;
  created_at: string;
  updated_at: string;
  phase?: Phase;
}

export interface ReadinessGate {
  id: string;
  phase_id: string;
  requirements: Record<string, boolean>;
  status: 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
  date_passed: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string | null;
  probability: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  risk_score: number;
  mitigation: string | null;
  status: 'Identified' | 'Monitoring' | 'Mitigated' | 'Realized';
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: TeamMember;
}

export interface Metric {
  id: string;
  metric_type: string;
  metric_name: string;
  value: number;
  target: number | null;
  unit: string | null;
  timestamp: string;
}

export interface TestResult {
  id: string;
  test_type: string;
  test_suite: string | null;
  pass_count: number;
  fail_count: number;
  coverage_percent: number | null;
  duration_seconds: number | null;
  timestamp: string;
}

export interface ProjectMetadata {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}

export interface ArchitectureComponent {
  id: string;
  layer_name: string;
  component_name: string;
  description: string | null;
  technology: string | null;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Testing';
  implementation_progress: number;
  related_tasks: string[];
  color_code: string | null;
  created_at: string;
  updated_at: string;
}
