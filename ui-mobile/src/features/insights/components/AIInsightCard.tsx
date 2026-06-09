import { Pressable, StyleSheet, Text, View } from "react-native";
import { AIInsight } from "@/features/insights/types/analytics.types";
import { colors, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  insight: AIInsight;
  onDismiss: (id: number) => void;
};

const PRIORITY_TONE: Record<string, keyof typeof tints> = {
  high: "red",
  medium: "amber",
  low: "muted"
};

export function AIInsightCard({ insight, onDismiss }: Props) {
  const tone = PRIORITY_TONE[insight.priority] ?? "muted";
  const t = tints[tone];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 {insight.title}</Text>
        <Pressable onPress={() => onDismiss(insight.id)} hitSlop={8}>
          <Text style={styles.dismiss}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.body}>{insight.body}</Text>
      <View style={[styles.tag, { backgroundColor: t.bg }]}>
        <Text style={[styles.tagText, { color: t.fg }]}>
          {insight.priority.toUpperCase()} · {insight.typeCode.replace(/_/g, " ")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tints.teal.wash,
    borderColor: tints.teal.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    gap: 8
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: colors.teal, flex: 1 },
  dismiss: { fontFamily: fontFamily.bold, fontSize: scaleFont(14), color: colors.mutedFg, paddingHorizontal: 4 },
  body: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.text, lineHeight: 19 },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  tagText: { fontFamily: fontFamily.heavy, fontSize: scaleFont(9), fontWeight: "800", letterSpacing: 0.6 }
});
