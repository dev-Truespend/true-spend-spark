import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/shared/components/Skeleton";
import { radii, spacing } from "@/shared/theme/spacing";

// Mirrors the peek-stack layout: a header chip, then three overlapping
// card-shaped blocks that match the heights of CreditCard stackMode.
export function CardsSkeleton() {
  return (
    <View style={styles.wrap}>
      <Skeleton height={28} width="40%" radius={radii.md} />
      <Skeleton height={36} width="100%" radius={radii.pill} />
      <View style={styles.stack}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            height={160}
            width="100%"
            radius={radii.xxl}
            style={i > 0 ? { marginTop: -72 } : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  stack: { marginTop: spacing.sm }
});
