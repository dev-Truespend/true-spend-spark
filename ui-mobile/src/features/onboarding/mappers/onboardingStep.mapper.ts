import { OnboardingResponse, OnboardingStep } from "@/features/onboarding/types/onboarding.types";

export function stepFromOnboarding(onboarding?: OnboardingResponse | null): OnboardingStep {
  if (!onboarding) return "cards";
  if (onboarding.completed) return "done";
  if (onboarding.currentStepCode === "location_permission") return "location";
  if (onboarding.currentStepCode === "plan_selection") return "plan";
  if (onboarding.currentStepCode === "notifications") return "notifications";
  return "cards";
}
