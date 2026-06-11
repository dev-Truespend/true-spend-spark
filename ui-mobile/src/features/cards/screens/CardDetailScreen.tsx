import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { CreditCard } from "@/shared/components/CreditCard";
import { Card } from "@/shared/components/Card";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { ListItem } from "@/shared/components/ListItem";
import { RewardRow } from "@/shared/components/RewardRow";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Badge } from "@/shared/components/Badge";
import { GradientName, TintName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { RewardOverrideEditor } from "@/features/cards/components/RewardOverrideEditor";
import { useCardDetail } from "@/features/cards/hooks/useCardDetail";
import { useDeleteCard } from "@/features/cards/hooks/useDeleteCard";
import { useSetPrimary } from "@/features/cards/hooks/useSetPrimary";
import {
  useDeleteRewardOverride,
  useRewardOverrides,
  useUpsertRewardOverride
} from "@/features/cards/hooks/useRewardOverrides";

const CASH_REWARD_CURRENCY_CODES = new Set(["cash_back", "USD", "GBP", "EUR"]);
const isCashRewardCurrency = (code: string) => CASH_REWARD_CURRENCY_CODES.has(code);

type Props = { cardId: number };

const CATEGORY_TONES: Record<string, { tone: TintName; multiplierTone: TintName; icon: string }> = {
  dining:      { tone: "amber",  multiplierTone: "amber",  icon: "🍽️" },
  groceries:   { tone: "purple", multiplierTone: "purple", icon: "🥦" },
  travel:      { tone: "blue",   multiplierTone: "blue",   icon: "✈️" },
  gas:         { tone: "red",    multiplierTone: "red",    icon: "⛽" },
  streaming:   { tone: "purple", multiplierTone: "purple", icon: "🎬" },
  online:      { tone: "blue",   multiplierTone: "blue",   icon: "🛒" },
  default:     { tone: "muted",  multiplierTone: "blue",   icon: "💳" }
};

function toneFor(categoryCode: string) {
  return CATEGORY_TONES[categoryCode] ?? CATEGORY_TONES.default!;
}

// Stable per-card variant so the detail view matches the gradient shown for
// the same card in CardsScreen's peek stack (which also cycles through these).
const CARD_VARIANTS: Array<Extract<GradientName, "brand" | "purple" | "cool" | "gold" | "dark">> = [
  "brand",
  "purple",
  "cool",
  "gold",
  "dark"
];

function variantForCard(cardId: number) {
  return CARD_VARIANTS[Math.abs(cardId) % CARD_VARIANTS.length]!;
}

export function CardDetailScreen({ cardId }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { detail, isLoading, error } = useCardDetail(cardId);
  const deleteMutation = useDeleteCard();
  const setPrimaryMutation = useSetPrimary();
  const { overrides, isLoading: overridesLoading, error: overridesError } = useRewardOverrides(cardId);
  const upsertOverride = useUpsertRewardOverride(cardId);
  const deleteOverride = useDeleteRewardOverride(cardId);

  async function handleSaveOverride(input: { categoryCode: string; multiplier: number; notes?: string }) {
    await upsertOverride.mutateAsync(input);
  }

  async function handleDeleteOverride(categoryCode: string) {
    await deleteOverride.mutateAsync({ categoryCode });
  }

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
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      </Screen>
    );
  }

  if (error || !detail) {
    return (
      <Screen>
        <Text style={styles.errorBlock}>{error ?? "Card not found."}</Text>
      </Screen>
    );
  }

  const { card, rewardRules, monthlyRewardContribution, terms } = detail;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Card details</Text>
        <View style={styles.iconBtn} />
      </View>

      <CreditCard
        name={card.displayName}
        last4={card.lastFour ?? "0000"}
        issuer={card.issuerName}
        network={card.source === "plaid" ? `${card.issuerName} · Plaid linked` : "Manual card"}
        variant={variantForCard(card.id)}
        size="lg"
      />

      {card.isPrimary ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Badge tone="blue" label="Primary card" />
        </View>
      ) : null}

      {monthlyRewardContribution ? (
        <ReasonCard
          icon="📊"
          title="This month so far"
          body={
            isCashRewardCurrency(monthlyRewardContribution.currencyCode)
              ? `You earned $${monthlyRewardContribution.estimatedValue.toFixed(2)} on this card.`
              : `You earned ${monthlyRewardContribution.points.toLocaleString()} ${monthlyRewardContribution.currencyCode} (≈$${monthlyRewardContribution.estimatedValue.toFixed(2)}).`
          }
        />
      ) : null}

      {rewardRules.length > 0 ? (
        <>
          <SectionLabel>Rewards categories</SectionLabel>
          <Card>
            {rewardRules.map((rule, i) => {
              const t = toneFor(rule.categoryCode);
              return (
                <RewardRow
                  key={rule.categoryCode}
                  iconLabel={t.icon}
                  iconTone={t.tone}
                  multiplierTone={t.multiplierTone}
                  label={rule.categoryName + (rule.capDisplay ? ` (${rule.capDisplay})` : "")}
                  multiplier={`${rule.multiplier}×`}
                  divider={i < rewardRules.length - 1}
                />
              );
            })}
          </Card>
        </>
      ) : null}

      <RewardOverrideEditor
        overrides={overrides}
        isLoading={overridesLoading}
        error={overridesError}
        onSave={handleSaveOverride}
        onDelete={handleDeleteOverride}
        isSaving={upsertOverride.isPending}
        isDeleting={deleteOverride.isPending}
      />

      {terms ? (
        <>
          <SectionLabel>Card terms</SectionLabel>
          <Card padded={false}>
            <View style={styles.termsWrap}>
              {terms.annualFee != null ? (
                <ListItem title="Annual fee" amount={`$${terms.annualFee}`} iconLabel="$" iconTone="amber" />
              ) : null}
              {terms.purchaseApr ? (
                <ListItem title="Purchase APR" amount={terms.purchaseApr} iconLabel="%" iconTone="blue" />
              ) : null}
              {terms.foreignTransactionFee ? (
                <ListItem
                  title="Foreign transaction fee"
                  amount={terms.foreignTransactionFee}
                  amountTone={terms.foreignTransactionFee.toLowerCase() === "none" ? "positive" : "default"}
                  iconLabel="🌐"
                  iconTone="teal"
                />
              ) : null}
              {terms.termsSummary ? (
                <View style={styles.summary}>
                  <Text style={styles.summaryText}>{terms.termsSummary}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        </>
      ) : null}

      <View style={styles.actionGrid}>
        {!card.isPrimary ? (
          <Button
            label="Set as primary"
            onPress={handleSetPrimary}
            disabled={setPrimaryMutation.isPending}
            variant="outline"
          />
        ) : null}
        <Button
          label="Remove card"
          onPress={handleDelete}
          variant="danger"
          disabled={deleteMutation.isPending}
        />
      </View>
    </Screen>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
    termsWrap: { paddingHorizontal: 14 },
    summary: { paddingVertical: 10 },
    summaryText: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: t.colors.mutedFg, lineHeight: 17 },
    actionGrid: { gap: 8 },
    errorBlock: { color: t.colors.destructive, fontFamily: fontFamily.medium, textAlign: "center", marginTop: 16 }
  });
