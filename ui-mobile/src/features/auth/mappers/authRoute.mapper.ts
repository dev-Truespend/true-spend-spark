import { AuthBootstrapResponse, AuthRoute } from "@/features/auth/types/auth.types";

export function getRouteForBootstrap(data: AuthBootstrapResponse): AuthRoute {
  // Login during the deletion grace window: lock the user to the reactivate/cancel screen.
  if (data.accountDeletion?.status === "pending") return "/(app)/account-reactivation";
  return data.onboarding.completed ? "/(app)/(tabs)" : "/(app)/onboarding";
}
