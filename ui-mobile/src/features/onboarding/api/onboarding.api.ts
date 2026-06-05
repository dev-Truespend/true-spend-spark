import { apiGet, apiPost } from "@/shared/api/client";
import { OnboardingResponse } from "@/features/onboarding/types/onboarding.types";

export const onboardingApi = {
  getOnboarding: () => apiGet<OnboardingResponse>("/api/v1/onboarding"),
  updateOnboarding: (body: Partial<OnboardingResponse>) => apiPost<OnboardingResponse>("/api/v1/onboarding", body),
  skipCardLinking: () => apiPost<OnboardingResponse>("/api/v1/onboarding/skip-card-linking"),
  complete: () => apiPost<OnboardingResponse>("/api/v1/onboarding/complete")
};
