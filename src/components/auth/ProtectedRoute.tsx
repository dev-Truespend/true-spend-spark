interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[];
  redirectTo?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
