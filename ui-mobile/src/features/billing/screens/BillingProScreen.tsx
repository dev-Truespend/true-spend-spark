import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { QueryKeys } from "@/shared/constants/QueryKeys";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useBillingPlans } from "@/features/billing/hooks/useBillingPlans";
import { useBillingPrices } from "@/features/billing/hooks/useBillingPrices";
import { useBillingFeatures } from "@/features/billing/hooks/useBillingFeatures";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { usePaymentMethods } from "@/features/billing/hooks/usePaymentMethods";
import { useCheckout } from "@/features/billing/hooks/useCheckout";
import { useCustomerPortal } from "@/features/billing/hooks/useCustomerPortal";
import { CurrentPlanCard } from "@/features/billing/components/CurrentPlanCard";
import { PaymentMethodList } from "@/features/billing/components/PaymentMethodList";
import { PeriodToggle } from "@/features/billing/components/PeriodToggle";
import { PlanComparisonCard } from "@/features/billing/components/PlanComparisonCard";

type Period = "monthly" | "annual";

export function BillingProScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("monthly");

  const plansQuery = useBillingPlans();
  const monthlyPricesQuery = useBillingPrices("monthly");
  const annualPricesQuery = useBillingPrices("annual");
  const featuresQuery = useBillingFeatures();
  const subscriptionQuery = useSubscription();
  const entitlementsQuery = useEntitlements();
  const paymentMethodsQuery = usePaymentMethods();
  const checkout = useCheckout();
  const portal = useCustomerPortal();

  const plans = plansQuery.plans;
  const features = featuresQuery.features;
  const subscription = subscriptionQuery.subscription;
  const entitlements = entitlementsQuery.entitlements;
  const paymentMethods = paymentMethodsQuery.paymentMethods;

  const prices = period === "annual" ? annualPricesQuery.prices : monthlyPricesQuery.prices;
  const monthlyPrice = monthlyPricesQuery.prices.find((p) => p.planCode === "pro")?.amount;
  const annualPrice = annualPricesQuery.prices.find((p) => p.planCode === "pro")?.amount;
  const pricesQuery = period === "annual" ? annualPricesQuery : monthlyPricesQuery;

  const annualSavings = useMemo(() => {
    if (!monthlyPrice || !annualPrice) return null;
    const yearlyFromMonthly = monthlyPrice.amount * 12;
    if (yearlyFromMonthly <= annualPrice.amount) return null;
    const saved = yearlyFromMonthly - annualPrice.amount;
    const pct = Math.round((saved / yearlyFromMonthly) * 100);
    return { saved, pct };
  }, [monthlyPrice, annualPrice]);

  const currentPlanCode = entitlements?.planCode ?? subscription?.planCode ?? "basic";
  const upgradeTarget = plans.find((p) => p.code !== currentPlanCode);
  const upgradePrice = prices.find((p) => p.planCode === upgradeTarget?.code);
  const pricesUnavailable = upgradeTarget != null && !pricesQuery.isLoading && !upgradePrice;

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingSubscription });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Entitlements });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingPaymentMethods });
    }, [queryClient])
  );

  async function handleUpgrade() {
    if (!upgradeTarget) return;
    const result = await checkout.mutateAsync({
      planCode: upgradeTarget.code,
      periodCode: period,
      returnContextCode: "billing"
    });
    const url = result.data?.url;
    if (url) await Linking.openURL(url);
  }

  async function handleManage() {
    const result = await portal.mutateAsync();
    const url = result.data?.url;
    if (url) await Linking.openURL(url);
  }

  const isLoading =
    plansQuery.isLoading ||
    pricesQuery.isLoading ||
    featuresQuery.isLoading ||
    subscriptionQuery.isLoading ||
    entitlementsQuery.isLoading ||
    paymentMethodsQuery.isLoading;

  const error =
    plansQuery.error ? (plansQuery.error as Error).message :
    pricesQuery.error ? (pricesQuery.error as Error).message :
    subscriptionQuery.error ? (subscriptionQuery.error as Error).message :
    checkout.error ? (checkout.error as Error).message :
    portal.error ? (portal.error as Error).message :
    null;

  const onProPlan = currentPlanCode.toLowerCase() === "pro";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Billing & Pro</Text>

        <CurrentPlanCard subscription={subscription} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compare plans</Text>
          <PeriodToggle value={period} onChange={setPeriod} />
          {annualSavings && period === "annual" ? (
            <Text style={styles.savings}>
              Save {annualSavings.pct}% with annual billing.
            </Text>
          ) : null}
          {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          <View style={styles.planList}>
            {plans.map((plan) => (
              <PlanComparisonCard
                key={plan.code}
                plan={plan}
                price={prices.find((p) => p.planCode === plan.code)}
                features={features}
                isCurrentPlan={plan.code.toLowerCase() === currentPlanCode.toLowerCase()}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment methods</Text>
          {paymentMethodsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <PaymentMethodList paymentMethods={paymentMethods} />
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pricesUnavailable ? (
          <View style={styles.retryRow}>
            <Text style={styles.retryText}>Pricing is unavailable right now.</Text>
            <Button label="Retry" onPress={() => void pricesQuery.refetch()} variant="secondary" />
          </View>
        ) : null}

        {!onProPlan && upgradeTarget ? (
          <Button
            disabled={checkout.isPending || pricesQuery.isLoading || !upgradePrice}
            label={
              checkout.isPending
                ? "Opening checkout…"
                : `Upgrade to ${upgradeTarget.displayName}${upgradePrice ? ` • ${upgradePrice.amount.display}` : ""}`
            }
            onPress={handleUpgrade}
          />
        ) : null}

        <Button
          disabled={portal.isPending}
          label={portal.isPending ? "Opening Stripe portal…" : "Manage subscription"}
          onPress={handleManage}
          variant="secondary"
        />
        <Button label="Back" onPress={() => router.back()} variant="secondary" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  savings: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  planList: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 13 },
  retryRow: { gap: spacing.xs },
  retryText: { color: colors.muted, fontSize: 13 }
});
