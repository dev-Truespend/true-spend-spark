import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative";
  style?: ViewStyle;
};

export function StatCard({ label, value, delta, deltaTone = "positive", style }: StatCardProps) {
  const t = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      card: {
        flex: 1,
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderWidth: 1,
        borderRadius: t.radii.xl,
        padding: 12
      },
      label: {
        fontFamily: fontFamily.bold,
        fontSize: scaleFont(10),
        fontWeight: "700",
        color: t.colors.mutedFg,
        letterSpacing: 0.8,
        textTransform: "uppercase"
      },
      value: { fontFamily: fontFamily.heavy, fontSize: scaleFont(18), fontWeight: "800", color: t.colors.text, letterSpacing: -0.4, marginTop: 4 },
      delta: { fontFamily: fontFamily.bold, fontSize: scaleFont(11), fontWeight: "700", marginTop: 4 }
    })
  );
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {delta ? (
        <Text
          style={[
            styles.delta,
            { color: deltaTone === "negative" ? t.colors.destructive : t.colors.successText }
          ]}
        >
          {delta}
        </Text>
      ) : null}
    </View>
  );
}
