import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { Toast } from "@/shared/components/Toast";
import { CardEmptyState } from "@/features/cards/components/CardEmptyState";
import { CardListItem } from "@/features/cards/components/CardListItem";
import { CardsSkeleton } from "@/features/cards/components/CardsSkeleton";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { PlaidLinkCancelledError, useAddPlaidConnection } from "@/features/plaid/hooks/usePlaidConnections";
import { friendlyMessage } from "@/shared/errors/friendlyMessage";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";

type SourceFilter = "all" | "plaid" | "manual";

export function CardsScreen() {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);
  const { cards, limits, isLoading: cardsLoading, error: cardsError } = useCardsList();
  const addPlaidMutation = useAddPlaidConnection();
  const gate = useEntitlementGate();
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
      Alert.alert("Couldn't link bank", friendlyMessage(err, "plaid"));
    }
  }

  function handleBrowseCatalog() {
    router.push("/(app)/cards/catalog");
  }

  function handleUpgrade() {
    router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.fill}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel>My cards</SectionLabel>

        {cardsLoading && !hasCards ? <CardsSkeleton /> : null}
        {cardsError ? <Toast tone="error" message={cardsError} /> : null}

        {!cardsLoading && !cardsError && !hasCards ? (
          <CardEmptyState
            onAddManual={handleAddManual}
            onConnectPlaid={handleConnectPlaid}
            onBrowseCatalog={handleBrowseCatalog}
            onUpgrade={handleUpgrade}
            plaidEnabled={plaidEnabled}
          />
        ) : null}

        {hasCards ? (
          <>
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
      </ScrollView>
    </SafeAreaView>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    fill: { flex: 1, backgroundColor: t.colors.background },
    content: {
      paddingHorizontal: t.spacing.md,
      paddingTop: t.spacing.sm,
      paddingBottom: t.spacing.lg + 80,
      gap: t.spacing.md
    },
    stack: { paddingBottom: 8 },
    statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    actions: { gap: 8 }
  });
}
