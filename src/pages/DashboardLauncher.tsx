import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Settings, 
  TrendingUp, 
  Globe,
  Lock,
  ChevronRight,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Calendar,
  Layers,
  CheckSquare,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  TestTube,
  Shield,
  Network,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type AppRole = 'admin' | 'developer' | 'user';

interface SubDashboard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ElementType;
  status: 'active' | 'coming-soon';
}

interface Dashboard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ElementType;
  allowedRoles: AppRole[];
  status: 'active' | 'building' | 'planned';
  progress?: number;
  subDashboards?: SubDashboard[];
}

const dashboards: Dashboard[] = [
  {
    id: 'user',
    title: 'User Dashboard',
    description: 'Track expenses, manage budgets, and view insights',
    route: '/user-dashboard',
    icon: BarChart3,
    allowedRoles: ['user', 'admin'],
    status: 'active',
    progress: 100,
  },
  {
    id: 'admin',
    title: 'Project Management',
    description: 'v4.2 Timeline, Architecture & Implementation Tracking',
    route: '/admin',
    icon: Settings,
    allowedRoles: ['admin'],
    status: 'active',
    progress: 100,
    subDashboards: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Executive summary and key metrics',
        route: '/admin/overview',
        icon: LayoutDashboard,
        status: 'active',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        description: 'Gantt chart and phase progression',
        route: '/admin/timeline',
        icon: Calendar,
        status: 'active',
      },
      {
        id: 'phases',
        title: 'Phases',
        description: 'Detailed phase breakdown and status',
        route: '/admin/phases',
        icon: Layers,
        status: 'active',
      },
      {
        id: 'tasks',
        title: 'Tasks',
        description: 'Task board and assignment tracking',
        route: '/admin/tasks',
        icon: CheckSquare,
        status: 'active',
      },
      {
        id: 'metrics',
        title: 'Metrics',
        description: 'KPIs and performance indicators',
        route: '/admin/metrics',
        icon: Activity,
        status: 'active',
      },
      {
        id: 'optimization',
        title: 'v4.2 Optimizations',
        description: 'Performance and ML enhancements',
        route: '/admin/optimization',
        icon: Zap,
        status: 'active',
      },
      {
        id: 'testing',
        title: 'Testing',
        description: 'Test results and quality metrics',
        route: '/admin/testing',
        icon: TestTube,
        status: 'active',
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Security dashboard and Phase 2 tests',
        route: '/admin/security',
        icon: Shield,
        status: 'active',
      },
      {
        id: 'architecture',
        title: 'Architecture',
        description: 'System architecture and components',
        route: '/admin/architecture',
        icon: Network,
        status: 'active',
      },
    ],
  },
  {
    id: 'app',
    title: 'TrueSpend App',
    description: 'Main expense tracking application (in development)',
    route: '/app',
    icon: TrendingUp,
    allowedRoles: ['user', 'admin'],
    status: 'building',
    progress: 15,
  },
  {
    id: 'performance',
    title: 'Performance Monitoring',
    description: 'Real-time metrics and optimization dashboard',
    route: '/performance',
    icon: Activity,
    allowedRoles: ['admin'],
    status: 'planned',
    progress: 0,
  },
  {
    id: 'public',
    title: 'Public Website',
    description: 'Marketing site and product information',
    route: '/public',
    icon: Globe,
    allowedRoles: ['admin'],
    status: 'planned',
    progress: 0,
  },
];

