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
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Timeline", href: "/dashboard/timeline", icon: Calendar },
  { name: "Phases", href: "/dashboard/phases", icon: FolderKanban },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Milestones", href: "/dashboard/milestones", icon: Target },
  { name: "Metrics", href: "/dashboard/metrics", icon: BarChart3 },
  { name: "Risks", href: "/dashboard/risks", icon: AlertTriangle },
  { name: "Testing", href: "/dashboard/testing", icon: TestTube },
  { name: "Architecture", href: "/dashboard/architecture", icon: Layers },
];

export default function DashboardLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card min-h-screen sticky top-0 flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">TrueSpend v3.0</h2>
            <p className="text-xs text-muted-foreground mt-1">Project Dashboard</p>
          </div>
          <nav className="p-4 space-y-1 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                             (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
              
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
