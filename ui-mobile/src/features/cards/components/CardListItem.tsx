import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/shared/components/Badge";
import { CreditCard } from "@/shared/components/CreditCard";
import { CardSummary } from "@/features/cards/types/cards.types";
import { colors, GradientName } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  card: CardSummary;
  onPress: (cardId: number) => void;
  index?: number;
  // When true, render in peek-stack mode (compact name+last4 layout) with
  // negative top margin for items after the first. Used by CardsScreen.
  peek?: boolean;
};

const VARIANTS: Array<Extract<GradientName, "brand" | "purple" | "cool" | "gold" | "dark">> = [
  "brand",
  "purple",
  "cool",
  "gold",
  "dark"
];

// Mockup: .card-stack .cc-card + .cc-card { margin-top: -72px }
const PEEK_OVERLAP = -72;

export function CardListItem({ card, onPress, index = 0, peek }: Props) {
  const isDisconnected = card.syncStatus === "disconnected";
  const variant = VARIANTS[index % VARIANTS.length]!;

  if (peek) {
    return (
      <View style={[styles.peekWrap, index > 0 && { marginTop: PEEK_OVERLAP }]}>
        <CreditCard
          name={card.displayName}
          last4={card.lastFour ?? "0000"}
          issuer={card.issuerName}
          network={card.source === "plaid" ? "Plaid linked" : "Manual"}
          variant={variant}
          stackMode
          onPress={() => onPress(card.id)}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CreditCard
        name={card.displayName}
        last4={card.lastFour ?? "0000"}
        issuer={card.issuerName}
        network={card.source === "plaid" ? "Plaid linked" : "Manual"}
        variant={variant}
        size="md"
        onPress={() => onPress(card.id)}
      />
      <View style={styles.metaRow}>
        {card.isPrimary ? <Badge tone="blue" label="Primary" /> : null}
        {isDisconnected ? <Badge tone="amber" label="Reconnect needed" /> : null}
        {!card.isPrimary && !isDisconnected ? <Text style={styles.tap}>Tap card →</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 4 },
  peekWrap: {},
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tap: { fontFamily: fontFamily.medium, fontSize: scaleFont(11), color: colors.onLightHint }
});
