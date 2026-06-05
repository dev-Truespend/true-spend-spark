import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AnalyticsPeriod } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

const PERIODS: { code: AnalyticsPeriod; label: string }[] = [
  { code: "week", label: "Week" },
  { code: "month", label: "Month" },
  { code: "quarter", label: "Quarter" },
  { code: "year", label: "Year" }
];

type Props = {
  selected: AnalyticsPeriod;
  onSelect: (period: AnalyticsPeriod) => void;
};

export function PeriodSelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {PERIODS.map(({ code, label }) => {
        const active = code === selected;
        return (
          <TouchableOpacity
            key={code}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onSelect(code)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm
  },
  tabActive: {
    backgroundColor: colors.primary
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  labelActive: {
    color: colors.primaryText
  }
});
