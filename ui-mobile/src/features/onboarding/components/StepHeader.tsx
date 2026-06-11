import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type StepHeaderProps = {
  step: number;
  totalSteps: number;
  onSkip?: () => void;
  skipLabel?: string;
};

export function StepHeader({ step, totalSteps, onSkip, skipLabel = "Skip" }: StepHeaderProps) {
  const styles = useThemedStyles(buildStyles);
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

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    step: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), color: t.colors.mutedFg },
    skip: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: t.colors.primary }
  });
