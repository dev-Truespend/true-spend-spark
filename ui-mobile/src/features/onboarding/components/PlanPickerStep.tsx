import { Pressable, View, Text, StyleSheet } from "react-native";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { PlanCard } from "@/shared/components/PlanCard";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { PeriodToggle } from "@/features/billing/components/PeriodToggle";
import { PlanFeature } from "@/features/billing/types/billing.types";
import { StepHeader } from "./StepHeader";

type Plan = { code: string; displayName: string; trialDays: number };

type Price = { planCode: string; amount: { display: string } };

// Display ordering for the 3-tier model (free, basic, pro).
const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2 };

const FEATURE_ORDER = [
  "manual_card_limit",
  "plaid_card_limit",
  "geo_recommendations_per_day",
  "unlimited_cards",
  "plaid_linking_enabled",
  "plaid_transactions_view_enabled",
  "ai_insights_enabled",
  "geofencing_enabled",
  "receipt_ocr_enabled"
];

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

type Props = {
  isLoading: boolean;
  periodCode: string;
  plans: Plan[];
  prices: Price[];
  features: PlanFeature[];
  selectedPlanCode: string | null;
  selectedPriceDisplay: string | null;
  checkoutPending: boolean;
  onSwitchPeriod: (period: "monthly" | "annual") => void;
  onSelectPlan: (code: string) => void;
  onStartCheckout: () => void;
  onContinueAfterCheckout: () => void;
  onContinueFree: () => void;
  onSwitchToPro: () => void;
};

export function PlanPickerStep({
  isLoading,
  periodCode,
  plans,
  prices,
  features,
  selectedPlanCode,
  selectedPriceDisplay,
  checkoutPending,
  onSwitchPeriod,
  onSelectPlan,
  onStartCheckout,
  onContinueAfterCheckout,
  onContinueFree,
  onSwitchToPro
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const hasProPlan = plans.some((p) => p.code.toLowerCase() === "pro");
  const cadence = periodCode === "annual" ? "/yr" : "/mo";
  // A plan with no price row is the Free tier — it skips Stripe checkout entirely.
  const isFreeSelected = !!selectedPlanCode && !prices.some((p) => p.planCode === selectedPlanCode);
  const showSwitchToPro = hasProPlan && !isFreeSelected && (selectedPlanCode?.toLowerCase() ?? "") !== "pro";
  const trialPlan = plans.find((p) => p.code === selectedPlanCode && p.trialDays > 0);

  return (
    <View style={{ gap: 14 }}>
      <StepHeader step={4} totalSteps={4} onSkip={onContinueFree} />
      <View style={styles.header}>
        <Text style={styles.title}>Pick your plan</Text>
        <Text style={styles.sub}>
          Start <Text style={styles.bold}>Free</Text>, or unlock more with Basic (
          <Text style={styles.bold}>7-day trial</Text>) or Pro (<Text style={styles.bold}>14-day trial</Text>). Cancel anytime.
        </Text>
      </View>

      <PeriodToggle value={periodCode} onChange={onSwitchPeriod} />

      <View style={{ gap: 12 }}>
        {[...plans]
          .sort((a, b) => (TIER_RANK[a.code.toLowerCase()] ?? 99) - (TIER_RANK[b.code.toLowerCase()] ?? 99))
          .map((plan) => {
          const price = prices.find((p) => p.planCode === plan.code);
          const isSelected = selectedPlanCode === plan.code;
          const isPro = plan.code.toLowerCase() === "pro";
          return (
            <Pressable
              key={plan.code}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectPlan(plan.code)}
              style={({ pressed }) => [
                styles.planWrap,
                isSelected && styles.planWrapSelected,
                pressed && { opacity: 0.92 }
              ]}
            >
              <PlanCard
                name={plan.displayName}
                price={price?.amount.display ?? "—"}
                cadence={cadence}
                features={buildFeatureList(plan, features)}
                featured={isPro}
                ribbon="MOST POPULAR"
                footer={
                  <View style={styles.planFooter}>
                    {isSelected ? (
                      <Badge tone={isPro ? "purple" : "blue"} label="Selected" />
                    ) : (
                      <Text style={styles.selectHint}>Tap to select</Text>
                    )}
                    {plan.trialDays > 0 ? (
                      <Text style={styles.trial}>{plan.trialDays}-day free trial</Text>
                    ) : null}
                  </View>
                }
              />
            </Pressable>
          );
        })}
      </View>

      {trialPlan ? (
        <ReasonCard
          tone="teal"
          icon="🎁"
          title={`${trialPlan.trialDays}-day free trial`}
          body={`Your ${trialPlan.displayName} plan is free for ${trialPlan.trialDays} days. We'll remind you 2 days and 1 day before billing starts. ${selectedPriceDisplay ?? ""} after the trial.`}
        />
      ) : null}

      {checkoutPending ? (
        <>
          <Text style={styles.checkoutHint}>Finished checkout? Your plan may take a moment to activate.</Text>
          <Button disabled={isLoading} label="I'm back from checkout" onPress={onContinueAfterCheckout} />
        </>
      ) : isFreeSelected ? (
        <>
          <Button disabled={isLoading} label="Continue with Free" onPress={onContinueFree} />
          {hasProPlan ? (
            <Button disabled={isLoading} label="See Basic & Pro" onPress={onSwitchToPro} variant="outline" />
          ) : null}
        </>
      ) : (
        <>
          <Button disabled={isLoading} label="Continue to Stripe checkout" onPress={onStartCheckout} />
          {showSwitchToPro ? (
            <Button disabled={isLoading} label="Switch to Pro free trial" onPress={onSwitchToPro} variant="outline" />
          ) : null}
        </>
      )}

      {isFreeSelected ? (
        <Text style={styles.fineprint}>
          Free includes 1 card and 1 daily card tip. Upgrade anytime for more cards and recommendations.
        </Text>
      ) : (
        <Text style={styles.fineprint}>
          No charge during your trial. Stripe shows Apple Pay on iOS and Google Pay on Android when available.
        </Text>
      )}
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: { alignItems: "center", paddingVertical: 4, gap: 6 },
    title: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(22), color: t.colors.text, letterSpacing: -0.4 },
    sub: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.mutedFg, textAlign: "center", lineHeight: 19 },
    bold: { fontFamily: fontFamily.bold, fontWeight: "700", color: t.colors.text },
    planWrap: { borderRadius: radii.xxl },
    planWrapSelected: {
      shadowColor: t.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 3
    },
    planFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    selectHint: { color: t.colors.mutedFg, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(11), letterSpacing: 0.3 },
    trial: { color: t.colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(12) },
    checkoutHint: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.mutedFg, textAlign: "center" },
    fineprint: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, textAlign: "center", lineHeight: 15 }
  });
