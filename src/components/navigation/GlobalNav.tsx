import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { Settings, LayoutDashboard, BarChart3, RefreshCw, AlertTriangle, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VersionDisplay } from '@/components/version/VersionDisplay';
import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/brand/Logo';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'transactions', label: 'Transactions', route: '/transactions', icon: BarChart3, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'budgets', label: 'Budgets', route: '/budgets', icon: BarChart3, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'insights', label: 'Insights', route: '/insights', icon: BarChart3, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'location-history', label: 'Location', route: '/location-history', icon: MapPin, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'favorites', label: 'Favorites', route: '/favorites', icon: Heart, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'settings', label: 'Settings', route: '/settings', icon: Settings, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'monitoring', label: 'Monitoring', route: '/monitoring', icon: BarChart3, roles: ['admin', 'developer'], authRequired: true },
  { id: 'admin', label: 'Admin', route: '/admin', icon: Settings, roles: ['admin'], authRequired: true },
];

export function GlobalNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roles, hasRole } = useUserRole();
  const { user, signOut } = useAuth();
  const { status } = useOfflineStorage();
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
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        if (import.meta.env.DEV) {
          console.log('[Force Refresh] 💥 Cleared all caches');
        }
      }
      
      // Hard reload
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

  const handleLogoClick = () => {
    window.location.href = '/';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-8">
        <div className="flex items-center justify-between h-20">
          <Logo onClick={handleLogoClick} />
          
          <nav className="flex items-center gap-8">
            {!user && (
              <>
                <div className="hidden md:flex items-center gap-8">
                  <Link to="/pricing" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </div>
                <Link to="/auth">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold px-8 shadow-premium"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
            
            {user && (
              <>
                <div className="hidden md:flex items-center gap-8">
                  {accessibleItems.slice(0, 5).map(item => {
                    const isActive = location.pathname.startsWith(item.route) && item.route !== '/' 
                                  || (item.route === '/' && location.pathname === '/');
                    
                    return (
                      <Link 
                        key={item.id} 
                        to={item.route}
                        className="relative group"
                      >
                        <span className={`text-sm font-semibold transition-all duration-300 ${
                          isActive 
                            ? 'text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}>
                          {item.label}
                        </span>
                        <span className={`absolute -bottom-1 left-0 h-[2px] bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal transition-all duration-300 ${
                          isActive ? 'w-full' : 'w-0 group-hover:w-full'
                        }`}></span>
                      </Link>
                    );
                  })}
                </div>
                
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
                
                {status.conflicts.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <Badge variant="destructive" className="px-1.5 py-0">
                      {status.conflicts.length}
                    </Badge>
                    Conflicts
                  </Button>
                )}
                
                <UserProfileDropdown />
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
