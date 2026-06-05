import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { CardEmptyState } from "@/features/cards/components/CardEmptyState";
import { CardListItem } from "@/features/cards/components/CardListItem";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export function CardsScreen() {
  const router = useRouter();
  const { cards, limits, isLoading, error } = useCardsList();
  const gate = useEntitlementGate();

  const plaidEnabled = gate.has("plaid_linking_enabled");
  const atPlaidLimit = !limits?.unlimited && limits?.plaidLimit != null && limits.plaidUsed >= limits.plaidLimit;
  const atManualLimit = !limits?.unlimited && limits?.manualLimit != null && limits.manualUsed >= limits.manualLimit;
  const hasCards = cards.length > 0;

  function handleCardPress(cardId: number) {
    router.push(`/(app)/cards/${cardId}`);
  }

  function handleAddManual() {
    router.push("/(app)/cards/new");
  }

  function handleConnectPlaid() {
    router.push("/(app)/cards/plaid-connections");
  }

  function handleBrowseCatalog() {
    router.push("/(app)/cards/new");
  }

  function handleUpgrade() {
    router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your cards</Text>

        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!isLoading && !error && !hasCards ? (
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
            {cards.map((card) => (
              <CardListItem key={card.id} card={card} onPress={handleCardPress} />
            ))}

            {(atPlaidLimit || atManualLimit) && !limits?.unlimited ? (
              <View style={styles.limitBanner}>
                <Text style={styles.limitText}>
                  You&apos;ve reached your card limit on the free plan. Upgrade to add more.
                </Text>
                <Button label="Upgrade to Pro" onPress={handleUpgrade} variant="primary" />
              </View>
            ) : null}

            {!plaidEnabled ? (
              <View style={styles.limitBanner}>
                <Text style={styles.limitText}>
                  Bank account linking is a Pro feature. Upgrade to connect Plaid accounts.
                </Text>
                <Button label="Upgrade to Pro" onPress={handleUpgrade} variant="primary" />
              </View>
            ) : null}

            <View style={styles.addRow}>
              {!atManualLimit ? (
                <Button label="Add card manually" onPress={handleAddManual} variant="secondary" />
              ) : null}
              {plaidEnabled && !atPlaidLimit ? (
                <Button label="Connect bank account" onPress={handleConnectPlaid} variant="secondary" />
              ) : null}
            </View>
          </>
        ) : null}
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
    fontSize: 28,
    fontWeight: "800"
  },
  limitBanner: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  limitText: {
    color: colors.muted,
    fontSize: 14
  },
  addRow: {
    gap: spacing.sm
  },
  error: {
    color: colors.danger
  }
});
