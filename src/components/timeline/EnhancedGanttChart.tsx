import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Filter, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseFilter {
  id: string;
  label: string;
  enabled: boolean;
}

interface EnhancedGanttChartProps {
  currentWeek: number;
  totalWeeks: number;
  phases: Array<{
    id: string;
    name: string;
    progress: number;
    status: string;
  }>;
}

const PHASE_SECTIONS = [
  { id: 'phase1', label: 'Phase 1: Foundation & Client Layer', color: 'bg-blue-500' },
  { id: 'phase2', label: 'Phase 2: Security & Ingress', color: 'bg-orange-500' },
  { id: 'phase2.5', label: 'Phase 2.5: Geofencing Foundation 📍', color: 'bg-teal-500' },
  { id: 'phase3', label: 'Phase 3: Authentication & Supply Chain', color: 'bg-green-500' },
  { id: 'phase4', label: 'Phase 4: Core Services', color: 'bg-purple-500' },
  { id: 'phase5', label: 'Phase 5: External Communication', color: 'bg-amber-500' },
  { id: 'phase5.5', label: 'Phase 5.5: Location Intelligence 🗺️', color: 'bg-emerald-500' },
  { id: 'phase6', label: 'Phase 6: Messaging & Events', color: 'bg-cyan-500' },
  { id: 'phase7', label: 'Phase 7: Data Planes & DR', color: 'bg-indigo-500' },
  { id: 'phase8', label: 'Phase 8: Observability & Polish', color: 'bg-slate-500' },
];

