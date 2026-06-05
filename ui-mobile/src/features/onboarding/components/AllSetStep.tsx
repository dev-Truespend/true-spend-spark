import { Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { onboardingPanelStyles as styles } from "@/features/onboarding/components/onboardingStyles";

type Props = { isLoading: boolean; onFinish: () => void };

export function AllSetStep({ isLoading, onFinish }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>All set</Text>
      <Button disabled={isLoading} label="Go to Home" onPress={onFinish} />
    </View>
  );
}
