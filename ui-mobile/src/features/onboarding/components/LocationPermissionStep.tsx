import { Text, View } from "react-native";
import { onboardingPanelStyles as styles } from "@/features/onboarding/components/onboardingStyles";
import { LocationPermissionPrompt } from "@/features/permissions/components/LocationPermissionPrompt";
import { PermissionState } from "@/features/permissions/types/permissions.types";

type Props = {
  isLoading: boolean;
  onReport: (state: PermissionState) => void;
};

export function LocationPermissionStep({ isLoading, onReport }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Location</Text>
      <Text style={styles.body}>
        TrueSpend uses your location to recommend the best card at nearby merchants. Granting &ldquo;Always&rdquo; lets us alert you with the best card the moment you arrive at a known place.
      </Text>
      <LocationPermissionPrompt disabled={isLoading} onReport={onReport} />
    </View>
  );
}
