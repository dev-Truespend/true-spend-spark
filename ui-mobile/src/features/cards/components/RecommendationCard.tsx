import { Pressable, StyleSheet, Text, View } from "react-native";
import { GradientHeroCard } from "@/shared/components/GradientHeroCard";
import { LocationBanner } from "@/shared/components/LocationBanner";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { Toast } from "@/shared/components/Toast";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type RecommendationVm = {
  merchant: { name: string; address?: string | null };
  recommendedCard: {
    card: { displayName: string; issuerName: string; lastFour?: string | null };
    expectedReward: { display: string };
  };
  reason: string;
  coverageWarning?: string | null;
  categoryDisplayName?: string;
};

type Props = {
  recommendation: RecommendationVm;
  onOpenCard: () => void;
  onRefresh: () => void;
};

function heroGradient(reason: string): "brand" | "warm" | "cool" | "dark" | "purple" {
  // Pick a gradient by keyword in reason — keeps the same visual variety as the mockup.
  const r = reason.toLowerCase();
  if (r.includes("grocer") || r.includes("dining") || r.includes("food")) return "warm";
  if (r.includes("travel") || r.includes("transit") || r.includes("gas")) return "cool";
  if (r.includes("entertain") || r.includes("stream")) return "purple";
  return "brand";
}

export function RecommendationCard({ recommendation, onOpenCard, onRefresh }: Props) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      refresh: {
        alignSelf: "flex-end",
        fontFamily: fontFamily.semibold,
        fontWeight: "600",
        fontSize: scaleFont(12),
        color: t.colors.primary
      }
    })
  );
  const card = recommendation.recommendedCard.card;
  const category = recommendation.categoryDisplayName ?? "this purchase";
  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={onRefresh}>
        <LocationBanner
          title={`You're at ${recommendation.merchant.name}`}
          meta={recommendation.merchant.address ?? "Detected nearby"}
        />
      </Pressable>

      <Pressable onPress={onOpenCard}>
        <GradientHeroCard
          tag={`⭐ Best card for ${category}`}
          title={`Use ${card.displayName}`}
          subtitle={recommendation.reason}
          amount={recommendation.recommendedCard.expectedReward.display}
          amountLabel="estimated reward"
          cardName={card.issuerName}
          cardNumber={card.lastFour ? `•• ${card.lastFour}` : ""}
          gradient={heroGradient(recommendation.reason)}
        />
      </Pressable>

      {recommendation.coverageWarning ? (
        <Toast tone="warn" message={recommendation.coverageWarning} />
      ) : null}

      <ReasonCard icon="💡" title="Why this card?" body={recommendation.reason} />

      <Pressable onPress={onRefresh} accessibilityRole="button" hitSlop={6}>
        <Text style={styles.refresh}>↻ Refresh</Text>
      </Pressable>
    </View>
  );
}
