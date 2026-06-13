import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ListItem } from "@/shared/components/ListItem";
import { PlanCard } from "@/shared/components/PlanCard";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Toast } from "@/shared/components/Toast";
import { QueryKeys } from "@/shared/constants/QueryKeys";
import { friendlyMessage } from "@/shared/errors/friendlyMessage";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useBillingPlans } from "@/features/billing/hooks/useBillingPlans";
import { useBillingPrices } from "@/features/billing/hooks/useBillingPrices";
import { useBillingFeatures } from "@/features/billing/hooks/useBillingFeatures";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useEntitlements } from "@/features/billing/hooks/useEntitlements";
import { usePaymentMethods } from "@/features/billing/hooks/usePaymentMethods";
import { useCheckout } from "@/features/billing/hooks/useCheckout";
import { useCustomerPortal } from "@/features/billing/hooks/useCustomerPortal";
import { PeriodToggle } from "@/features/billing/components/PeriodToggle";
import { PaymentMethodList } from "@/features/billing/components/PaymentMethodList";
import { Plan, PlanFeature, PlanPrice } from "@/features/billing/types/billing.types";

type Period = "monthly" | "annual";

// Display ordering for the 3-tier model; also drives the single upgrade CTA target.
const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2 };

const FEATURE_ORDER = ["manual_card_limit", "plaid_card_limit", "geo_recommendations_per_day", "ai_insights_enabled", "unlimited_cards", "geofencing_enabled", "receipt_ocr_enabled"];

