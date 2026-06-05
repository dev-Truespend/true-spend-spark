import { AuthBootstrapResponse } from "@/features/auth/types/auth.types";

export function getRouteForBootstrap(data: AuthBootstrapResponse) {
  return data.onboarding.completed ? "/(app)/(tabs)" : "/(app)/onboarding";
}
