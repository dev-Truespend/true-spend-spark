import { View, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { spacing } from "@/shared/theme/spacing";

type Period = "monthly" | "annual";

type Props = {
  value: string;
  onChange: (period: Period) => void;
};

export function PeriodToggle({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Button label="Monthly" onPress={() => onChange("monthly")} variant={value === "monthly" ? "primary" : "secondary"} />
      <Button label="Annual" onPress={() => onChange("annual")} variant={value === "annual" ? "primary" : "secondary"} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
