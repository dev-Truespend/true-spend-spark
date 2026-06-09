import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/shared/components/Card";
import { ProgressBar } from "@/shared/components/ProgressBar";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { RewardBreakdownItem } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = { items: RewardBreakdownItem[] };

export function CategoryBreakdownList({ items }: Props) {
  if (items.length === 0) return null;
  const max = items.reduce((m, item) => Math.max(m, item.earned.amount), 0);
  const safeMax = max > 0 ? max : 1;

  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>By category</SectionLabel>
      <Card>
        <View style={{ gap: 12 }}>
          {items.map((item) => (
            <View key={item.key} style={{ gap: 6 }}>
              <View style={styles.row}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.amount}>{item.earned.display}</Text>
              </View>
              <ProgressBar value={item.earned.amount / safeMax} />
              {item.missed && item.missed.amount > 0 ? (
                <Text style={styles.missed}>Missed {item.missed.display}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: colors.text },
  amount: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: colors.text },
  missed: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.amberText }
});
