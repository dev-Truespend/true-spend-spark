import { Link, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Settings, LayoutDashboard, BarChart3, Globe, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { id: 'home', label: 'Home', route: '/', icon: Home, roles: [] as string[], publicOnly: true },
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'monitoring', label: 'Monitoring', route: '/monitoring', icon: BarChart3, roles: ['admin', 'developer'], authRequired: true },
  { id: 'website', label: 'Website', route: '/website', icon: Globe, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'admin', label: 'Admin', route: '/admin', icon: Settings, roles: ['admin'], authRequired: true },
];

export function GlobalNav() {
  const location = useLocation();
  const { roles } = useUserRole();
  const { user } = useAuth();

  if (location.pathname === '/auth') return null;

  const accessibleItems = navItems.filter(item => {
    // Show public items when not authenticated
    if (!user && (item as any).publicOnly) return true;
    // Hide public-only items when authenticated
    if (user && (item as any).publicOnly) return false;
    // Show auth-required items only when authenticated
    if ((item as any).authRequired && !user) return false;
    // Check role requirements
    if (item.roles.length === 0) return true;
    return item.roles.some(role => roles.includes(role as any));
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-6 h-14">
          <Link to="/" className="font-bold text-lg">TrueSpend</Link>
          <nav className="flex gap-2 ml-auto">
            {accessibleItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.route) && item.route !== '/' 
                            || (item.route === '/' && location.pathname === '/');
              
              return (
                <Link key={item.id} to={item.route}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
