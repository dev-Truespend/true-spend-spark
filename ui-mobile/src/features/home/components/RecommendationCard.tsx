import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type RecommendationVm = {
  merchant: { name: string; address?: string | null };
  recommendedCard: { card: { displayName: string; issuerName: string; lastFour?: string | null }; expectedReward: { display: string } };
  reason: string;
  coverageWarning?: string | null;
};

type Props = {
  recommendation: RecommendationVm;
  onOpenCard: () => void;
  onRefresh: () => void;
};

export function RecommendationCard({ recommendation, onOpenCard, onRefresh }: Props) {
  const card = recommendation.recommendedCard.card;
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>{recommendation.merchant.name}</Text>
      <Text style={styles.body}>{recommendation.merchant.address ?? "Detected nearby"}</Text>
      {recommendation.coverageWarning ? <Text style={styles.warning}>{recommendation.coverageWarning}</Text> : null}
      <Text style={styles.cardTitle}>{card.displayName}</Text>
      <Text style={styles.body}>
        {card.issuerName}
        {card.lastFour ? ` • ${card.lastFour}` : ""}
      </Text>
      <Text style={styles.reward}>{recommendation.recommendedCard.expectedReward.display}</Text>
      <Text style={styles.body}>{recommendation.reason}</Text>
      <Button label="Open card details" onPress={onOpenCard} />
      <Button label="Refresh" onPress={onRefresh} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  cardTitle: { color: colors.text, fontSize: 24, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  reward: { color: colors.primary, fontSize: 24, fontWeight: "800" },
  warning: { color: colors.danger, fontWeight: "700" }
});
