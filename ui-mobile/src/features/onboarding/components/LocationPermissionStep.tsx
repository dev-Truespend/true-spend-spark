import { View } from "react-native";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { OnboardingHero } from "./OnboardingHero";
import { StepHeader } from "./StepHeader";
import { LocationPermissionPrompt } from "@/features/permissions/components/LocationPermissionPrompt";
import { PermissionState } from "@/features/permissions/types/permissions.types";

type Props = {
  isLoading: boolean;
  onReport: (state: PermissionState) => void;
};

export function LocationPermissionStep({ isLoading, onReport }: Props) {
  return (
    <View style={{ gap: 14 }}>
      <StepHeader step={3} totalSteps={4} />
      <OnboardingHero
        iconLabel="📍"
        title="Enable location"
        description="We use your location to suggest the best card the moment you walk into a store."
        gradient="cool"
      />
      {/* Request background access so geofenced best-card alerts (workflow 10)
          can fire even when the app is in the background. The native prompt
          asks for foreground first; users can grant only foreground without
          breaking onboarding. */}
      <LocationPermissionPrompt disabled={isLoading} scope="background" onReport={onReport} />
      <ReasonCard
        title="Always-on for geofenced alerts"
        body="Background access lets us nudge you with the best card the moment you arrive at a store. You can grant only 'while using' here and upgrade later from Profile."
      />
    </View>
  );
}
