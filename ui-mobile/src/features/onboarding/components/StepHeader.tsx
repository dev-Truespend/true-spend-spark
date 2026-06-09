import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type StepHeaderProps = {
  step: number;
  totalSteps: number;
  onSkip?: () => void;
  skipLabel?: string;
};

export function StepHeader({ step, totalSteps, onSkip, skipLabel = "Skip" }: StepHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.step}>Step {step} of {totalSteps}</Text>
      {onSkip ? (
        <Pressable accessibilityRole="button" onPress={onSkip}>
          <Text style={styles.skip}>{skipLabel}</Text>
        </Pressable>
      ) : <View />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  step: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), color: colors.mutedFg },
  skip: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: colors.primary }
});
