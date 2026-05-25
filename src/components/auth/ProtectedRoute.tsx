import type { ReactNode } from "react";
  children: React.ReactNode;
  requireRole?: string | string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
