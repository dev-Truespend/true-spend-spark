import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect } from "react";

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

  // Show loading state while checking authentication
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

  // Not authenticated - redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // MFA verification is pending - redirect back to auth
  if (mfaPending) {
    return <Navigate to="/auth" replace />;
  }

  // Account is deleted - redirect to auth
  if (profile?.status === 'deleted') {
    return <Navigate to="/auth" replace />;
  }

  // Check role requirements
  if (requireRole) {
    const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // All checks passed - render protected content
  return <>{children}</>;
}
