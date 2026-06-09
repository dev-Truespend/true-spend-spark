import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card } from "@/shared/components/Card";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { RewardBreakdownItem } from "@/features/insights/types/analytics.types";
import { colors, gradients } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = { items: RewardBreakdownItem[] };

export function DailyBreakdownChart({ items }: Props) {
  if (items.length === 0) return null;
  const max = items.reduce((m, i) => Math.max(m, i.earned.amount), 0);
  const safeMax = max > 0 ? max : 1;

  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>Daily earnings</SectionLabel>
      <Card>
        <View style={styles.chart}>
          {items.map((item) => {
            const ratio = Math.max(0.05, item.earned.amount / safeMax);
            const isWarm = item.missed && item.missed.amount > 0;
            return (
              <View key={item.key} style={styles.column}>
                <View style={styles.barWrap}>
                  <LinearGradient
                    colors={isWarm ? [...gradients.warm] : [...gradients.brand]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.bar, { height: `${ratio * 100}%` }]}
                  />
                </View>
                <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 100, paddingTop: 6 },
  column: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  barWrap: { flex: 1, justifyContent: "flex-end", width: "100%" },
  bar: { width: "100%", borderRadius: 4, minHeight: 8 },
  label: { fontFamily: fontFamily.medium, fontSize: scaleFont(9), color: colors.mutedFg }
});
