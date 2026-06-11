import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card } from "@/shared/components/Card";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { RewardBreakdownItem } from "@/features/insights/types/analytics.types";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { formatMoneyLike } from "@/shared/utils/money";

type Props = { items: RewardBreakdownItem[] };

// Aggregated bar — may represent a single day or a bucket of days.
type Bar = {
  key: string;
  label: string;
  earned: number;
  missed: number;
  earnedDisplay: string;
  missedDisplay: string;
};

const CHART_HEIGHT = 132;
const MAX_BARS = 12;

// Backend returns only days with activity, so counts vary wildly by range
// (a couple of bars for Week/Month, dozens for Quarter/Year). Bucket evenly
// once there are more bars than we can render legibly.
function bucketize(items: RewardBreakdownItem[]): Bar[] {
  const sample = items.find((i) => i.earned.display)?.earned.display ?? "$0.00";
  if (items.length <= MAX_BARS) {
    return items.map((i) => ({
      key: i.key,
      label: i.label,
      earned: i.earned.amount,
      missed: i.missed.amount,
      earnedDisplay: i.earned.display,
      missedDisplay: i.missed.display
    }));
  }
  const size = Math.ceil(items.length / MAX_BARS);
  const bars: Bar[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const earned = chunk.reduce((s, c) => s + c.earned.amount, 0);
    const missed = chunk.reduce((s, c) => s + c.missed.amount, 0);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    bars.push({
      key: first.key,
      label: chunk.length > 1 ? `${first.label}–${last.label}` : first.label,
      earned,
      missed,
      earnedDisplay: formatMoneyLike(earned, sample),
      missedDisplay: formatMoneyLike(missed, sample)
    });
  }
  return bars;
}

export function DailyBreakdownChart({ items }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const bars = useMemo(() => bucketize(items), [items]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (bars.length === 0) return null;

  const max = bars.reduce((m, b) => Math.max(m, b.earned), 0);
  const safeMax = max > 0 ? max : 1;
  const selected = bars.find((b) => b.key === selectedKey) ?? bars[bars.length - 1];
  const showEveryLabel = bars.length <= 8;

  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>Daily earnings</SectionLabel>
      <Card>
        <View style={styles.callout}>
          <Text style={styles.calloutLabel}>{selected.label}</Text>
          <View style={styles.calloutValues}>
            <Text style={styles.calloutEarned}>{selected.earnedDisplay}</Text>
            {selected.missed > 0 ? (
              <Text style={styles.calloutMissed}>missed {selected.missedDisplay}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.chart}>
          {bars.map((bar, index) => {
            const isSelected = bar.key === selected.key;
            const ratio = bar.earned > 0 ? Math.max(0.04, bar.earned / safeMax) : 0;
            const isWarm = bar.missed > 0;
            const showLabel = showEveryLabel || index === 0 || index === bars.length - 1 || isSelected;
            return (
              <Pressable
                key={bar.key}
                style={styles.column}
                onPress={() => setSelectedKey(bar.key)}
                accessibilityRole="button"
                accessibilityLabel={`${bar.label}: earned ${bar.earnedDisplay}${bar.missed > 0 ? `, missed ${bar.missedDisplay}` : ""}`}
              >
                <View style={styles.barWrap}>
                  {ratio > 0 ? (
                    <LinearGradient
                      colors={isWarm ? [...theme.gradients.warm] : [...theme.gradients.brand]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[
                        styles.bar,
                        { height: `${ratio * 100}%` },
                        isSelected && styles.barSelected
                      ]}
                    />
                  ) : (
                    <View style={styles.barEmpty} />
                  )}
                </View>
                <Text
                  style={[styles.label, isSelected && styles.labelSelected]}
                  numberOfLines={1}
                >
                  {showLabel ? bar.label : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    callout: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    },
    calloutLabel: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), color: t.colors.mutedFg },
    calloutValues: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    calloutEarned: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(16), color: t.colors.text, letterSpacing: -0.3 },
    calloutMissed: { fontFamily: fontFamily.medium, fontSize: scaleFont(11), color: t.colors.amberText },
    chart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: CHART_HEIGHT, paddingTop: 6 },
    column: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" },
    barWrap: { flex: 1, justifyContent: "flex-end", alignItems: "center", width: "100%", alignSelf: "stretch" },
    bar: { width: "82%", maxWidth: 30, borderRadius: 6, minHeight: 6 },
    barSelected: {
      width: "100%",
      // Solid bg under the gradient lets RN compute the glow shadow efficiently.
      backgroundColor: t.colors.primary,
      shadowColor: t.colors.primary,
      shadowOpacity: 0.45,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4
    },
    barEmpty: { width: "82%", maxWidth: 30, height: 3, borderRadius: 2, backgroundColor: t.colors.border },
    label: { fontFamily: fontFamily.medium, fontSize: scaleFont(9), color: t.colors.mutedFg, height: 12 },
    labelSelected: { color: t.colors.primary, fontFamily: fontFamily.bold, fontWeight: "700" }
  });
}
