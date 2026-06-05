import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { PeriodToggle } from "@/features/billing/components/PeriodToggle";
import { PlanOption } from "@/features/billing/components/PlanOption";
import { useBillingPlans } from "@/features/billing/hooks/useBillingPlans";
import { useBillingPrices } from "@/features/billing/hooks/useBillingPrices";
import { useCheckout } from "@/features/billing/hooks/useCheckout";

type Period = "monthly" | "annual";

export function BillingPlansScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plansQuery = useBillingPlans();
  const pricesQuery = useBillingPrices(period);
  const checkout = useCheckout();

  const plans = plansQuery.plans;
  const prices = pricesQuery.prices;

  const effectivePlan = selectedPlan ?? plans.find((p) => p.code !== "basic")?.code ?? plans[0]?.code ?? null;

  const priceFor = useMemo(() => (planCode: string) => prices.find((p) => p.planCode === planCode), [prices]);

  async function handleUpgrade() {
    if (!effectivePlan) return;
    const result = await checkout.mutateAsync({
      planCode: effectivePlan,
      periodCode: period,
      returnContextCode: "onboarding"
    });
    const url = result.data?.url;
    if (url) await Linking.openURL(url);
  }

  const isLoading = plansQuery.isLoading || pricesQuery.isLoading;
  const error =
    plansQuery.error ? (plansQuery.error as Error).message :
    pricesQuery.error ? (pricesQuery.error as Error).message :
    checkout.error ? (checkout.error as Error).message :
    null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.subtitle}>
          Pro unlocks unlimited card linking, AI insights, and best-card alerts.
        </Text>

        <PeriodToggle value={period} onChange={setPeriod} />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.list}>
            {plans.map((plan) => {
              const price = priceFor(plan.code);
              const priceLabel = price?.amount.display ?? "—";
              return (
                <View key={plan.code} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.displayName}</Text>
                    <Text style={styles.planPrice}>{priceLabel}</Text>
                  </View>
                  {plan.description ? (
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  ) : null}
                  <PlanOption
                    code={plan.code}
                    displayName={effectivePlan === plan.code ? "Selected" : "Select"}
                    trialDays={plan.trialDays}
                    isSelected={effectivePlan === plan.code}
                    onSelect={setSelectedPlan}
                  />
                </View>
              );
            })}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          disabled={!effectivePlan || checkout.isPending}
          label={checkout.isPending ? "Opening checkout…" : "Continue to checkout"}
          onPress={handleUpgrade}
        />
        <Button label="Cancel" onPress={() => router.back()} variant="secondary" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14 },
  loader: { marginVertical: spacing.xl },
  list: { gap: spacing.sm },
  planCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  planHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  planName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  planPrice: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  planDescription: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 }
});
