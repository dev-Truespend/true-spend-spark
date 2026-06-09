import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/shared/components/Skeleton";
import { radii, spacing } from "@/shared/theme/spacing";

export function HomeSkeleton() {
  return (
    <View style={styles.wrap}>
      {/* Location/recommendation hero */}
      <View style={styles.hero}>
        <Skeleton height={14} width={140} />
        <Skeleton height={28} width="80%" />
        <Skeleton height={16} width="60%" />
      </View>
      {/* Category chip row */}
      <View style={styles.chipRow}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={28} width={72} radius={radii.pill} />
        ))}
      </View>
      {/* Quick actions */}
      <View style={styles.quickRow}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={56} width="22%" radius={radii.lg} />
        ))}
      </View>
      {/* Runner-up cards */}
      {[0, 1].map((i) => (
        <Skeleton key={i} height={72} width="100%" radius={radii.xl} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  hero: { gap: 8, padding: spacing.md, borderRadius: radii.xl },
  chipRow: { flexDirection: "row", gap: 6 },
  quickRow: { flexDirection: "row", justifyContent: "space-between" }
});