function buildFeatureList(plan: Plan, features: PlanFeature[]): string[] {
  const ordered = [...features].sort((a, b) => {
    const ai = FEATURE_ORDER.indexOf(a.code);
    const bi = FEATURE_ORDER.indexOf(b.code);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const lines: string[] = [];
  for (const feature of ordered) {
    const entry = feature.valuesByPlan.find((v) => v.planCode === plan.code);
    if (!entry) continue;
    if (feature.valueType === "boolean") {
      if (entry.value.toLowerCase() === "true") lines.push(feature.displayName);
    } else if (entry.value === "unlimited") {
      lines.push(`Unlimited ${feature.displayName.toLowerCase()}`);
    } else {
      lines.push(`${feature.displayName}: ${entry.value}`);
    }
  }
  return lines;
}

export function BillingProScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("annual");
  // User's explicit plan pick; null = fall back to the default (Pro). Reset implicitly when the
  // selected plan stops being a valid upgrade target (see selectedPlanCode below).
  const [pickedPlanCode, setPickedPlanCode] = useState<string | null>(null);

  const plansQuery = useBillingPlans();
  const monthlyPricesQuery = useBillingPrices("monthly");
  const annualPricesQuery = useBillingPrices("annual");
  const featuresQuery = useBillingFeatures();
  const subscriptionQuery = useSubscription();
  const entitlementsQuery = useEntitlements();
  const paymentMethodsQuery = usePaymentMethods();
  const checkout = useCheckout();
  const portal = useCustomerPortal();

  const plans = [...plansQuery.plans].sort(
    (a, b) => (TIER_RANK[a.code.toLowerCase()] ?? 99) - (TIER_RANK[b.code.toLowerCase()] ?? 99)
  );
  const features = featuresQuery.features;
  const subscription = subscriptionQuery.subscription;
  const entitlements = entitlementsQuery.entitlements;
  const paymentMethods = paymentMethodsQuery.paymentMethods;

  const prices = period === "annual" ? annualPricesQuery.prices : monthlyPricesQuery.prices;
  const monthlyProPrice = monthlyPricesQuery.prices.find((p) => p.planCode === "pro")?.amount;
  const annualProPrice = annualPricesQuery.prices.find((p) => p.planCode === "pro")?.amount;
  const pricesQuery = period === "annual" ? annualPricesQuery : monthlyPricesQuery;

  const annualSavings = useMemo(() => {
    if (!monthlyProPrice || !annualProPrice) return null;
    const yearlyFromMonthly = monthlyProPrice.amount * 12;
    if (yearlyFromMonthly <= annualProPrice.amount) return null;
    const saved = yearlyFromMonthly - annualProPrice.amount;
    const pct = Math.round((saved / yearlyFromMonthly) * 100);
    return { saved, pct };
  }, [monthlyProPrice, annualProPrice]);

  const currentPlanCode = (entitlements?.planCode ?? subscription?.planCode ?? "free").toLowerCase();
  const currentRank = TIER_RANK[currentPlanCode] ?? 0;
  // Selectable = any higher tier that has a price row (free -> basic / pro). Cards for these are
  // tappable; the user picks one and the Upgrade button targets it.
  const selectablePlans = [...plans]
    .filter((p) => (TIER_RANK[p.code.toLowerCase()] ?? 0) > currentRank && prices.some((pr) => pr.planCode === p.code))
    .sort((a, b) => (TIER_RANK[a.code.toLowerCase()] ?? 0) - (TIER_RANK[b.code.toLowerCase()] ?? 0));
  // Default the selection to Pro (the top tier), else the highest available upgrade.
  const defaultPlanCode =
    selectablePlans.find((p) => p.code.toLowerCase() === "pro")?.code ??
    selectablePlans[selectablePlans.length - 1]?.code ??
    null;
  const selectedPlanCode =
    pickedPlanCode && selectablePlans.some((p) => p.code === pickedPlanCode) ? pickedPlanCode : defaultPlanCode;
  const selectedPrice = prices.find((p) => p.planCode === selectedPlanCode);
  const pricesUnavailable = selectedPlanCode != null && !pricesQuery.isLoading && !selectedPrice;

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingSubscription });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Entitlements });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingPaymentMethods });
    }, [queryClient])
  );

  async function handleUpgrade() {
    if (!selectedPlanCode) return;
    try {
      const result = await checkout.mutateAsync({
        planCode: selectedPlanCode,
        periodCode: period,
        returnContextCode: "billing"
      });
      const url = result.data?.url;
      if (url) await Linking.openURL(url);
    } catch {
      // Friendly copy is rendered via the reactive `error` toast below; the
      // catch only prevents an unhandled promise rejection.
    }
  }

  async function handleManage() {
    try {
      const result = await portal.mutateAsync();
      const url = result.data?.url;
      if (url) await Linking.openURL(url);
    } catch {
      // See handleUpgrade — error surfaced via the reactive `error` toast.
    }
  }

  const isLoading =
    plansQuery.isLoading ||
    pricesQuery.isLoading ||
    featuresQuery.isLoading ||
    subscriptionQuery.isLoading ||
    entitlementsQuery.isLoading ||
    paymentMethodsQuery.isLoading;

  // Portal 409 ("no Stripe customer yet") gets a guiding message; everything
  // else uses friendly copy. Never the raw server/Stripe string.
  const rawError =
    plansQuery.error ?? pricesQuery.error ?? subscriptionQuery.error ?? checkout.error ?? portal.error ?? null;
  const error = portal.error
    ? "Start a subscription before managing billing in the Stripe portal."
    : rawError
      ? friendlyMessage(rawError, "billing")
      : null;

  const onProPlan = currentPlanCode === "pro";
  const currentPillLabel = `CURRENT: ${currentPlanCode.toUpperCase()}`;
  const cadence = period === "annual" ? "/yr" : "/mo";

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Subscription</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.hero}>
        <LinearGradient
          colors={[...theme.gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.currentPill}
        >
          <Text style={styles.currentPillText}>{currentPillLabel}</Text>
        </LinearGradient>
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.subtitle}>Start free, or unlock more with Basic or Pro. Switch anytime.</Text>
      </View>

      <PeriodToggle value={period} onChange={setPeriod} />
      {annualSavings && period === "annual" ? (
        <Text style={styles.savings}>Save {annualSavings.pct}% with annual billing.</Text>
      ) : null}

      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}

      <View style={{ gap: 12 }}>
        {plans.map((plan) => {
          const code = plan.code.toLowerCase();
          const isFreeTier = code === "free";
          const price = prices.find((p) => p.planCode === plan.code);
          // Free has no price row — render "$0" with no cadence rather than "—".
          const priceDisplay = price?.amount.display ?? (isFreeTier ? "$0" : "—");
          const planCadence = price ? cadence : isFreeTier ? "" : cadence;
          const isSelectable = selectablePlans.some((p) => p.code === plan.code);
          return (
            <PlanCard
              key={plan.code}
              name={plan.displayName}
              price={priceDisplay}
              cadence={planCadence}
              features={buildFeatureList(plan, features)}
              featured={code === "pro" && !onProPlan}
              ribbon="BEST VALUE"
              selected={isSelectable && plan.code === selectedPlanCode}
              onPress={isSelectable ? () => setPickedPlanCode(plan.code) : undefined}
              footer={
                <PlanFooter
                  plan={plan}
                  price={price}
                  isCurrent={code === currentPlanCode}
                />
              }
            />
          );
        })}
      </View>

      <SectionLabel>Payment method</SectionLabel>
      <Card padded={false} style={styles.group}>
        <ListItem
          iconLabel="💳"
          iconTone="muted"
          title="Device wallet"
          subtitle="Stripe shows Apple Pay on iOS and Google Pay on Android when available"
          divider={paymentMethods.length > 0}
        />
        {paymentMethodsQuery.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 8 }} />
        ) : paymentMethods.length > 0 ? (
          <View style={{ paddingVertical: 4 }}>
            <PaymentMethodList paymentMethods={paymentMethods} />
          </View>
        ) : null}
      </Card>

      {error ? <Toast tone="error" message={error} /> : null}

      {pricesUnavailable ? (
        <View style={{ gap: 8 }}>
          <Toast tone="warn" message="Pricing is unavailable right now." />
          <Button label="Retry" onPress={() => void pricesQuery.refetch()} variant="outline" />
        </View>
      ) : null}

      {!onProPlan && selectedPlanCode ? (
        <Button
          disabled={checkout.isPending || pricesQuery.isLoading || !selectedPrice}
          loading={checkout.isPending}
          label={
            checkout.isPending
              ? "Opening checkout…"
              : `Upgrade with Stripe${selectedPrice ? ` · ${selectedPrice.amount.display}${cadence}` : ""}`
          }
          onPress={handleUpgrade}
        />
      ) : null}

      <Button
        disabled={portal.isPending}
        loading={portal.isPending}
        label="Manage in Stripe portal"
        onPress={handleManage}
        variant="outline"
      />
      <Text style={styles.footnote}>
        Cancel anytime. Pro keeps working until the end of the billing period.
      </Text>
    </Screen>
  );
}

