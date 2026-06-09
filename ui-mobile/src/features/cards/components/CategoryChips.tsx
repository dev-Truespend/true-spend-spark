import { StyleSheet, Text, View } from "react-native";
import { Chip, ChipRow } from "@/shared/components/Chip";
import { colors, tints } from "@/shared/theme/colors";
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

  const palette = ambiguous ? AMBER : PURPLE;

  return (
    <View style={[styles.card, { backgroundColor: palette.wash, borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.title }]}>🛒 {resolvedTitle}</Text>
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

const PURPLE = { wash: tints.purple.wash, border: tints.purple.border, title: colors.accent };
const AMBER = { wash: tints.amber.wash, border: tints.amber.border, title: colors.amberText };

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.xxl,
    padding: 14,
    gap: 6
  },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14) },
  hint: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg, lineHeight: 17 }
});
