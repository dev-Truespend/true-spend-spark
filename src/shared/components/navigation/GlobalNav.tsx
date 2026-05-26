import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import {
  Settings,
  LayoutDashboard,
  BarChart3,
  Receipt,
  Sparkles,
  Bot,
  Activity,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Menu,
  X,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { VersionDisplay } from '@/components/version/VersionDisplay';
import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/shared/lib/utils';

const navItems = [
  { id: 'dashboard',        label: 'Dashboard',    route: '/app/dashboard',       icon: LayoutDashboard, roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'credit-cards',     label: 'Cards',        route: '/app/cards',           icon: CreditCard,      roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'transactions',     label: 'Transactions', route: '/app/transactions',    icon: Receipt,         roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'insights',         label: 'Missed Rewards', route: '/app/missed-rewards', icon: Sparkles,       roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'recommendations',  label: 'AI Assistant', route: '/app/recommendations', icon: Bot,             roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'settings',         label: 'Settings',     route: '/app/settings',        icon: Settings,        roles: ['user', 'developer', 'admin'], authRequired: true },
  { id: 'monitoring',       label: 'Monitoring',   route: '/admin/observability', icon: Activity,     roles: ['admin'],                    authRequired: true },
  { id: 'admin',            label: 'Admin',        route: '/admin',            icon: ShieldCheck,     roles: ['admin'],                      authRequired: true },
];

const AUTH_NAV_HIDDEN_PATHS = new Set([
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/confirm-email-change',
]);

function shouldHideNav(pathname: string): boolean {
  return pathname.startsWith('/auth/') || AUTH_NAV_HIDDEN_PATHS.has(pathname);
}

export function GlobalNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roles, hasRole } = useUserRole();
  const { user, profile, signOut } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Anomaly count for the Insights badge (lightweight count-only query) ──
  const { data: anomalyCount = 0 } = useQuery({
    queryKey: ['nav-anomaly-count', user?.id],
    enabled:  !!user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // re-check every 5 min in background
    queryFn: async () => {
      const { count, error } = await supabase
        .from('anomaly_detections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Close the mobile sheet whenever the route changes — otherwise the
  // drawer stays open after a click and feels broken.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  if (shouldHideNav(location.pathname)) return null;

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
    navigate('/');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Logo onClick={handleLogoClick} />
          
          <nav className="flex items-center gap-3 md:gap-8">
            {/* ── Logged-out: desktop nav + CTA ────────────────────────── */}
            {!user && (
              <>
                <div className="hidden md:flex items-center gap-8">
                  <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Home
                  </Link>
                  <Link to="/features" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                  <Link to="/pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </div>
                <Link to="/auth" className="hidden sm:block">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold px-8 shadow-premium"
                  >
                    Get Started
                  </Button>
                </Link>

                {/* ── Mobile hamburger (logged-out) ──────────────────── */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b">
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col py-2">
                      {[
                        { to: '/',          label: 'Home' },
                        { to: '/features',  label: 'Features' },
                        { to: '/pricing',   label: 'Pricing' },
                        { to: '/about',     label: 'About' },
                        { to: '/docs',      label: 'Docs' },
                      ].map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className={cn(
                            "px-6 py-3 text-base font-medium hover:bg-muted transition-colors",
                            location.pathname === link.to && "bg-muted/60 text-foreground"
                          )}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <Separator className="my-2" />
                      <div className="px-6 py-3">
                        <Link to="/auth" className="block">
                          <Button className="w-full bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold">
                            Get Started
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}

            {/* ── Logged-in: desktop nav + profile dropdown ──────────── */}
            {user && (
              <>
                <div className="hidden md:flex items-center gap-8">
                  {accessibleItems.slice(0, 6).map(item => {
                    const isActive = location.pathname.startsWith(item.route) && item.route !== '/'
                                  || (item.route === '/' && location.pathname === '/');
                    const showBadge = item.id === 'insights' && anomalyCount > 0;

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
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-3 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                            {anomalyCount > 9 ? '9+' : anomalyCount}
                          </span>
                        )}
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
                    className="gap-2 animate-pulse hidden md:inline-flex"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Force Refresh
                  </Button>
                )}

                <div className="hidden md:block">
                  <UserProfileDropdown />
                </div>

                {/* ── Mobile hamburger (logged-in) ───────────────────── */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b">
                      <SheetTitle className="text-left">
                        <p className="text-base font-semibold">
                          {profile?.first_name || profile?.email?.split('@')[0] || 'Account'}
                        </p>
                        <p className="text-xs font-normal text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-col py-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                      {accessibleItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.route);
                        const Icon = item.icon;
                        const showBadge = item.id === 'insights' && anomalyCount > 0;
                        return (
                          <Link
                            key={item.id}
                            to={item.route}
                            className={cn(
                              "flex items-center gap-3 px-6 py-3 text-sm font-medium hover:bg-muted transition-colors",
                              isActive && "bg-muted/60 text-foreground border-l-2 border-primary"
                            )}
                          >
                            <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                            <span className="flex-1">{item.label}</span>
                            {showBadge && (
                              <span className="h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                                {anomalyCount > 9 ? '9+' : anomalyCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}

                      <Separator className="my-2" />

                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        Profile &amp; settings
                      </Link>
                      <Link
                        to="/settings/billing"
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Billing
                      </Link>

                      <Separator className="my-2" />

                      <button
                        type="button"
                        onClick={async () => {
                          setMobileOpen(false);
                          await signOut();
                        }}
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
