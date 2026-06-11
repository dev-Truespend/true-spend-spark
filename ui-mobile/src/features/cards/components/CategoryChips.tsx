import { StyleSheet, Text, View } from "react-native";
import { Chip, ChipRow } from "@/shared/components/Chip";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Category = { code: string; displayName: string; icon?: string | null };

type Props = {
  categories: Category[];
  activeCode: string;
  onChange: (code: string) => void;
  ambiguous?: boolean;
  merchantName?: string;
  categoryDisplayName?: string;
  title?: string;
  hint?: string;
};

export function CategoryChips({
  categories,
  activeCode,
  onChange,
  ambiguous = false,
  merchantName,
  categoryDisplayName,
  title,
  hint
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);

  if (!categories.length) return null;

  const resolvedTitle =
    title ??
    (ambiguous
      ? "What are you buying?"
      : categoryDisplayName
        ? `Looks like ${categoryDisplayName.toLowerCase()}`
        : "Looks like a match");

  const resolvedHint =
    hint ??
    (ambiguous
      ? merchantName
        ? `${merchantName} spans multiple categories — picking one fine-tunes the suggestion.`
        : "Picking a category fine-tunes the suggestion."
      : merchantName
        ? `Based on your ${merchantName} history. Change it if you're buying something else.`
        : "Change it if you're buying something else.");

  const toneSet = ambiguous
    ? { wash: theme.tints.amber.wash, border: theme.tints.amber.border, title: theme.colors.amberText }
    : { wash: theme.tints.purple.wash, border: theme.tints.purple.border, title: theme.colors.accent };

  return (
    <View style={[styles.card, { backgroundColor: toneSet.wash, borderColor: toneSet.border }]}>
      <Text style={[styles.title, { color: toneSet.title }]}>🛒 {resolvedTitle}</Text>
      <Text style={styles.hint}>{resolvedHint}</Text>
      <ChipRow>
        {categories.map((c) => (
          <Chip
            key={c.code}
            label={c.icon ? `${c.icon} ${c.displayName}` : c.displayName}
            active={c.code === activeCode}
            onPress={() => onChange(c.code)}
          />
        ))}
      </ChipRow>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: radii.xxl,
      padding: 14,
      gap: 6
    },
    title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14) },
    hint: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: t.colors.mutedFg, lineHeight: 17 }
  });
