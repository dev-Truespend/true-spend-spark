import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTimelineData } from "@/hooks/useTimelineData";
import { Calendar, Clock, AlertTriangle, CheckCircle2, Users, CheckCircle, Wrench, Sparkles, Map, MapPin, Plug } from "lucide-react";
import { EnhancedGanttChart } from "@/components/timeline/EnhancedGanttChart";
import { HierarchicalProjectDiagram } from "@/components/timeline/HierarchicalProjectDiagram";
import { TimelineImageGenerator } from "@/components/admin/TimelineImageGenerator";
import { MilestoneMarker } from "@/components/timeline/MilestoneMarker";

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
          v4.2: 48-week implementation with 15 phases covering 19 layers + Layer 10B with performance & ML optimization 💰🚀
        </p>
      </div>

      {/* Timeline Image Generator */}
      <TimelineImageGenerator />

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

      {/* Enhanced Gantt Chart with Filters and Progress */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Interactive Gantt Chart</h2>
        <p className="text-muted-foreground mb-4">
          Filter phases, view progress indicators, and explore detailed task information
        </p>
        <EnhancedGanttChart 
          currentWeek={currentWeek}
          totalWeeks={totalWeeks}
          phases={phases || []}
        />
      </div>

      {/* Hierarchical Project Diagram */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Project Task Hierarchy</h2>
        <p className="text-muted-foreground mb-4">
          Complete breakdown of all phases, sections, and tasks based on Blueprint v4.1
        </p>
        <HierarchicalProjectDiagram />
      </div>

      {/* Visual Timeline with Milestone Markers */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Overview with Key Milestones</CardTitle>
          <CardDescription>
            48-week implementation with 10 major milestones including v4.2 Performance 🚀 (Week 40), ML Infrastructure 🤖 (Week 43), Layer 10B Revenue 💰 (Week 46), v4.2 Launch (Week 48)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Week markers */}
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Week 0</span>
              <span>Week 10</span>
              <span>Week 20</span>
              <span>Week 30</span>
              <span>Week 40</span>
              <span>Week 48</span>
            </div>
            
            {/* Timeline bars with milestone markers overlay */}
            <div className="relative space-y-2 pb-12">
              {/* Phase bars */}
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
              
              {/* Milestone markers overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <MilestoneMarker
                  week={4}
                  name="Foundation"
                  icon="foundation"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={10}
                  name="Geofencing 📍"
                  icon="geofencing"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={19}
                  name="Services ⚙️"
                  icon="services"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={25}
                  name="Location 🗺️"
                  icon="location"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={34}
                  name="Polish 🎨"
                  icon="polish"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={37}
                  name="Extension 🔌"
                  icon="extension"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={40}
                  name="Performance 🚀"
                  icon="services"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={43}
                  name="ML Infra 🤖"
                  icon="services"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={46}
                  name="Revenue 💰"
                  icon="services"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
                <MilestoneMarker
                  week={48}
                  name="v4.2 Launch 🎉"
                  icon="polish"
                  totalWeeks={totalWeeks}
                  currentWeek={currentWeek}
                />
              </div>
            </div>

            {/* Current week indicator */}
            <div className="relative h-1 bg-muted rounded mt-12">
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary rounded-full -mt-1"
                style={{ left: `${(currentWeek / totalWeeks) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Milestones - Enhanced with Icons */}
      {upcomingMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>
              Next major milestones in the v4.2 implementation timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMilestones.map((milestone) => {
                // Determine icon based on milestone week
                const getMilestoneIcon = (week: number) => {
                  if (week === 4) return <CheckCircle className="h-5 w-5 text-green-600" />;
                  if (week === 10) return <MapPin className="h-5 w-5 text-orange-600" />;
                  if (week === 19) return <Wrench className="h-5 w-5 text-blue-600" />;
                  if (week === 25) return <Map className="h-5 w-5 text-purple-600" />;
                  if (week === 34) return <Sparkles className="h-5 w-5 text-yellow-600" />;
                  if (week === 37) return <Plug className="h-5 w-5 text-indigo-600" />;
                  return <Calendar className="h-5 w-5 text-muted-foreground" />;
                };
                
                return (
                  <div key={milestone.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="mt-0.5">
                      {getMilestoneIcon(milestone.week)}
                    </div>
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
                );
              })}
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
