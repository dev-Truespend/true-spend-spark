import { useTasks, usePhases } from "@/shared/hooks/useProjectData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export default function Tasks() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: phases } = usePhases();
  const [selectedPhase, setSelectedPhase] = useState<string>("all");

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredTasks = selectedPhase === "all" 
    ? tasks 
    : tasks?.filter(t => t.phase_id === selectedPhase);

  // Group tasks by week
  const tasksByWeek = filteredTasks?.reduce((acc, task) => {
    const week = task.start_week || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(task);
    return acc;
  }, {} as Record<number, typeof tasks>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "Blocked":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "destructive";
      case "High":
        return "default";
      case "Medium":
        return "secondary";
      case "Low":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Calculate phase stats
  const phaseStats = phases?.map(phase => {
    const phaseTasks = tasks?.filter(t => t.phase_id === phase.id) || [];
    const completed = phaseTasks.filter(t => t.status === "Completed").length;
    const total = phaseTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      id: phase.id,
      name: phase.name,
      completed,
      total,
      percentage,
      tasks: phaseTasks
    };
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground mt-2">
          Track implementation progress for all 25 enterprise geofencing tasks across Phase 2.5 & Phase 5.5
        </p>
      </div>

      {/* Phase Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {phaseStats?.map((stat) => (
          <Card key={stat.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedPhase(stat.id)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <CardDescription>{stat.completed} of {stat.total} tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={stat.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">{stat.percentage}% complete</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Tabs value={selectedPhase} onValueChange={setSelectedPhase} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({tasks?.length || 0})</TabsTrigger>
          {phases?.map((phase) => (
            <TabsTrigger key={phase.id} value={phase.id}>
              {phase.name} ({phaseStats?.find(s => s.id === phase.id)?.total || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedPhase} className="mt-6 space-y-6">
          {Object.entries(tasksByWeek || {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, weekTasks]) => (
              <div key={week} className="space-y-3">
                <h2 className="text-xl font-semibold">Week {week}</h2>
                <div className="grid gap-4">
                  {weekTasks?.map((task: any) => (
                    <Card key={task.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(task.status)}
                            <div className="flex-1 space-y-1">
                              <CardTitle className="text-base">{task.name}</CardTitle>
                              <CardDescription className="text-sm">
                                {task.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline">{task.status}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-2" />
                        </div>

                        {/* Architecture Components */}
                        {task.architecture_components && task.architecture_components.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Architecture Layers</p>
                            <div className="flex flex-wrap gap-2">
                              {task.architecture_components.map((component: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {component}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Success Criteria */}
                        {task.success_criteria && task.success_criteria.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Success Criteria</p>
                            <ul className="space-y-1">
                              {task.success_criteria.map((criteria: string, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{criteria}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Dependencies */}
                        {task.dependencies && task.dependencies.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Dependencies</p>
                            <div className="flex flex-wrap gap-2">
                              {task.dependencies.map((dep: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
