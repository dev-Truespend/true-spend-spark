import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square, Loader2, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  name: string;
  status: 'completed' | 'active' | 'pending' | 'milestone';
}

interface PhaseSection {
  name: string;
  tasks: Task[];
}

interface Phase {
  id: number;
  name: string;
  sections: PhaseSection[];
}

const BLUEPRINT_PHASES: Phase[] = [
  {
    id: 0,
    name: "Phase 0: Foundation",
    sections: [
      {
        name: "Project Setup & Config",
        tasks: [
          { name: "Lovable Cloud Enable", status: "completed" },
          { name: "Environment Variables Setup", status: "completed" },
          { name: "Schema Governance Framework", status: "active" },
          { name: "API Schema Types (Zod)", status: "active" },
          { name: "Event Schema Types", status: "pending" },
          { name: "Monitoring Foundation", status: "pending" },
          { name: "Structured Logging Setup", status: "pending" },
          { name: "Phase 0 Testing & Docs", status: "milestone" },
        ]
      },
      {
        name: "Data Plane-A Design",
        tasks: [
          { name: "Users Table + RLS", status: "pending" },
          { name: "Profiles Table + Encryption", status: "pending" },
          { name: "Transactions Table + RLS", status: "pending" },
          { name: "Accounts Table + RLS", status: "pending" },
        ]
      }
    ]
  },
  {
    id: 1,
    name: "Phase 1: Data & Auth",
    sections: [
      {
        name: "Data Plane-B Design",
        tasks: [
          { name: "Categories Table", status: "pending" },
          { name: "Merchants Table", status: "pending" },
          { name: "Products Table", status: "pending" },
        ]
      },
      {
        name: "Auth System Setup",
        tasks: [
          { name: "Auth System Setup", status: "pending" },
          { name: "Google OAuth Integration", status: "pending" },
          { name: "User Roles Table + RBAC", status: "pending" },
          { name: "RLS Policies (All Tables)", status: "pending" },
          { name: "Auth Testing", status: "pending" },
          { name: "Phase 1 Security Audit", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 2,
    name: "Phase 2: External Services",
    sections: [
      {
        name: "Plaid Integration Design",
        tasks: [
          { name: "Plaid/Edge Functions", status: "pending" },
          { name: "Bank Connection Flow", status: "pending" },
          { name: "Transaction Sync", status: "pending" },
        ]
      },
      {
        name: "Payment & Communication",
        tasks: [
          { name: "Stripe Integration", status: "pending" },
          { name: "Subscription Management", status: "pending" },
          { name: "SMS/Twilio Setup", status: "pending" },
          { name: "Notification Templates", status: "pending" },
          { name: "External Services Testing", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Phase 3: Core Services",
    sections: [
      {
        name: "Transaction Engine",
        tasks: [
          { name: "Transaction Processing", status: "pending" },
          { name: "Categorization Engine", status: "pending" },
          { name: "Duplicate Detection", status: "pending" },
        ]
      },
      {
        name: "Budget & Analytics",
        tasks: [
          { name: "Budget Management", status: "pending" },
          { name: "Budget Alerts", status: "pending" },
          { name: "Analytics Engine", status: "pending" },
          { name: "Reports Generation", status: "pending" },
          { name: "Notification System", status: "pending" },
          { name: "Core Features Integration", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 4,
    name: "Phase 4: UI/UX",
    sections: [
      {
        name: "Dashboard & Views",
        tasks: [
          { name: "Dashboard UI", status: "pending" },
          { name: "Transaction Views", status: "pending" },
          { name: "Budget Interface", status: "pending" },
          { name: "Analytics Dashboard", status: "pending" },
        ]
      },
      {
        name: "Responsive Design",
        tasks: [
          { name: "Mobile Responsive Design", status: "pending" },
          { name: "Tablet Optimization", status: "pending" },
          { name: "Accessibility (WCAG)", status: "pending" },
          { name: "UI/UX Review", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 5,
    name: "Phase 5: Security & Performance",
    sections: [
      {
        name: "Security Hardening",
        tasks: [
          { name: "RLS Policies (All Tables)", status: "pending" },
          { name: "CSP Implementation", status: "pending" },
          { name: "SRI Configuration", status: "pending" },
          { name: "Security Headers", status: "pending" },
        ]
      },
      {
        name: "Performance",
        tasks: [
          { name: "Performance Optimization", status: "pending" },
          { name: "Caching Strategy", status: "pending" },
          { name: "Load Testing", status: "pending" },
          { name: "Security Audit", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 6,
    name: "Phase 6: Testing & QA",
    sections: [
      {
        name: "Testing Suite",
        tasks: [
          { name: "Integration Testing", status: "pending" },
          { name: "E2E Testing", status: "pending" },
          { name: "User Acceptance Testing", status: "pending" },
          { name: "Security Testing", status: "pending" },
        ]
      },
      {
        name: "Quality Assurance",
        tasks: [
          { name: "Bug Fixes & Refinement", status: "pending" },
          { name: "Performance Testing", status: "pending" },
          { name: "Cross-browser Testing", status: "pending" },
          { name: "Final QA Review", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 7,
    name: "Phase 7: Launch Prep",
    sections: [
      {
        name: "Documentation & Deploy",
        tasks: [
          { name: "Documentation Complete", status: "pending" },
          { name: "API Documentation", status: "pending" },
          { name: "User Guides", status: "pending" },
        ]
      },
      {
        name: "Production Readiness",
        tasks: [
          { name: "Deployment Pipeline", status: "pending" },
          { name: "Monitoring & Alerts", status: "pending" },
          { name: "Backup & Recovery", status: "pending" },
          { name: "Production Launch", status: "milestone" },
        ]
      }
    ]
  }
];

const TaskIcon = ({ status }: { status: Task['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckSquare className="h-4 w-4 text-green-600" />;
    case 'active':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'milestone':
      return <Diamond className="h-4 w-4 text-yellow-600" />;
    default:
      return <Square className="h-4 w-4 text-muted-foreground" />;
  }
};

export function HierarchicalProjectDiagram() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>TrueSpend: Production-Ready Build Timeline (0-100k Users)</CardTitle>
        <CardDescription>
          Hierarchical view of all phases, sections, and tasks in the implementation timeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {BLUEPRINT_PHASES.map((phase) => (
            <div key={phase.id} className="border-l-4 border-primary/30 pl-6 space-y-4">
              {/* Phase Header */}
              <div className="flex items-center gap-3 -ml-9">
                <Badge 
                  variant="default" 
                  className="w-8 h-8 rounded-full flex items-center justify-center p-0 font-bold"
                >
                  {phase.id}
                </Badge>
                <h3 className="text-lg font-bold">{phase.name}</h3>
              </div>

              {/* Sections */}
              {phase.sections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="space-y-2">
                  {/* Section Header */}
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 mt-1 border-2 border-primary/50 rounded" />
                    <h4 className="font-semibold text-foreground">{section.name}</h4>
                  </div>

                  {/* Tasks */}
                  <div className="ml-6 space-y-1.5">
                    {section.tasks.map((task, taskIdx) => (
                      <div 
                        key={taskIdx}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-3 rounded-md transition-colors",
                          task.status === 'completed' && "bg-green-50 dark:bg-green-950/20",
                          task.status === 'active' && "bg-blue-50 dark:bg-blue-950/20",
                          task.status === 'milestone' && "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800",
                          task.status === 'pending' && "hover:bg-muted"
                        )}
                      >
                        <TaskIcon status={task.status} />
                        <span 
                          className={cn(
                            "text-sm",
                            task.status === 'completed' && "text-green-700 dark:text-green-400",
                            task.status === 'active' && "text-blue-700 dark:text-blue-400 font-medium",
                            task.status === 'milestone' && "text-yellow-700 dark:text-yellow-400 font-semibold",
                            task.status === 'pending' && "text-muted-foreground"
                          )}
                        >
                          {task.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-600" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-600" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <Diamond className="h-4 w-4 text-yellow-600" />
              <span>Milestone</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
