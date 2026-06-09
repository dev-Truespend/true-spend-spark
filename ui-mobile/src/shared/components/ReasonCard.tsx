import { StyleSheet, Text, View } from "react-native";
import { colors, tints, TintName } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type ReasonCardProps = {
  title?: string;
  body: string;
  icon?: string;
  tone?: Extract<TintName, "teal" | "blue" | "purple" | "amber" | "green">;
};

export function ReasonCard({ title = "Why this card?", body, icon = "✦", tone = "teal" }: ReasonCardProps) {
  const palette = tints[tone];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.bg, borderColor: borderFor(tone) }
      ]}
    >
      <Text style={[styles.title, { color: palette.fg }]}>
        {icon} {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

function borderFor(tone: ReasonCardProps["tone"]) {
  switch (tone) {
    case "blue":
      return "rgba(55, 125, 246, 0.25)";
    case "purple":
      return "rgba(155, 52, 234, 0.25)";
    case "amber":
      return "rgba(245, 147, 10, 0.3)";
    case "green":
      return "rgba(34, 197, 94, 0.25)";
    case "teal":
    default:
      return "rgba(24, 132, 165, 0.25)";
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    gap: 6
  },
  title: {
    fontFamily: fontFamily.bold,
    fontWeight: "700",
    fontSize: scaleFont(11),
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  body: { color: colors.text, fontFamily: fontFamily.regular, fontSize: scaleFont(13), lineHeight: 19 }
});
