import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'admin' | 'developer' | 'user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: AppRole | AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, requireRole, redirectTo }: ProtectedRouteProps) {
  const { user, loading: authLoading, profile, mfaPending } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const location = useLocation();

  // Validate active session
  useEffect(() => {
    const validateSession = async () => {
      if (user) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          // Session is invalid, force logout
          await supabase.auth.signOut();
          window.location.href = '/auth';
        }
      }
    };
    
    validateSession();
  }, [user, location.pathname]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const destination = redirectTo || window.location.pathname;
    return <Navigate to={`/auth?redirectTo=${encodeURIComponent(destination)}`} replace />;
  }

  // Block access if MFA verification is pending
  if (mfaPending) {
    return <Navigate to="/auth" replace />;
  }

  // Check account status
  if (profile?.status === 'deleted') {
    return <Navigate to="/auth" replace />;
  }

  // Allow access for pending_verification (restricted mode in dashboard)
  // Allow access for active accounts

  if (requireRole) {
    const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
