import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calendar, 
  FolderKanban, 
  ListTodo, 
  Users, 
  Target, 
  BarChart3, 
  AlertTriangle,
  TestTube,
  Layers,
  Zap,
  Shield,
  Webhook,
  Activity,
  FlaskConical,
  Radio,
  Flag,
  Workflow,
  Network,
  Database,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Timeline", href: "/admin/timeline", icon: Calendar },
  { name: "Phases", href: "/admin/phases", icon: FolderKanban },
  { name: "Tasks", href: "/admin/tasks", icon: ListTodo },
  { name: "Team", href: "/admin/team", icon: Users },
  { name: "Milestones", href: "/admin/milestones", icon: Target },
  { name: "Metrics", href: "/admin/metrics", icon: BarChart3 },
  { name: "v4.2 Optimizations", href: "/admin/optimization", icon: Zap },
  { name: "Risks", href: "/admin/risks", icon: AlertTriangle },
  { name: "Testing", href: "/admin/testing", icon: TestTube },
  { name: "Security", href: "/admin/security", icon: Shield },
  { name: "Architecture", href: "/admin/architecture", icon: Layers },
  { name: "Webhook Analytics", href: "/admin/webhook-analytics", icon: Webhook },
  { name: "Anomaly Detection", href: "/admin/anomaly-detection", icon: Activity },
  { name: "A/B Testing", href: "/admin/ab-testing", icon: FlaskConical },
  { name: "Realtime Events", href: "/admin/realtime-events", icon: Radio },
  { name: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
  { name: "Workflows", href: "/admin/workflows", icon: Workflow },
  { name: "Distributed Tracing", href: "/admin/distributed-tracing", icon: Network },
  { name: "Data Planes & DR", href: "/admin/data-planes", icon: Database },
  { name: "System Logs", href: "/admin/system-logs", icon: Activity },
  { name: "Observability", href: "/admin/observability", icon: BarChart3 },
  { name: "Incidents", href: "/admin/incidents", icon: AlertTriangle },
  { name: "SLO Tracking", href: "/admin/slo-tracking", icon: Target },
];

export default function AdminDashboardLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card min-h-screen sticky top-0 flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">TrueSpend v4.2</h2>
            <p className="text-xs text-muted-foreground mt-1">Project Dashboard (Admin)</p>
          </div>
          <nav className="p-4 space-y-1 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                             (item.href !== "/admin" && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground mb-2 px-3">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-accent-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="container mx-auto p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
