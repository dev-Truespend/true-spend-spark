import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Settings, 
  BarChart3, 
  Globe,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface Dashboard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: typeof LayoutDashboard;
  roles: ('admin' | 'developer' | 'user')[];
  status: 'active' | 'building' | 'planned';
  progress?: number;
}

const dashboards: Dashboard[] = [
  {
    id: 'user-dashboard',
    title: 'User Dashboard',
    description: 'Your personal TrueSpend dashboard - receipts, budgets, and spending',
    route: '/dashboard',
    icon: LayoutDashboard,
    roles: ['user', 'developer', 'admin'],
    status: 'active',
    progress: 100
  },
  {
    id: 'admin',
    title: 'Project Management',
    description: 'Track TrueSpend development progress, phases, and team tasks',
    route: '/admin',
    icon: Settings,
    roles: ['admin'],
    status: 'active',
    progress: 100
  },
  {
    id: 'app',
    title: 'TrueSpend App',
    description: 'Manage your finances, track spending, and optimize rewards',
    route: '/app',
    icon: LayoutDashboard,
    roles: ['user', 'developer', 'admin'],
    status: 'building',
    progress: 15
  },
  {
    id: 'monitoring',
    title: 'Performance Monitoring',
    description: 'Real-time analytics, error tracking, and system health',
    route: '/monitoring',
    icon: BarChart3,
    roles: ['admin', 'developer'],
    status: 'planned',
    progress: 0
  },
  {
    id: 'website',
    title: 'Public Website',
    description: 'Marketing pages, features, pricing, and documentation',
    route: '/website',
    icon: Globe,
    roles: ['user', 'developer', 'admin'],
    status: 'planned',
    progress: 0
  }
];

export default function DashboardLauncher() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { roles, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const accessibleDashboards = dashboards.filter(d => 
    d.roles.some(role => roles.includes(role))
  );

  const getStatusBadge = (status: Dashboard['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case 'building':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Building</Badge>;
      case 'planned':
        return <Badge variant="outline">Planned</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TrueSpend</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">truespend.org</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.email}</p>
              <div className="flex gap-1 justify-end mt-1">
                {roles.map(role => (
                  <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Choose Your Dashboard
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Select a workspace to continue
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accessibleDashboards.map(dashboard => {
              const Icon = dashboard.icon;
              const isAccessible = dashboard.status === 'active';

              return (
                <Card 
                  key={dashboard.id}
                  className={`transition-all hover:shadow-lg ${
                    isAccessible ? 'cursor-pointer hover:border-primary' : 'opacity-60'
                  }`}
                  onClick={() => isAccessible && navigate(dashboard.route)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      {getStatusBadge(dashboard.status)}
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {dashboard.title}
                      {!isAccessible && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription>{dashboard.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboard.progress !== undefined && dashboard.progress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Implementation Progress</span>
                          <span className="font-medium">{dashboard.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${dashboard.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {isAccessible && (
                      <Button className="w-full mt-4">Open Dashboard</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {dashboards.filter(d => !accessibleDashboards.includes(d)).length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Restricted Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-40">
                {dashboards
                  .filter(d => !accessibleDashboards.includes(d))
                  .map(dashboard => {
                    const Icon = dashboard.icon;
                    return (
                      <Card key={dashboard.id}>
                        <CardHeader>
                          <div className="flex items-start gap-3">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <CardTitle className="text-base">{dashboard.title}</CardTitle>
                              <CardDescription className="text-sm">
                                <Lock className="w-3 h-3 inline mr-1" />
                                Requires: {dashboard.roles.join(' or ')}
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