export function EnhancedGanttChart({ currentWeek, totalWeeks, phases }: EnhancedGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<PhaseFilter[]>(
    PHASE_SECTIONS.map(section => ({ id: section.id, label: section.label, enabled: true }))
  );
  const [showMilestones, setShowMilestones] = useState(true);

  const getFilteredChart = () => {
    const enabledPhases = filters.filter(f => f.enabled).map(f => f.id);
    
    let chart = `gantt
    title TrueSpend v4.0: Blueprint Implementation Timeline (34 Weeks)
    dateFormat YYYY-MM-DD
    axisFormat Week %W
    `;

    if (enabledPhases.includes('phase1')) {
      chart += `
    section Phase 1: Foundation
    Project Setup & Config           :done, p1_1, 2025-01-01, 7d
    Lovable Cloud Enable            :done, p1_2, 2025-01-01, 2d
    Environment Variables Setup     :done, p1_3, 2025-01-03, 2d
    Schema Governance Framework     :active, p1_4, 2025-01-05, 3d
    React Client Layer Setup        :p1_5, after p1_4, 7d`;
      if (showMilestones) {
        chart += `\n    Foundation Complete             :milestone, p1_m, after p1_5, 0d`;
      }
    }

    if (enabledPhases.includes('phase2')) {
      chart += `
    
    section Phase 2: Security & Ingress
    WAF & Rate Limiting             :p2_1, after p1_m, 7d
    SSL/TLS Configuration           :p2_2, after p2_1, 3d
    API Gateway Setup               :p2_3, after p2_2, 4d
    Security Headers                :p2_4, after p2_3, 3d`;
      if (showMilestones) {
        chart += `\n    Security Layer Complete         :milestone, p2_m, after p2_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase2.5')) {
      chart += `
    
    section Phase 2.5: Geofencing Foundation 📍
    Capacitor Native App Setup      :p2_5_1, after p2_m, 5d
    Location Permissions            :p2_5_2, after p2_5_1, 2d
    Geofence Database Schema        :p2_5_3, after p2_5_2, 4d
    Google Places API Integration   :p2_5_4, after p2_5_3, 3d
    Basic Location Tracking         :p2_5_5, after p2_5_4, 3d`;
      if (showMilestones) {
        chart += `\n    Geofencing Foundation Complete  :milestone, p2_5_m, after p2_5_5, 0d`;
      }
    }

    if (enabledPhases.includes('phase3')) {
      chart += `
    
    section Phase 3: Authentication
    Auth System Setup               :p3_1, after p2_5_m, 7d
    Google OAuth Integration        :p3_2, after p3_1, 3d
    User Roles Table + RBAC         :p3_3, after p3_2, 4d
    RLS Policies (All Tables)       :p3_4, after p3_3, 4d`;
      if (showMilestones) {
        chart += `\n    Auth Security Audit             :milestone, p3_m, after p3_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase4')) {
      chart += `
    
    section Phase 4: Core Services
    Transaction Processing          :p4_1, after p3_m, 7d
    Budget Management               :p4_2, after p4_1, 5d
    Analytics Engine                :p4_3, after p4_2, 6d
    Notification System             :p4_4, after p4_3, 4d`;
      if (showMilestones) {
        chart += `\n    Core Features Integration       :milestone, p4_m, after p4_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase5')) {
      chart += `
    
    section Phase 5: External Communication
    Plaid Integration               :p5_1, after p4_m, 7d
    Stripe Integration              :p5_2, after p5_1, 5d
    SMS/Twilio Setup                :p5_3, after p5_2, 4d`;
      if (showMilestones) {
        chart += `\n    External Services Testing       :milestone, p5_m, after p5_3, 0d`;
      }
    }

    if (enabledPhases.includes('phase5.5')) {
      chart += `
    
    section Phase 5.5: Location Intelligence 🗺️
    Background Geolocation          :p5_5_1, after p5_m, 5d
    Geofence Entry/Exit Detection   :p5_5_2, after p5_5_1, 4d
    Location-Based Rules            :p5_5_3, after p5_5_2, 4d
    AI Location Insights (Gemini)   :p5_5_4, after p5_5_3, 4d
    Merchant Discovery              :p5_5_5, after p5_5_4, 3d`;
      if (showMilestones) {
        chart += `\n    Location Intelligence Complete  :milestone, p5_5_m, after p5_5_5, 0d`;
      }
    }

    if (enabledPhases.includes('phase6')) {
      chart += `
    
    section Phase 6: Messaging & Events
    Event Bus Setup                 :p6_1, after p5_5_m, 7d
    WebSocket Implementation        :p6_2, after p6_1, 5d
    Push Notifications              :p6_3, after p6_2, 7d`;
      if (showMilestones) {
        chart += `\n    Messaging Integration           :milestone, p6_m, after p6_3, 0d`;
      }
    }

    if (enabledPhases.includes('phase7')) {
      chart += `
    
    section Phase 7: Data Planes & DR
    Data Plane-A Implementation     :p7_1, after p6_m, 7d
    Data Plane-B Implementation     :p7_2, after p7_1, 7d
    Backup & Recovery               :p7_3, after p7_2, 7d`;
      if (showMilestones) {
        chart += `\n    DR Testing Complete             :milestone, p7_m, after p7_3, 0d`;
      }
    }

    if (enabledPhases.includes('phase8')) {
      chart += `
    
    section Phase 8: Observability & Polish
    Monitoring & Alerts             :p8_1, after p7_m, 5d
    Performance Optimization        :p8_2, after p8_1, 4d
    Security Hardening              :p8_3, after p8_2, 5d`;
      if (showMilestones) {
        chart += `\n    Production Launch               :milestone, p8_m, after p8_3, 0d`;
      }
    }

    return chart;
  };

  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default',
        gantt: {
          fontSize: 12,
          numberSectionStyles: 10,
          axisFormat: 'Week %W',
        }
      });
      
      containerRef.current.innerHTML = getFilteredChart();
      mermaid.contentLoaded();
    }
  }, [filters, showMilestones]);

  const toggleFilter = (id: string) => {
    setFilters(prev => prev.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const overallProgress = phases?.length > 0 
    ? Math.round(phases.reduce((sum, p) => sum + p.progress, 0) / phases.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-semibold">
                Week {currentWeek} of {totalWeeks}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current progress through the implementation timeline</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-2xl font-bold text-primary">
              {overallProgress}% Complete
            </div>
          </div>
          <Progress value={(currentWeek / totalWeeks) * 100} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Timeline Progress: {Math.round((currentWeek / totalWeeks) * 100)}%</span>
            <span>Overall Completion: {overallProgress}%</span>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Filter Phases</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {filters.map((filter, index) => (
              <div key={filter.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={filter.id} 
                  checked={filter.enabled}
                  onCheckedChange={() => toggleFilter(filter.id)}
                />
                <Label 
                  htmlFor={filter.id} 
                  className={cn(
                    "text-sm cursor-pointer flex items-center gap-2",
                    !filter.enabled && "text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "w-3 h-3 rounded-full",
                    PHASE_SECTIONS[index].color,
                    !filter.enabled && "opacity-30"
                  )} />
                  {filter.label.includes('2.5') ? '2.5' : filter.label.includes('5.5') ? '5.5' : `${index + 1}`}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox 
              id="show-milestones" 
              checked={showMilestones}
              onCheckedChange={(checked) => setShowMilestones(checked as boolean)}
            />
            <Label htmlFor="show-milestones" className="text-sm cursor-pointer">
              Show Milestones
            </Label>
          </div>
        </div>
      </Card>

      {/* Gantt Chart */}
      <Card className="p-4">
        <div className="relative">
          {/* Current Week Indicator Overlay */}
          <div className="absolute top-4 right-4 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="default" className="animate-pulse cursor-help">
                    Current: Week {currentWeek}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">Timeline Status</p>
                    <p className="text-xs">Week {currentWeek} of {totalWeeks}</p>
                    <p className="text-xs">{Math.round((currentWeek / totalWeeks) * 100)}% of timeline elapsed</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Phase Completion Summary */}
          <div className="mb-4 flex flex-wrap gap-2">
            {PHASE_SECTIONS.map((section, index) => {
              const phaseData = phases?.[index];
              const isEnabled = filters.find(f => f.id === section.id)?.enabled;
              
              if (!isEnabled || !phaseData) return null;
              
              return (
                <TooltipProvider key={section.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "cursor-help transition-all hover:scale-105",
                          phaseData.status === 'Completed' && "bg-green-50 border-green-200",
                          phaseData.status === 'In Progress' && "bg-blue-50 border-blue-200",
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full mr-2", section.color)} />
                        {section.label.match(/\d+(\.\d+)?/)?.[0]}: {phaseData.progress}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">{phaseData.name}</p>
                        <p className="text-xs">Status: {phaseData.status}</p>
                        <p className="text-xs">Completion: {phaseData.progress}%</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Mermaid Chart */}
          <div className="overflow-x-auto">
            <div ref={containerRef} className="mermaid min-w-[1200px] animate-fade-in">
              {getFilteredChart()}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Chart Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Completed Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>Active Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <span>Planned Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full" />
            <span>Milestones</span>
          </div>
        </div>
      </Card>
    </div>
  );
}