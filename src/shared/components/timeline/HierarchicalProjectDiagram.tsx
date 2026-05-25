import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { CheckSquare, Square, Loader2, Diamond } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
    id: 1,
    name: "Phase 1: Foundation & Client Layer",
    sections: [
      {
        name: "Project Setup",
        tasks: [
          { name: "Lovable Cloud Enable", status: "completed" },
          { name: "Environment Variables Setup", status: "completed" },
          { name: "Schema Governance Framework", status: "active" },
          { name: "React Client Layer Setup", status: "pending" },
          { name: "Foundation Complete", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 2,
    name: "Phase 2: Security & Ingress",
    sections: [
      {
        name: "Security Infrastructure",
        tasks: [
          { name: "WAF & Rate Limiting", status: "pending" },
          { name: "SSL/TLS Configuration", status: "pending" },
          { name: "API Gateway Setup", status: "pending" },
          { name: "Security Headers", status: "pending" },
          { name: "Security Layer Complete", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 2.5,
    name: "Phase 2.5: Geofencing Foundation 📍",
    sections: [
      {
        name: "Native Mobile Setup",
        tasks: [
          { name: "Install Capacitor dependencies", status: "pending" },
          { name: "Configure iOS project", status: "pending" },
          { name: "Configure Android project", status: "pending" },
          { name: "Test basic geolocation", status: "pending" },
        ]
      },
      {
        name: "Location Infrastructure",
        tasks: [
          { name: "Create geofences table", status: "pending" },
          { name: "Create geofence_events table", status: "pending" },
          { name: "Create merchants table", status: "pending" },
          { name: "Implement RLS policies", status: "pending" },
          { name: "Google Places API setup", status: "pending" },
          { name: "Foursquare API setup", status: "pending" },
          { name: "Geofencing Foundation Complete", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Phase 3: Authentication & Supply Chain",
    sections: [
      {
        name: "Auth System",
        tasks: [
          { name: "Auth System Setup", status: "pending" },
          { name: "Google OAuth Integration", status: "pending" },
          { name: "User Roles Table + RBAC", status: "pending" },
          { name: "RLS Policies (All Tables)", status: "pending" },
          { name: "Auth Security Audit", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 4,
    name: "Phase 4: Core Services",
    sections: [
      {
        name: "BFF Layer",
        tasks: [
          { name: "BFF Dashboard Endpoint", status: "completed" },
          { name: "Response Caching", status: "active" },
          { name: "Performance Testing", status: "pending" },
        ]
      },
      {
        name: "Business Logic",
        tasks: [
          { name: "Transaction Processing", status: "completed" },
          { name: "Rules Engine", status: "pending" },
          { name: "Budget Management", status: "active" },
          { name: "Alert Threshold Logic", status: "pending" },
        ]
      },
      {
        name: "AI Services",
        tasks: [
          { name: "AI Categorization", status: "completed" },
          { name: "Spending Analysis", status: "completed" },
          { name: "Anomaly Detection", status: "pending" },
        ]
      },
      {
        name: "Frontend Integration",
        tasks: [
          { name: "Transactions Page", status: "completed" },
          { name: "Budgets & Insights", status: "completed" },
          { name: "Core Features Integration", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 5,
    name: "Phase 5: External Communication",
    sections: [
      {
        name: "External Services",
        tasks: [
          { name: "Plaid Integration", status: "pending" },
          { name: "Stripe Integration", status: "pending" },
          { name: "SMS/Twilio Setup", status: "pending" },
          { name: "External Services Testing", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 5.5,
    name: "Phase 5.5: Location Intelligence 🗺️",
    sections: [
      {
        name: "Background Tracking",
        tasks: [
          { name: "Implement background geolocation", status: "pending" },
          { name: "Build geofence boundary detection", status: "pending" },
          { name: "Create location event publishing", status: "pending" },
          { name: "Test battery optimization", status: "pending" },
        ]
      },
      {
        name: "AI Location Insights",
        tasks: [
          { name: "Budget zone enforcement logic", status: "pending" },
          { name: "Location-based spending alerts", status: "pending" },
          { name: "Integrate Lovable AI (Gemini 2.5 Flash)", status: "pending" },
          { name: "Build spending pattern analysis", status: "pending" },
          { name: "Merchant proximity validation", status: "pending" },
          { name: "Location Intelligence Complete", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 6,
    name: "Phase 6: Messaging & Events",
    sections: [
      {
        name: "Messaging Infrastructure",
        tasks: [
          { name: "Event Bus Setup", status: "pending" },
          { name: "WebSocket Implementation", status: "pending" },
          { name: "Push Notifications", status: "pending" },
          { name: "Messaging Integration", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 7,
    name: "Phase 7: Data Planes & DR",
    sections: [
      {
        name: "Data Infrastructure",
        tasks: [
          { name: "Data Plane-A Implementation", status: "pending" },
          { name: "Data Plane-B Implementation", status: "pending" },
          { name: "Backup & Recovery", status: "pending" },
          { name: "DR Testing Complete", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 8,
    name: "Phase 8: Observability & Polish",
    sections: [
      {
        name: "Production Readiness",
        tasks: [
          { name: "Monitoring & Alerts", status: "pending" },
          { name: "Performance Optimization", status: "pending" },
          { name: "Security Hardening", status: "pending" },
          { name: "Production Launch", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 9,
    name: "Phase 9: Browser Extension MVP 🔌",
    sections: [
      {
        name: "Extension Development",
        tasks: [
          { name: "Extension manifest setup", status: "pending" },
          { name: "Transaction capture logic", status: "pending" },
          { name: "Chrome Web Store submission", status: "pending" },
          { name: "Browser Extension Live", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 10,
    name: "Phase 10: Browser Extension Production 🔌",
    sections: [
      {
        name: "Extension Production Refinements",
        tasks: [
          { name: "Ephemeral SW Architecture", status: "pending" },
          { name: "CORS/Bearer Auth", status: "pending" },
          { name: "Realtime Filtering", status: "pending" },
          { name: "Telemetry & Privacy Modal", status: "pending" },
          { name: "Extension Production Ready", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 11,
    name: "Phase 11: Native Mobile Apps 📱",
    sections: [
      {
        name: "Capacitor Setup",
        tasks: [
          { name: "Install Capacitor dependencies (@capacitor/core, cli, ios, android)", status: "pending" },
          { name: "Initialize Capacitor project (npx cap init)", status: "pending" },
          { name: "Configure capacitor.config.ts with sandbox URL", status: "pending" },
          { name: "Add iOS platform (npx cap add ios)", status: "pending" },
          { name: "Add Android platform (npx cap add android)", status: "pending" },
        ]
      },
      {
        name: "Background Location & Push Notifications",
        tasks: [
          { name: "Install @capacitor/geolocation plugin", status: "pending" },
          { name: "Configure iOS Info.plist location permissions", status: "pending" },
          { name: "Configure Android location permissions", status: "pending" },
          { name: "Implement background location tracking service", status: "pending" },
          { name: "Install @capacitor/push-notifications plugin", status: "pending" },
          { name: "Configure APNS certificates (iOS)", status: "pending" },
          { name: "Configure FCM credentials (Android)", status: "pending" },
          { name: "Create push notification handler", status: "pending" },
        ]
      },
      {
        name: "Native Geofencing & App Store Prep",
        tasks: [
          { name: "Implement iOS CLLocationManager geofence monitoring", status: "pending" },
          { name: "Implement Android GeofencingClient", status: "pending" },
          { name: "Create iOS Widget Extension (Today Extension)", status: "pending" },
          { name: "Configure app icons and splash screens", status: "pending" },
          { name: "Configure build settings for App Store/Play Store", status: "pending" },
          { name: "Native Mobile Apps Complete", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 12,
    name: "Phase 12: Performance Optimization 🚀",
    sections: [
      {
        name: "Performance Layer",
        tasks: [
          { name: "GraphQL BFF implementation", status: "pending" },
          { name: "Read replica setup", status: "pending" },
          { name: "Redis caching layer", status: "pending" },
          { name: "Response compression", status: "pending" },
          { name: "Batch operations", status: "pending" },
          { name: "Performance Baseline Met", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 13,
    name: "Phase 13: ML Infrastructure 🤖",
    sections: [
      {
        name: "Machine Learning",
        tasks: [
          { name: "Model registry setup", status: "pending" },
          { name: "RL cache implementation", status: "pending" },
          { name: "LSTM anomaly detection", status: "pending" },
          { name: "Collaborative filtering", status: "pending" },
          { name: "Predictive caching", status: "pending" },
          { name: "ML Models Production Ready", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 14,
    name: "Phase 14: Advanced ML & Layer 10B 💰",
    sections: [
      {
        name: "Revenue & Advanced ML",
        tasks: [
          { name: "Multi-armed bandit optimization", status: "pending" },
          { name: "Affiliate provider integrations", status: "pending" },
          { name: "Offer ranking engine", status: "pending" },
          { name: "Fraud detection ML", status: "pending" },
          { name: "Attribution tracking", status: "pending" },
          { name: "Layer 10B Revenue Active", status: "milestone" },
        ]
      }
    ]
  },
  {
    id: 15,
    name: "Phase 15: Cost Optimization & Polish ✨",
    sections: [
      {
        name: "Final Optimization",
        tasks: [
          { name: "R-Tree indexes", status: "pending" },
          { name: "Bloom filters", status: "pending" },
          { name: "Time-series compression", status: "pending" },
          { name: "CDN prewarming", status: "pending" },
          { name: "Final cost audit", status: "pending" },
          { name: "v4.2 Production Complete", status: "milestone" },
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
        <CardTitle>TrueSpend v4.2: Complete Implementation with Native Mobile Apps</CardTitle>
        <CardDescription>
          Hierarchical view of all 16 phases, sections, and tasks in the 51-week timeline
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
                  className="min-w-12 h-8 rounded-full flex items-center justify-center p-2 font-bold"
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