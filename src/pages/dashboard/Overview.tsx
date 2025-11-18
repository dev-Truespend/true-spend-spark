import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProjectOverview, usePhases, useRisks, useTasks } from "@/hooks/useProjectData";
import { Calendar, TrendingUp, AlertTriangle, CheckCircle2, Clock, Target } from "lucide-react";

export default function Overview() {
  const { 
    currentWeek, 
    totalWeeks, 
    overallProgress, 
    currentPhase, 
    upcomingMilestones, 
    taskStats,
    isLoading 
  } = useProjectOverview();
  
  const { data: phases } = usePhases();
  const { data: risks } = useRisks();

  const activeRisks = risks?.filter(r => r.status !== 'Mitigated').length || 0;
  const criticalRisks = risks?.filter(r => r.status !== 'Mitigated' && r.impact === 'High').length || 0;

  // Get Phase 1 and Phase 4 data
  const phase1 = phases?.find(p => p.phase_number === 1);
  const phase4 = phases?.find(p => p.phase_number === 4);
  const { data: tasks } = useTasks();
  const phase1Tasks = tasks?.filter(t => t.phase_id === phase1?.id) || [];
  const completedPhase1Tasks = phase1Tasks.filter(t => t.status === 'Completed').length;
  const phase4Tasks = tasks?.filter(t => t.phase_id === phase4?.id) || [];
  const completedPhase4Tasks = phase4Tasks.filter(t => t.status === 'Completed').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">TrueSpend v4.2 Dashboard</h1>
          <p className="text-muted-foreground mt-2">19-Layer + Layer 10B with Native Mobile Apps (51 weeks, 16 phases, 632 SP)</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Calendar className="w-4 h-4 mr-2" />
            Week {currentWeek} of {totalWeeks}
          </Badge>
          {currentPhase && (
            <Badge className="text-lg px-4 py-2">
              {currentPhase.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Phase 1 Status */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phase 1 Status</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phase1?.progress || 0}%</div>
            <Progress value={phase1?.progress || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Foundation & Client Layer
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">{completedPhase1Tasks}/{phase1Tasks.length} Tasks</Badge>
              <Badge variant={phase1?.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">{phase1?.status || 'Unknown'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Phase 4 Status - NEW */}
        <Card className="border-purple-500/50 bg-purple-50 dark:bg-purple-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phase 4 Status</CardTitle>
            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phase4?.progress || 0}%</div>
            <Progress value={phase4?.progress || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Core Services (BFF, Logic, AI)
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">{completedPhase4Tasks}/{phase4Tasks.length} Tasks</Badge>
              <Badge variant="destructive" className="text-xs">Critical</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Phase 10 Status - NEW */}
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phase 10 Status</CardTitle>
            <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <Progress value={100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Observability & Polish
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">8 Systems Live</Badge>
              <Badge variant="default" className="text-xs">Complete</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {phases?.filter(p => p.status === 'Completed').length || 0} of {phases?.length || 0} phases completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {taskStats.inProgress} in progress, {taskStats.blocked} blocked
            </p>
            <Progress 
              value={(taskStats.completed / taskStats.total) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRisks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {criticalRisks} critical risks requiring attention
            </p>
            {criticalRisks > 0 && (
              <Badge variant="destructive" className="mt-2">Action Required</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWeeks - currentWeek} weeks</div>
            <p className="text-xs text-muted-foreground mt-2">
              Remaining until launch (Week {totalWeeks})
            </p>
            <Progress 
              value={(currentWeek / totalWeeks) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Phase Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Phase Status Overview
          </CardTitle>
          <CardDescription>
            Track progress across all 16 implementation phases (51 weeks total, v4.2 with Native Mobile Apps 📱)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {phases?.map((phase) => (
              <Card key={phase.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Phase {phase.phase_number}</Badge>
                    <Badge 
                      variant={
                        phase.status === 'Completed' ? 'default' :
                        phase.status === 'In Progress' ? 'secondary' :
                        phase.status === 'Blocked' ? 'destructive' : 'outline'
                      }
                    >
                      {phase.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{phase.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{phase.progress}%</span>
                  </div>
                  <Progress value={phase.progress} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Week {phase.start_week}-{phase.end_week}</span>
                    <span>{phase.duration_weeks}w</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Milestones</CardTitle>
          <CardDescription>Next 3 critical milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingMilestones?.map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{milestone.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Week {milestone.week} • {milestone.gate_requirements.length} requirements
                  </p>
                </div>
                <Badge variant={milestone.status === 'Completed' ? 'default' : 'outline'}>
                  {milestone.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
