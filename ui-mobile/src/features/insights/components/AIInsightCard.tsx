import { Pressable, StyleSheet, Text, View } from "react-native";
import { AIInsight } from "@/features/insights/types/analytics.types";
import { TintName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  insight: AIInsight;
  onDismiss: (id: number) => void;
};

const PRIORITY_TONE: Record<string, TintName> = {
  high: "red",
  medium: "amber",
  low: "muted"
};

export function AIInsightCard({ insight, onDismiss }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const tone = PRIORITY_TONE[insight.priority] ?? "muted";
  const t = theme.tints[tone];

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

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.tints.teal.wash,
      borderColor: t.tints.teal.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: 12,
      gap: 8
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: t.colors.teal, flex: 1 },
    dismiss: { fontFamily: fontFamily.bold, fontSize: scaleFont(14), color: t.colors.mutedFg, paddingHorizontal: 4 },
    body: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.text, lineHeight: 19 },
    tag: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999
    },
    tagText: { fontFamily: fontFamily.heavy, fontSize: scaleFont(9), fontWeight: "800", letterSpacing: 0.6 }
  });
