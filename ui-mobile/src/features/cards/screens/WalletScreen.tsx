import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { Toast } from "@/shared/components/Toast";
import { CardEmptyState } from "@/features/cards/components/CardEmptyState";
import { CardListItem } from "@/features/cards/components/CardListItem";
import { CardsSkeleton } from "@/features/cards/components/CardsSkeleton";
import { CategoryChips } from "@/features/cards/components/CategoryChips";
import { Greeting } from "@/features/cards/components/Greeting";
import { PortfolioSummary } from "@/features/cards/components/PortfolioSummary";
import { RecommendationCard } from "@/features/cards/components/RecommendationCard";
import { RunnerUpList } from "@/features/cards/components/RunnerUpList";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useHomeRecommendations } from "@/features/cards/hooks/useHomeRecommendations";
import { PlaidLinkCancelledError, useAddPlaidConnection } from "@/features/plaid/hooks/usePlaidConnections";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { useAuth } from "@/providers/AuthProvider";

type SourceFilter = "all" | "plaid" | "manual";

export function WalletScreen() {
  const router = useRouter();
  const { cards, limits, isLoading: cardsLoading, error: cardsError } = useCardsList();
  const addPlaidMutation = useAddPlaidConnection();
  const gate = useEntitlementGate();
  const { bootstrap } = useAuth();
  const home = useHomeRecommendations();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const plaidEnabled = gate.has("plaid_linking_enabled");
  const atPlaidLimit = !limits?.unlimited && limits?.plaidLimit != null && limits.plaidUsed >= limits.plaidLimit;
  const atManualLimit = !limits?.unlimited && limits?.manualLimit != null && limits.manualUsed >= limits.manualLimit;
  const hasCards = cards.length > 0;
  const plaidCount = useMemo(() => cards.filter((c) => c.source === "plaid").length, [cards]);
  const manualCount = useMemo(() => cards.filter((c) => c.source === "manual").length, [cards]);
  const visibleCards = useMemo(() => {
    if (sourceFilter === "all") return cards;
    return cards.filter((c) => c.source === sourceFilter);
  }, [cards, sourceFilter]);

  const displayName = bootstrap?.profile.displayName ?? null;
  const firstName = displayName?.split(" ")[0] ?? null;
  const recommendation = home.response?.recommendation;
  const portfolio = home.response?.portfolio ?? [];
  const categoryDisplayName =
    home.categories.find((c) => c.code === recommendation?.categoryCode)?.displayName ?? undefined;

  function handleCardPress(cardId: number) {
    router.push(`/(app)/cards/${cardId}`);
  }

  function handleAddManual() {
    router.push("/(app)/cards/new");
  }

  async function handleConnectPlaid() {
    try {
      await addPlaidMutation.mutateAsync();
      router.push("/(app)/cards/plaid-connections");
    } catch (err) {
      if (err instanceof PlaidLinkCancelledError) return;
      Alert.alert("Couldn't link bank", err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleBrowseCatalog() {
    router.push("/(app)/cards/catalog");
  }

  function handleUpgrade() {
    router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } });
  }

  return (
    <Screen scroll>
      <Greeting name={firstName} />

      {cardsLoading && !hasCards ? <CardsSkeleton /> : null}
      {cardsError ? <Toast tone="error" message={cardsError} /> : null}
      {home.error ? <Toast tone="error" message={home.error} /> : null}

      {!cardsLoading && !cardsError && !hasCards ? (
        <CardEmptyState
          onAddManual={handleAddManual}
          onConnectPlaid={handleConnectPlaid}
          onBrowseCatalog={handleBrowseCatalog}
          onUpgrade={handleUpgrade}
          plaidEnabled={plaidEnabled}
        />
      ) : null}

      {hasCards && recommendation ? (
        <RecommendationCard
          recommendation={{ ...recommendation, categoryDisplayName }}
          onOpenCard={() => home.openCardDetails(recommendation.recommendedCard.card.id)}
          onRefresh={() => void home.refresh()}
        />
      ) : null}

      {hasCards && recommendation && recommendation.merchant && home.categories.length > 0 ? (
        <CategoryChips
          categories={home.categories}
          activeCode={recommendation.categoryCode}
          onChange={(code) => void home.changeCategory(code)}
          ambiguous={recommendation.merchant.isMultiCategory}
          merchantName={recommendation.merchant.name}
          categoryDisplayName={categoryDisplayName}
        />
      ) : null}

      {hasCards && recommendation && recommendation.runnerUpCards.length > 0 ? (
        <RunnerUpList
          runnerUps={recommendation.runnerUpCards.map((r) => ({
            ...r,
            card: { ...r.card, issuerName: r.card.issuerName, lastFour: r.card.lastFour },
            reason: r.reason
          }))}
          onSelect={(id) => home.openCardDetails(id)}
        />
      ) : null}

      {hasCards ? (
        <>
          <SectionLabel>Your cards</SectionLabel>
          <SegmentedControl
            value={sourceFilter}
            onChange={(next: SourceFilter) => setSourceFilter(next)}
            options={[
              { label: `All · ${cards.length}`, value: "all" },
              { label: `Plaid · ${plaidCount}`, value: "plaid" },
              { label: `Manual · ${manualCount}`, value: "manual" }
            ]}
          />

          <View style={styles.stack}>
            {visibleCards.map((card, i) => (
              <CardListItem key={card.id} card={card} onPress={handleCardPress} index={i} peek />
            ))}
          </View>

          {cards.some((c) => c.isPrimary || c.syncStatus === "disconnected") ? (
            <View style={styles.statusRow}>
              {cards.filter((c) => c.isPrimary).map((c) => (
                <Badge key={`primary-${c.id}`} tone="blue" label={`Primary · ${c.displayName}`} />
              ))}
              {cards.filter((c) => c.syncStatus === "disconnected").map((c) => (
                <Badge key={`reconnect-${c.id}`} tone="amber" label={`Reconnect · ${c.displayName}`} />
              ))}
            </View>
          ) : null}

          {(atPlaidLimit || atManualLimit) && !limits?.unlimited ? (
            <Toast tone="warn" message="You've reached your card limit on the Basic plan. Upgrade to add more." />
          ) : null}

          {!plaidEnabled ? (
            <Toast tone="info" message="Bank linking is a Pro feature. Upgrade to connect Plaid accounts." />
          ) : null}

          {portfolio.length > 0 && !recommendation ? (
            <PortfolioSummary cards={portfolio} onOpenCard={(id) => home.openCardDetails(id)} />
          ) : null}

          <View style={styles.actions}>
            <SectionLabel>Add another</SectionLabel>
            {!atManualLimit ? (
              <Button label="＋ Add card manually" onPress={handleAddManual} variant="outline" />
            ) : null}
            {plaidEnabled && !atPlaidLimit ? (
              <Button
                label="Connect bank account"
                onPress={handleConnectPlaid}
                disabled={addPlaidMutation.isPending}
                variant="outline"
              />
            ) : null}
            {(atPlaidLimit || atManualLimit || !plaidEnabled) && !limits?.unlimited ? (
              <Button label="Upgrade to Pro" onPress={handleUpgrade} />
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { paddingBottom: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actions: { gap: 8 }
});
