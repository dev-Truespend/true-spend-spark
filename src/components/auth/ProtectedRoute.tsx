import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, requireRole, redirectTo = "/auth" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(!requireRole);
  const [hasRole, setHasRole] = useState(!requireRole);

  useEffect(() => {
    if (!requireRole || !user) {
      setRoleChecked(true);
      setHasRole(!requireRole);
      return;
    }

    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const userRoles = data?.map((r) => r.role) ?? [];
        setHasRole(roles.some((r) => userRoles.includes(r)));
        setRoleChecked(true);
      });
  }, [user, requireRole]);

  if (loading || !roleChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!hasRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
