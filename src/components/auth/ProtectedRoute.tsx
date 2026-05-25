import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: ReactNode;
  /** One role string or an array of roles — user must have at least one. */
  requireRole?: string | string[];
  /** Where to send unauthenticated users (default: /auth). */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireRole,
  redirectTo = "/auth",
}: ProtectedRouteProps) {
  const { user, session, loading: authLoading } = useAuth();
  const { roles, loading: roleLoading } = useUserRole();
  const location = useLocation();

  // ── 1. Auth loading ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── 2. Not authenticated → redirect to /auth, preserving intended URL ──
  if (!user || !session) {
    return (
      <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
    );
  }

  // ── 3. Role check ────────────────────────────────────────────────────────
  if (requireRole) {
    // Wait for roles to load before enforcing
    if (roleLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    const required = Array.isArray(requireRole) ? requireRole : [requireRole];
    const hasRequiredRole = required.some((r) => roles.includes(r as never));

    if (!hasRequiredRole) {
      // Authenticated but wrong role → send to dashboard (not /auth)
      return <Navigate to="/dashboard" replace />;
    }
  }

  // ── 4. All checks passed ─────────────────────────────────────────────────
  return <>{children}</>;
}
