import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTimelineData } from "@/hooks/useTimelineData";
import { Calendar, Clock, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { MermaidGantt } from "@/components/timeline/MermaidGantt";

export default function Timeline() {
  const { phases, milestones, currentWeek, totalWeeks, isLoading } = useTimelineData();

  const completedPhases = phases?.filter(p => p.status === 'Completed').length || 0;
  const inProgressPhases = phases?.filter(p => p.status === 'In Progress').length || 0;
  const upcomingMilestones = milestones?.filter(m => m.status === 'Upcoming').slice(0, 3) || [];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'High':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Implementation Timeline</h1>
        <p className="text-muted-foreground mt-2">
          v4.0: 28-week implementation plan with 8 phases covering 19 architecture layers
        </p>
      </div>

      {/* Timeline Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentWeek} / {totalWeeks}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((currentWeek / totalWeeks) * 100)}% through timeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPhases}</div>
            <p className="text-xs text-muted-foreground">
              Phases completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressPhases}</div>
            <p className="text-xs text-muted-foreground">
              Active phases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phases && phases.length > 0 
                ? Math.round(phases.reduce((sum, p) => sum + p.progress, 0) / phases.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mermaid Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline Gantt Chart</CardTitle>
          <CardDescription>
            Visual representation of the v4.0 implementation timeline with all phases and key milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MermaidGantt chart={`gantt
    title TrueSpend: Production-Ready Build Timeline (0-100k Users)
    dateFormat YYYY-MM-DD
    axisFormat Week %W
    
    section Phase 0: Foundation
    Project Setup & Config           :done, p0_1, 2025-01-01, 7d
    Lovable Cloud Enable            :done, p0_2, 2025-01-01, 2d
    Environment Variables Setup     :done, p0_3, 2025-01-03, 2d
    Schema Governance Framework     :active, p0_4, 2025-01-05, 3d
    Phase 0 Testing & Docs         :milestone, p0_m, 2025-01-08, 0d
    
    section Phase 1: Data & Auth
    Data Plane-A Design            :p1_1, after p0_m, 7d
    Users Table + RLS              :p1_2, after p1_1, 3d
    Profiles Table + Encryption    :p1_3, after p1_2, 3d
    Transactions Table + RLS       :p1_4, after p1_3, 4d
    Accounts Table + RLS           :p1_5, after p1_4, 3d
    Data Plane-B Design            :p1_6, after p1_5, 4d
    Auth System Setup              :p1_7, after p1_6, 5d
    Google OAuth Integration       :p1_8, after p1_7, 3d
    Phase 1 Security Audit         :milestone, p1_m, after p1_8, 0d
    
    section Phase 2: External Services
    Plaid Integration Design       :p2_1, after p1_m, 5d
    Plaid/Edge Functions           :p2_2, after p2_1, 7d
    Stripe Integration             :p2_3, after p2_2, 5d
    SMS/Twilio Setup              :p2_4, after p2_3, 4d
    External Services Testing      :milestone, p2_m, after p2_4, 0d
    
    section Phase 3: Core Features
    Transaction Processing         :p3_1, after p2_m, 7d
    Budget Management             :p3_2, after p3_1, 5d
    Analytics Engine              :p3_3, after p3_2, 6d
    Notification System           :p3_4, after p3_3, 4d
    Core Features Integration     :milestone, p3_m, after p3_4, 0d
    
    section Phase 4: UI/UX
    Dashboard UI                  :p4_1, after p3_m, 7d
    Transaction Views             :p4_2, after p4_1, 5d
    Budget Interface              :p4_3, after p4_2, 5d
    Mobile Responsive Design      :p4_4, after p4_3, 5d
    UI/UX Review                  :milestone, p4_m, after p4_4, 0d
    
    section Phase 5: Security & Performance
    RLS Policies (All Tables)     :p5_1, after p4_m, 7d
    Performance Optimization      :p5_2, after p5_1, 5d
    Security Hardening            :p5_3, after p5_2, 5d
    Load Testing                  :p5_4, after p5_3, 4d
    Security Audit                :milestone, p5_m, after p5_4, 0d
    
    section Phase 6: Testing & QA
    Integration Testing           :p6_1, after p5_m, 7d
    User Acceptance Testing       :p6_2, after p6_1, 5d
    Bug Fixes & Refinement        :p6_3, after p6_2, 7d
    Final QA Review               :milestone, p6_m, after p6_3, 0d
    
    section Phase 7: Launch Prep
    Documentation Complete        :p7_1, after p6_m, 5d
    Deployment Pipeline           :p7_2, after p7_1, 4d
    Monitoring & Alerts           :p7_3, after p7_2, 4d
    Production Launch             :milestone, p7_m, after p7_3, 0d`} />
        </CardContent>
      </Card>

      {/* Visual Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Overview</CardTitle>
          <CardDescription>
            28-week phase progress bars with current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Week markers */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Week 0</span>
              <span>Week 7</span>
              <span>Week 14</span>
              <span>Week 21</span>
              <span>Week 28</span>
            </div>
            
            {/* Timeline bars */}
            <div className="space-y-2">
              {phases?.sort((a, b) => a.phase_number - b.phase_number).map((phase) => {
                const barWidth = (phase.duration_weeks / totalWeeks) * 100;
                const barStart = (phase.start_week / totalWeeks) * 100;
                
                return (
                  <div key={phase.id} className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium w-32 truncate">
                        Phase {phase.phase_number}: {phase.name}
                      </span>
                      <Badge variant={getStatusVariant(phase.status)} className="text-xs">
                        {phase.status}
                      </Badge>
                    </div>
                    <div className="h-8 bg-muted rounded-lg relative overflow-hidden">
                      <div
                        className={`absolute h-full rounded-lg transition-all ${
                          phase.status === 'Completed' 
                            ? 'bg-green-500' 
                            : phase.status === 'In Progress'
                            ? 'bg-blue-500'
                            : phase.status === 'Blocked'
                            ? 'bg-red-500'
                            : 'bg-muted-foreground/20'
                        }`}
                        style={{
                          left: `${barStart}%`,
                          width: `${barWidth}%`,
                        }}
                      >
                        <div className="h-full flex items-center justify-center text-xs font-medium text-white">
                          {phase.progress}%
                        </div>
                      </div>
                      {currentWeek >= phase.start_week && currentWeek <= phase.end_week && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                          style={{ left: `${(currentWeek / totalWeeks) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current week indicator */}
            <div className="relative h-1 bg-muted rounded">
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary rounded-full -mt-1"
                style={{ left: `${(currentWeek / totalWeeks) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>
              Next major milestones in the implementation timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMilestones.map((milestone) => (
                <div key={milestone.id} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{milestone.name}</h4>
                    <p className="text-sm text-muted-foreground">Week {milestone.week}</p>
                    {milestone.gate_requirements && Array.isArray(milestone.gate_requirements) && (
                      <ul className="mt-2 space-y-1">
                        {(milestone.gate_requirements as string[]).map((req, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Badge variant="outline">{milestone.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Details */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Details</CardTitle>
          <CardDescription>
            Detailed breakdown of all implementation phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {phases?.sort((a, b) => a.phase_number - b.phase_number).map((phase) => (
              <AccordionItem key={phase.id} value={`phase-${phase.id}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        Phase {phase.phase_number}: {phase.name}
                      </span>
                      <Badge variant={getStatusVariant(phase.status)}>
                        {phase.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={getRiskColor(phase.risk_level)}>
                        {phase.risk_level} Risk
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Weeks {phase.start_week}-{phase.end_week}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <Progress value={phase.progress} className="h-2" />
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-semibold mb-2">Objective</h4>
                        <p className="text-sm text-muted-foreground">
                          {phase.objective || 'No objective specified'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">{phase.duration_weeks} weeks</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Team Size:</span>
                            <span className="font-medium">{phase.team_size || 'TBD'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Progress:</span>
                            <span className="font-medium">{phase.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {phase.dependencies && Array.isArray(phase.dependencies) && phase.dependencies.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Dependencies
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(phase.dependencies as string[]).map((dep, idx) => (
                            <Badge key={idx} variant="secondary">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
