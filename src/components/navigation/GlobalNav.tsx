import { Link, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Settings, LayoutDashboard, BarChart3, Globe, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { id: 'launcher', label: 'Home', route: '/', icon: Home, roles: [] as string[] },
  { id: 'admin', label: 'Project', route: '/admin', icon: Settings, roles: ['admin'] },
  { id: 'app', label: 'TrueSpend', route: '/app', icon: LayoutDashboard, roles: ['user', 'developer', 'admin'] },
  { id: 'monitoring', label: 'Monitoring', route: '/monitoring', icon: BarChart3, roles: ['admin', 'developer'] },
  { id: 'website', label: 'Website', route: '/website', icon: Globe, roles: [] as string[] },
];

export function GlobalNav() {
  const location = useLocation();
  const { roles } = useUserRole();

  if (location.pathname === '/auth') return null;

  const accessibleItems = navItems.filter(item => 
    item.roles.length === 0 || item.roles.some(role => roles.includes(role as any))
  );

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
