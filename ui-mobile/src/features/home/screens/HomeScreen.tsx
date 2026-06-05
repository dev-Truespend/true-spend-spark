import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useHomeRecommendations } from "@/features/home/hooks/useHomeRecommendations";
import { isEmptyHome } from "@/features/home/mappers/homeState.mapper";
import { CategoryChips } from "@/features/home/components/CategoryChips";
import { DetectMerchantPanel } from "@/features/home/components/DetectMerchantPanel";
import { HomeEmptyState } from "@/features/home/components/HomeEmptyState";
import { RecommendationCard } from "@/features/home/components/RecommendationCard";
import { RunnerUpList } from "@/features/home/components/RunnerUpList";

export function HomeScreen() {
  const router = useRouter();
  const home = useHomeRecommendations();
  const recommendation = home.response?.recommendation;
  const emptyState = home.response?.emptyState;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Home</Text>
          <TouchableOpacity
            accessibilityLabel="Open notifications"
            onPress={() => router.push("/(app)/notifications")}
            style={styles.bellButton}
          >
            <Text style={styles.bellLabel}>Inbox</Text>
          </TouchableOpacity>
        </View>
        {home.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {home.error ? <Text style={styles.error}>{home.error}</Text> : null}

        {isEmptyHome(home.response) && emptyState ? (
          <HomeEmptyState
            title={emptyState.title}
            body={emptyState.body}
            upgradeMessage={emptyState.upgradeMessage}
            onAddCard={home.openAddCard}
            onConnectBank={home.openConnectBank}
            onUpgrade={home.openUpgrade}
          />
        ) : null}

        {recommendation ? (
          <RecommendationCard
            recommendation={recommendation}
            onOpenCard={() => home.openCardDetails(recommendation.recommendedCard.card.id)}
            onRefresh={() => void home.refresh()}
          />
        ) : null}

        <DetectMerchantPanel onDetect={(name) => void home.detectMerchant(name)} />

        {recommendation ? (
          <CategoryChips
            categories={home.categories}
            activeCode={recommendation.categoryCode}
            onChange={(code) => void home.changeCategory(code)}
          />
        ) : null}

        {recommendation ? <RunnerUpList runnerUps={recommendation.runnerUpCards} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 28,
    fontWeight: "800"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  bellButton: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  bellLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600"
  },
  error: {
    color: colors.danger
  }
});
