import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "rewards", label: "Rewards" },
  { key: "security", label: "Security" }
] as const;

type Filter = typeof FILTERS[number]["key"];

type Props = {
  activeFilter: Filter;
  onFilterChange: (filter: Filter) => void;
};

export function NotificationFilterTabs({ activeFilter, onFilterChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[styles.tab, activeFilter === f.key && styles.activeTab]}
          onPress={() => onFilterChange(f.key)}
        >
          <Text style={[styles.label, activeFilter === f.key && styles.activeLabel]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginBottom: spacing.md
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: 2
  },
  tab: {
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500"
  },
  activeLabel: {
    color: colors.primaryText
  }
});