function PlanFooter({ plan, price, isCurrent }: { plan: Plan; price: PlanPrice | undefined; isCurrent: boolean }) {
  const styles = useThemedStyles(buildStyles);
  if (isCurrent) {
    return (
      <View style={styles.currentChip}>
        <Text style={styles.currentChipText}>Current plan</Text>
      </View>
    );
  }
  if (plan.trialDays > 0) {
    return <Text style={styles.trial}>{plan.trialDays}-day free trial{price ? ` · then ${price.amount.display}` : ""}</Text>;
  }
  return null;
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconBtn: { width: 36, height: 36, borderRadius: t.radii.md, alignItems: "center", justifyContent: "center" },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
    hero: { alignItems: "center", gap: 6, paddingTop: t.spacing.sm },
    currentPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: t.radii.pill },
    currentPillText: { color: t.palette.white, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(11), letterSpacing: 1.2 },
    title: { color: t.colors.text, fontFamily: fontFamily.heavy, fontSize: scaleFont(22), fontWeight: "800", letterSpacing: -0.4, textAlign: "center", marginTop: 8 },
    subtitle: { color: t.colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(13), textAlign: "center", lineHeight: 19 },
    savings: { color: t.colors.successText, fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(12), textAlign: "center" },
    group: { paddingHorizontal: 12 },
    currentChip: {
      alignSelf: "flex-start",
      backgroundColor: t.colors.surfaceAlt,
      borderRadius: t.radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 3
    },
    currentChipText: { color: t.colors.text, fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(11), letterSpacing: 0.3 },
    trial: { color: t.colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(12) },
    footnote: { color: t.colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(11), textAlign: "center", marginTop: 4 }
  });
}
