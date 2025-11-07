import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProjectOverview, usePhases, useRisks } from "@/hooks/useProjectData";
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
          <h1 className="text-4xl font-bold tracking-tight">TrueSpend v3.0 Dashboard</h1>
          <p className="text-muted-foreground mt-2">Enterprise Financial Intelligence Platform</p>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            Track progress across all 12 implementation phases
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
