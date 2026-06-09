import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative";
  style?: ViewStyle;
};

export function StatCard({ label, value, delta, deltaTone = "positive", style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {delta ? (
        <Text
          style={[
            styles.delta,
            { color: deltaTone === "negative" ? colors.destructive : colors.successText }
          ]}
        >
          {delta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 12
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: scaleFont(10),
    fontWeight: "700",
    color: colors.mutedFg,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  value: { fontFamily: fontFamily.heavy, fontSize: scaleFont(18), fontWeight: "800", color: colors.text, letterSpacing: -0.4, marginTop: 4 },
  delta: { fontFamily: fontFamily.bold, fontSize: scaleFont(11), fontWeight: "700", marginTop: 4 }
});
