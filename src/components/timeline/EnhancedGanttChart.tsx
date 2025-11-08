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
  { id: 'phase0', label: 'Phase 0: Foundation', color: 'bg-blue-500' },
  { id: 'phase1', label: 'Phase 1: Data & Auth', color: 'bg-green-500' },
  { id: 'phase2', label: 'Phase 2: External Services', color: 'bg-purple-500' },
  { id: 'phase3', label: 'Phase 3: Core Features', color: 'bg-orange-500' },
  { id: 'phase4', label: 'Phase 4: UI/UX', color: 'bg-pink-500' },
  { id: 'phase5', label: 'Phase 5: Security', color: 'bg-red-500' },
  { id: 'phase6', label: 'Phase 6: Testing', color: 'bg-yellow-500' },
  { id: 'phase7', label: 'Phase 7: Launch', color: 'bg-indigo-500' },
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
    title TrueSpend: Production-Ready Build Timeline (0-100k Users)
    dateFormat YYYY-MM-DD
    axisFormat Week %W
    `;

    if (enabledPhases.includes('phase0')) {
      chart += `
    section Phase 0: Foundation
    Project Setup & Config           :done, p0_1, 2025-01-01, 7d
    Lovable Cloud Enable            :done, p0_2, 2025-01-01, 2d
    Environment Variables Setup     :done, p0_3, 2025-01-03, 2d
    Schema Governance Framework     :active, p0_4, 2025-01-05, 3d`;
      if (showMilestones) {
        chart += `\n    Phase 0 Testing & Docs         :milestone, p0_m, 2025-01-08, 0d`;
      }
    }

    if (enabledPhases.includes('phase1')) {
      chart += `
    
    section Phase 1: Data & Auth
    Data Plane-A Design            :p1_1, after p0_m, 7d
    Users Table + RLS              :p1_2, after p1_1, 3d
    Profiles Table + Encryption    :p1_3, after p1_2, 3d
    Transactions Table + RLS       :p1_4, after p1_3, 4d
    Accounts Table + RLS           :p1_5, after p1_4, 3d
    Data Plane-B Design            :p1_6, after p1_5, 4d
    Auth System Setup              :p1_7, after p1_6, 5d
    Google OAuth Integration       :p1_8, after p1_7, 3d`;
      if (showMilestones) {
        chart += `\n    Phase 1 Security Audit         :milestone, p1_m, after p1_8, 0d`;
      }
    }

    if (enabledPhases.includes('phase2')) {
      chart += `
    
    section Phase 2: External Services
    Plaid Integration Design       :p2_1, after p1_m, 5d
    Plaid/Edge Functions           :p2_2, after p2_1, 7d
    Stripe Integration             :p2_3, after p2_2, 5d
    SMS/Twilio Setup              :p2_4, after p2_3, 4d`;
      if (showMilestones) {
        chart += `\n    External Services Testing      :milestone, p2_m, after p2_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase3')) {
      chart += `
    
    section Phase 3: Core Features
    Transaction Processing         :p3_1, after p2_m, 7d
    Budget Management             :p3_2, after p3_1, 5d
    Analytics Engine              :p3_3, after p3_2, 6d
    Notification System           :p3_4, after p3_3, 4d`;
      if (showMilestones) {
        chart += `\n    Core Features Integration     :milestone, p3_m, after p3_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase4')) {
      chart += `
    
    section Phase 4: UI/UX
    Dashboard UI                  :p4_1, after p3_m, 7d
    Transaction Views             :p4_2, after p4_1, 5d
    Budget Interface              :p4_3, after p4_2, 5d
    Mobile Responsive Design      :p4_4, after p4_3, 5d`;
      if (showMilestones) {
        chart += `\n    UI/UX Review                  :milestone, p4_m, after p4_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase5')) {
      chart += `
    
    section Phase 5: Security & Performance
    RLS Policies (All Tables)     :p5_1, after p4_m, 7d
    Performance Optimization      :p5_2, after p5_1, 5d
    Security Hardening            :p5_3, after p5_2, 5d
    Load Testing                  :p5_4, after p5_3, 4d`;
      if (showMilestones) {
        chart += `\n    Security Audit                :milestone, p5_m, after p5_4, 0d`;
      }
    }

    if (enabledPhases.includes('phase6')) {
      chart += `
    
    section Phase 6: Testing & QA
    Integration Testing           :p6_1, after p5_m, 7d
    User Acceptance Testing       :p6_2, after p6_1, 5d
    Bug Fixes & Refinement        :p6_3, after p6_2, 7d`;
      if (showMilestones) {
        chart += `\n    Final QA Review               :milestone, p6_m, after p6_3, 0d`;
      }
    }

    if (enabledPhases.includes('phase7')) {
      chart += `
    
    section Phase 7: Launch Prep
    Documentation Complete        :p7_1, after p6_m, 5d
    Deployment Pipeline           :p7_2, after p7_1, 4d
    Monitoring & Alerts           :p7_3, after p7_2, 4d`;
      if (showMilestones) {
        chart += `\n    Production Launch             :milestone, p7_m, after p7_3, 0d`;
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
          numberSectionStyles: 8,
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  Phase {index}
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
                        Phase {index}: {phaseData.progress}%
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
