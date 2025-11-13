import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

type AppRole = 'admin' | 'developer' | 'user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: AppRole | AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, requireRole, redirectTo }: ProtectedRouteProps) {
  const { user, loading: authLoading, verified2FA, requires2FA } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();

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

  // Check 2FA verification for protected routes
  if (requires2FA || !verified2FA) {
    return <Navigate to="/auth/verify-2fa" replace />;
  }

  if (requireRole) {
    const requiredRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
