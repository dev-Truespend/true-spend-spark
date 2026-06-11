import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/shared/components/Card";
import { MiniCardSwatch, MiniCardSwatchVariant } from "@/shared/components/MiniCardSwatch";
import { RewardRow } from "@/shared/components/RewardRow";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { TintName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/spacing";
import { PortfolioCard } from "@/features/cards/types/home.types";

type Props = {
  cards: PortfolioCard[];
  onOpenCard: (cardId: number) => void;
};

// Variants cycle deterministically by card id so the gradient stays stable
// between Home → Card detail and matches the CardsScreen peek stack.
const CARD_VARIANTS: MiniCardSwatchVariant[] = ["brand", "purple", "cool", "gold", "dark"];

const CATEGORY_TONES: Record<string, { tone: TintName; multiplierTone: TintName; icon: string }> = {
  dining:      { tone: "amber",  multiplierTone: "amber",  icon: "🍽️" },
  groceries:   { tone: "purple", multiplierTone: "purple", icon: "🥦" },
  travel:      { tone: "blue",   multiplierTone: "blue",   icon: "✈️" },
  gas:         { tone: "red",    multiplierTone: "red",    icon: "⛽" },
  streaming:   { tone: "purple", multiplierTone: "purple", icon: "🎬" },
  online:      { tone: "blue",   multiplierTone: "blue",   icon: "🛒" },
  entertainment:{ tone: "amber", multiplierTone: "amber",  icon: "🎭" },
  base:        { tone: "muted",  multiplierTone: "muted",  icon: "✨" },
  default:     { tone: "muted",  multiplierTone: "blue",   icon: "💳" }
};

function toneFor(categoryCode: string) {
  return CATEGORY_TONES[categoryCode] ?? CATEGORY_TONES.default!;
}

function variantForCard(cardId: number): MiniCardSwatchVariant {
  return CARD_VARIANTS[Math.abs(cardId) % CARD_VARIANTS.length]!;
}

export function PortfolioSummary({ cards, onOpenCard }: Props) {
  const styles = useThemedStyles(buildStyles);
  if (cards.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionLabel>Your cards</SectionLabel>
      <View style={{ gap: 10 }}>
        {cards.map((entry) => (
          <Pressable
            key={entry.card.id}
            onPress={() => onOpenCard(entry.card.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${entry.card.displayName} details`}
          >
            <Card padded={false}>
              <View style={styles.cardHeader}>
                <MiniCardSwatch
                  label={entry.card.lastFour ?? "0000"}
                  variant={variantForCard(entry.card.id)}
                />
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {entry.card.displayName}
                    {entry.card.lastFour ? ` · ${entry.card.lastFour}` : ""}
                  </Text>
                  <Text style={styles.cardIssuer} numberOfLines={1}>
                    {entry.card.issuerName}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
              <View style={styles.rows}>
                {entry.topCategories.map((cat, i) => {
                  const t = toneFor(cat.categoryCode);
                  return (
                    <RewardRow
                      key={cat.categoryCode}
                      iconLabel={t.icon}
                      iconTone={t.tone}
                      multiplierTone={t.multiplierTone}
                      label={cat.categoryName}
                      multiplier={`${cat.multiplier}×`}
                      divider={i < entry.topCategories.length - 1}
                    />
                  );
                })}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: { gap: 8 },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10
    },
    cardTitleBlock: { flex: 1, gap: 2 },
    cardTitle: {
      color: t.colors.text,
      fontFamily: fontFamily.heavy,
      fontWeight: "800",
      fontSize: scaleFont(14)
    },
    cardIssuer: {
      color: t.colors.mutedFg,
      fontFamily: fontFamily.regular,
      fontSize: scaleFont(12)
    },
    chevron: {
      color: t.colors.mutedFg,
      fontFamily: fontFamily.bold,
      fontSize: scaleFont(22),
      paddingRight: 4
    },
    rows: { paddingHorizontal: 0, borderTopWidth: 1, borderTopColor: t.colors.border, borderTopLeftRadius: radii.sm }
  });
