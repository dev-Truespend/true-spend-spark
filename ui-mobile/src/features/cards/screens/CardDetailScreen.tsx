import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { useCardDetail } from "@/features/cards/hooks/useCardDetail";
import { useDeleteCard } from "@/features/cards/hooks/useDeleteCard";
import { useSetPrimary } from "@/features/cards/hooks/useSetPrimary";
import {
  useDeleteRewardOverride,
  useRewardOverrides,
  useUpsertRewardOverride
} from "@/features/cards/hooks/useRewardOverrides";
import { RewardOverrideEditor } from "@/features/cards/components/RewardOverrideEditor";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

// Server stores reward currency as a code on the user card. Cash-style codes
// carry dollars in both `points` and `estimatedValue`; everything else (UR,
// MR, etc.) carries point counts in `points` and a cash estimate separately.
const CASH_REWARD_CURRENCY_CODES = new Set(["cash_back", "USD", "GBP", "EUR"]);
const isCashRewardCurrency = (code: string) => CASH_REWARD_CURRENCY_CODES.has(code);

type Props = {
  cardId: number;
};

export function CardDetailScreen({ cardId }: Props) {
  const router = useRouter();
  const { detail, isLoading, error } = useCardDetail(cardId);
  const deleteMutation = useDeleteCard();
  const setPrimaryMutation = useSetPrimary();
  const { overrides, isLoading: overridesLoading, error: overridesError } = useRewardOverrides(cardId);
  const upsertOverride = useUpsertRewardOverride(cardId);
  const deleteOverride = useDeleteRewardOverride(cardId);

  function handleDelete() {
    Alert.alert("Remove card", "Are you sure you want to remove this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteMutation.mutateAsync(cardId);
          router.back();
        }
      }
    ]);
  }

  async function handleSetPrimary() {
    await setPrimaryMutation.mutateAsync(cardId);
  }

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={styles.center} />
      </Screen>
    );
  }

  if (error || !detail) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? "Card not found."}</Text>
      </Screen>
    );
  }

  const { card, rewardRules, monthlyRewardContribution, terms } = detail;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{card.displayName}</Text>
          <Text style={styles.subtitle}>
            {card.issuerName}
            {card.lastFour ? ` • ${card.lastFour}` : ""}
          </Text>
          {card.isPrimary ? <Text style={styles.primaryBadge}>Primary card</Text> : null}
        </View>

        {monthlyRewardContribution ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This month</Text>
            {isCashRewardCurrency(monthlyRewardContribution.currencyCode) ? (
              <Text style={styles.rewardPoints}>
                ${monthlyRewardContribution.estimatedValue.toFixed(2)}
              </Text>
            ) : (
              <>
                <Text style={styles.rewardPoints}>
                  {monthlyRewardContribution.points.toLocaleString()} {monthlyRewardContribution.currencyCode}
                </Text>
                <Text style={styles.rewardValue}>
                  ≈ ${monthlyRewardContribution.estimatedValue.toFixed(2)}
                </Text>
              </>
            )}
          </View>
        ) : null}

        {rewardRules.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward rates</Text>
            {rewardRules.map((rule) => (
              <View key={rule.categoryCode} style={styles.ruleRow}>
                <Text style={styles.ruleCategory}>{rule.categoryName}</Text>
                <Text style={styles.ruleMultiplier}>{rule.multiplier}x</Text>
              </View>
            ))}
          </View>
        ) : null}

        <RewardOverrideEditor
          overrides={overrides}
          isLoading={overridesLoading}
          error={overridesError}
          isSaving={upsertOverride.isPending}
          isDeleting={deleteOverride.isPending}
          onSave={async (input) => {
            await upsertOverride.mutateAsync(input);
          }}
          onDelete={async (categoryCode) => {
            await deleteOverride.mutateAsync({ categoryCode });
          }}
        />

        {terms ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card terms</Text>
            {terms.annualFee != null ? (
              <Text style={styles.termRow}>Annual fee: ${terms.annualFee}</Text>
            ) : null}
            {terms.purchaseApr ? (
              <Text style={styles.termRow}>Purchase APR: {terms.purchaseApr}</Text>
            ) : null}
            {terms.foreignTransactionFee ? (
              <Text style={styles.termRow}>Foreign transaction: {terms.foreignTransactionFee}</Text>
            ) : null}
            {terms.termsSummary ? (
              <Text style={[styles.termRow, styles.muted]}>{terms.termsSummary}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          {!card.isPrimary ? (
            <Button
              label="Set as primary"
              onPress={handleSetPrimary}
              disabled={setPrimaryMutation.isPending}
            />
          ) : null}
          <Button
            label="Remove card"
            onPress={handleDelete}
            variant="danger"
            disabled={deleteMutation.isPending}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    marginTop: spacing.xl
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl
  },
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15
  },
  primaryBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 4,
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textTransform: "uppercase"
  },
  rewardPoints: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  rewardValue: {
    color: colors.muted,
    fontSize: 14
  },
  ruleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  ruleCategory: {
    color: colors.text,
    fontSize: 14
  },
  ruleMultiplier: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700"
  },
  termRow: {
    color: colors.text,
    fontSize: 14
  },
  muted: {
    color: colors.muted
  },
  actions: {
    gap: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
    textAlign: "center"
  }
});
