import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: string | string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
