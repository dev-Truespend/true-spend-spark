import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionLabel } from "@/shared/components/SectionLabel";
import type { RecentVisit } from "@/features/cards/types/home.types";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";

type Props = {
  visits: RecentVisit[];
  onSelect: (visit: RecentVisit) => void;
};

export function RecentVisits({ visits, onSelect }: Props) {
  const styles = useThemedStyles(buildStyles);
  if (visits.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionLabel>Recent visits</SectionLabel>
      {visits.map((visit, index) => (
        <Pressable
          key={`${visit.merchant.id}-${index}`}
          onPress={() => onSelect(visit)}
          accessibilityRole="button"
          accessibilityLabel={`Best card for ${visit.merchant.name}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Ionicons name="time-outline" size={18} color={styles.icon.color} />
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>
              {visit.merchant.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={styles.chevron.color} />
        </Pressable>
      ))}
    </View>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    wrap: { gap: t.spacing.xs },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      borderRadius: t.radii.lg,
      backgroundColor: t.colors.surface
    },
    pressed: { opacity: 0.7 },
    text: { flex: 1 },
    name: { fontFamily: t.fontFamily.semibold, fontWeight: "600", color: t.colors.text },
    icon: { color: t.colors.mutedFg },
    chevron: { color: t.colors.mutedFg }
  });
}