export default function DashboardLauncher() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { roles, loading } = useUserRole();
  const [expandedDashboards, setExpandedDashboards] = useState<string[]>(['admin']);

  const toggleDashboard = (dashboardId: string) => {
    setExpandedDashboards(prev =>
      prev.includes(dashboardId)
        ? prev.filter(id => id !== dashboardId)
        : [...prev, dashboardId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboards...</p>
        </div>
      </div>
    );
  }

  const accessibleDashboards = dashboards.filter(dashboard =>
    roles?.includes('admin') || dashboard.allowedRoles.some(role => roles?.includes(role))
  );

  const restrictedDashboards = dashboards.filter(dashboard =>
    !roles?.includes('admin') && !dashboard.allowedRoles.some(role => roles?.includes(role))
  );

  const getStatusBadge = (status: Dashboard['status'] | SubDashboard['status']) => {
    if (status === 'coming-soon') {
      return <Badge variant="outline">Coming Soon</Badge>;
    }

    const statusConfig = {
      active: { variant: 'default' as const, icon: CheckCircle2, label: 'Active' },
      building: { variant: 'secondary' as const, icon: Clock, label: 'Building' },
      planned: { variant: 'outline' as const, icon: Clock, label: 'Planned' },
    };

    const config = statusConfig[status as Dashboard['status']];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">TrueSpend Dashboard Hub</h1>
            <p className="text-sm text-muted-foreground">truespend.org</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <div className="flex gap-1 justify-end mt-1">
                {roles?.map(role => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Choose Your Dashboard</h2>
            <p className="text-muted-foreground">
              Select a workspace to continue. Expand Project Management to access all admin sections.
            </p>
          </div>

          {/* Accessible Dashboards */}
          <div className="space-y-6">
            {accessibleDashboards.map((dashboard) => {
              const Icon = dashboard.icon;
              const isExpanded = expandedDashboards.includes(dashboard.id);
              const hasSubDashboards = dashboard.subDashboards && dashboard.subDashboards.length > 0;

              return (
                <div key={dashboard.id}>
                  {hasSubDashboards ? (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleDashboard(dashboard.id)}>
                      <Card className="hover:shadow-lg transition-all border-2">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="cursor-pointer group">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                  <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <div className="text-left">
                                  <CardTitle className="flex items-center gap-2">
                                    {dashboard.title}
                                    {isExpanded ? (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                                    )}
                                  </CardTitle>
                                  <CardDescription className="mt-1">{dashboard.description}</CardDescription>
                                  {hasSubDashboards && (
                                    <p className="text-xs text-primary mt-2">
                                      {dashboard.subDashboards.length} sections available • Click to {isExpanded ? 'collapse' : 'expand'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(dashboard.status)}
                                {dashboard.progress !== undefined && (
                                  <span className="text-sm font-medium text-primary">{dashboard.progress}%</span>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                              {dashboard.subDashboards?.map((subDash) => {
                                const SubIcon = subDash.icon;
                                return (
                                  <Card
                                    key={subDash.id}
                                    className="cursor-pointer hover:shadow-md transition-all hover:scale-105 hover:border-primary group border"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(subDash.route);
                                    }}
                                  >
                                    <CardHeader className="p-4 space-y-3">
                                      <div className="flex items-start justify-between">
                                        <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                                          <SubIcon className="h-4 w-4 text-primary" />
                                        </div>
                                        {getStatusBadge(subDash.status)}
                                      </div>
                                      <div>
                                        <CardTitle className="text-sm flex items-center gap-1">
                                          {subDash.title}
                                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1 line-clamp-2">
                                          {subDash.description}
                                        </CardDescription>
                                      </div>
                                    </CardHeader>
                                  </Card>
                                );
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ) : (
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group border-2"
                      onClick={() => navigate(dashboard.route)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {dashboard.title}
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                              </CardTitle>
                              <CardDescription className="mt-1">{dashboard.description}</CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(dashboard.status)}
                        </div>
                      </CardHeader>
                      {dashboard.progress !== undefined && (
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Implementation Progress</span>
                              <span className="font-medium">{dashboard.progress}%</span>
                            </div>
                            <Progress value={dashboard.progress} className="h-2" />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </div>
              );
            })}
          </div>

          {/* Restricted Dashboards */}
          {restrictedDashboards.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Restricted Access</h3>
                <p className="text-sm text-muted-foreground">You don't have permission to access these dashboards</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                {restrictedDashboards.map(dashboard => {
                  const Icon = dashboard.icon;
                  return (
                    <Card key={dashboard.id} className="border-dashed">
                      <CardHeader className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-md">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {dashboard.title}
                              <Lock className="h-3 w-3" />
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              Requires: {dashboard.allowedRoles.join(' or ')}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
