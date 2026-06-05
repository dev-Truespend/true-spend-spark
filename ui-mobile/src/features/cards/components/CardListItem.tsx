import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CardSummary } from "@/features/cards/types/cards.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  card: CardSummary;
  onPress: (cardId: number) => void;
};

export function CardListItem({ card, onPress }: Props) {
  const isDisconnected = card.syncStatus === "disconnected";

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(card.id)} activeOpacity={0.7}>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{card.displayName}</Text>
          {card.isPrimary ? <Text style={styles.primaryBadge}>Primary</Text> : null}
        </View>
        <Text style={styles.meta}>
          {card.issuerName}
          {card.lastFour ? ` • ${card.lastFour}` : ""}
        </Text>
        {isDisconnected ? <Text style={styles.disconnected}>Reconnect needed</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  info: {
    gap: spacing.xs
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  primaryBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    color: colors.primaryText,
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2
  },
  meta: {
    color: colors.muted,
    fontSize: 14
  },
  disconnected: {
    color: colors.danger,
    fontSize: 12
  }
});
