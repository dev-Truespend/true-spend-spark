import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePhases, useTasks } from "@/hooks/useProjectData";
import { AlertCircle, CheckCircle, Clock, Users } from "lucide-react";

export default function Phases() {
  const { data: phases, isLoading } = usePhases();
  const { data: tasks } = useTasks();

  if (isLoading) {
    return <div className="animate-pulse">Loading phases...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Phase Management</h1>
        <p className="text-muted-foreground mt-2">16 phases · 58% complete · 9 production-ready · Critical blockers: Plaid/Stripe integrations (0%)</p>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {phases?.map((phase) => {
          const phaseTasks = tasks?.filter(t => t.phase_id === phase.id) || [];
          const completedTasks = phaseTasks.filter(t => t.status === 'Completed').length;
          const blockedTasks = phaseTasks.filter(t => t.status === 'Blocked').length;

          return (
            <AccordionItem key={phase.id} value={phase.id} className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-lg">
                      Phase {phase.phase_number}
                    </Badge>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Week {phase.start_week}-{phase.end_week} • {phase.duration_weeks} weeks • {phase.team_size} team members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{phase.progress}% Complete</div>
                      <div className="w-32">
                        <Progress value={phase.progress} className="mt-1" />
                      </div>
                    </div>
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
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="pt-6 space-y-6">
                {/* Objective */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Objective</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {phase.objective || "No objective defined"}
                    </p>
                  </CardContent>
                </Card>

                {/* Phase Metrics */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{completedTasks}</p>
                          <p className="text-xs text-muted-foreground">Completed Tasks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{phaseTasks.length}</p>
                          <p className="text-xs text-muted-foreground">Total Tasks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-2xl font-bold">{blockedTasks}</p>
                          <p className="text-xs text-muted-foreground">Blocked Tasks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">{phase.team_size || 0}</p>
                          <p className="text-xs text-muted-foreground">Team Size</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Level */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge 
                      variant={
                        phase.risk_level === 'Critical' ? 'destructive' :
                        phase.risk_level === 'High' ? 'destructive' :
                        phase.risk_level === 'Medium' ? 'secondary' : 'outline'
                      }
                      className="text-sm"
                    >
                      {phase.risk_level} Risk
                    </Badge>
                  </CardContent>
                </Card>

                {/* Tasks List */}
                {phaseTasks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tasks ({phaseTasks.length})</CardTitle>
                      <CardDescription>All tasks for this phase</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {phaseTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{task.name}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs font-medium">{task.progress}%</div>
                                <div className="w-20">
                                  <Progress value={task.progress} className="h-1.5" />
                                </div>
                              </div>
                              <Badge variant={
                                task.status === 'Completed' ? 'default' :
                                task.status === 'In Progress' ? 'secondary' :
                                task.status === 'Blocked' ? 'destructive' : 'outline'
                              }>
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
