import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Card } from "@/shared/components/Card";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { colors, palette } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { RewardBreakdownItem } from "@/features/insights/types/analytics.types";

// Mockup 6.3 "Where it came from" donut. Four-color rotation cycles the brand
// palette so the chart stays visually consistent with the rest of the app.
const SLICE_COLORS = [
  palette.brandBlue,
  palette.brandPurple,
  palette.brandAmber,
  palette.brandTeal,
  palette.success,
  palette.destructive
] as const;

type Props = {
  items: RewardBreakdownItem[];
  size?: number;
  thickness?: number;
};

export function CategoryDonutChart({ items, size = 140, thickness = 22 }: Props) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.earned.amount), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const slices = useMemo(() => {
    if (total <= 0) return [] as Array<{ key: string; color: string; offset: number; length: number; pct: number; label: string; display: string }>;
    let cursor = 0;
    return items.map((item, index) => {
      const value = Math.max(0, item.earned.amount);
      const pct = value / total;
      const slice = {
        key: item.key,
        color: SLICE_COLORS[index % SLICE_COLORS.length],
        offset: cursor * circumference,
        length: pct * circumference,
        pct,
        label: item.label,
        display: item.earned.display
      };
      cursor += pct;
      return slice;
    });
  }, [items, total, circumference]);

  if (total <= 0 || slices.length === 0) return null;

  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>Where it came from</SectionLabel>
      <Card>
        <View style={styles.row}>
          <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size}>
              {/* base ring keeps a faint track so very small slices stay legible */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.surfaceAlt}
                strokeWidth={thickness}
                fill="none"
              />
              <G rotation={-90} originX={size / 2} originY={size / 2}>
                {slices.map((slice) => (
                  <Circle
                    key={slice.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={thickness}
                    fill="none"
                    strokeDasharray={`${slice.length} ${circumference}`}
                    strokeDashoffset={-slice.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </G>
            </Svg>
          </View>
          <View style={styles.legend}>
            {slices.map((slice) => (
              <View key={slice.key} style={styles.legendRow}>
                <View style={[styles.swatch, { backgroundColor: slice.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>{slice.label}</Text>
                <Text style={styles.legendValue}>{Math.round(slice.pct * 100)}%</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), color: colors.text },
  legendValue: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(12), color: colors.mutedFg, fontVariant: ["tabular-nums"] }
});
