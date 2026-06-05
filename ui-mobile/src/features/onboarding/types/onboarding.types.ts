export type OnboardingResponse = {
  currentStepCode: string;
  cardConnectionPlaid: boolean;
  cardConnectionManual: boolean;
  cardConnectionSkipped: boolean;
  completed: boolean;
};

export type OnboardingStep = "cards" | "manual" | "location" | "plan" | "notifications" | "done";
