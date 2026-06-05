import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AIInsight } from "@/features/insights/types/analytics.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  insight: AIInsight;
  onDismiss: (id: number) => void;
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "#B42318",
  medium: "#B45309",
  low: colors.muted
};

export function AIInsightCard({ insight, onDismiss }: Props) {
  const priorityColor = PRIORITY_COLOR[insight.priority] ?? colors.muted;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <Text style={styles.title}>{insight.title}</Text>
        <TouchableOpacity onPress={() => onDismiss(insight.id)} hitSlop={8}>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>{insight.body}</Text>
      <Text style={styles.type}>{insight.typeCode.replace(/_/g, " ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1
  },
  dismiss: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600"
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  type: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  }
});
