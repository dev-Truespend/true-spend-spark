import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Settings, LayoutDashboard, BarChart3, Globe, Home, User, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VersionDisplay } from '@/components/version/VersionDisplay';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const navItems = [
  { id: 'home', label: 'Home', route: '/', icon: Home, roles: [] as string[], publicOnly: true },
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'monitoring', label: 'Monitoring', route: '/monitoring', icon: BarChart3, roles: ['admin', 'developer'], authRequired: true },
  { id: 'website', label: 'Website', route: '/website', icon: Globe, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'admin', label: 'Admin', route: '/admin', icon: Settings, roles: ['admin'], authRequired: true },
];

export function GlobalNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roles, hasRole } = useUserRole();
  const { user, signOut } = useAuth();
  const [showDebug, setShowDebug] = useState(false);

  // Emergency force refresh: Ctrl+Shift+R
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setShowDebug(true);
        toast.info('Debug panel activated. Click the refresh button to force update.');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleForceRefresh = async () => {
    toast.loading('Forcing cache clear and reload...');
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      console.log('[Force Refresh] 💥 Cleared all caches and SWs');
      
      // Reload
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('[Force Refresh] Failed:', error);
      toast.error('Failed to force refresh');
    }
  };

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
          <Link to={user ? "/dashboard" : "/auth"} className="font-bold text-lg flex items-center gap-2">
            TrueSpend
            <VersionDisplay />
          </Link>
          <nav className="flex gap-2 ml-auto items-center">
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
            
            {showDebug && (
              <Button 
                onClick={handleForceRefresh} 
                variant="destructive" 
                size="sm"
                className="gap-2 animate-pulse"
              >
                <RefreshCw className="w-4 h-4" />
                Force Refresh
              </Button>
            )}
            
            {!user ? (
              <Button onClick={() => navigate('/auth')} size="sm">
                Login/Create Account
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(hasRole('admin') ? '/launcher' : '/dashboard')}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    My Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
