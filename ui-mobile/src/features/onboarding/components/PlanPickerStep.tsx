import { Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { onboardingPanelStyles as styles } from "@/features/onboarding/components/onboardingStyles";
import { PeriodToggle } from "@/features/billing/components/PeriodToggle";
import { PlanOption } from "@/features/billing/components/PlanOption";

type Plan = { code: string; displayName: string; trialDays: number };

type Props = {
  isLoading: boolean;
  periodCode: string;
  plans: Plan[];
  selectedPlanCode: string | null;
  selectedPriceDisplay: string | null;
  checkoutPending: boolean;
  onSwitchPeriod: (period: "monthly" | "annual") => void;
  onSelectPlan: (code: string) => void;
  onStartCheckout: () => void;
  onContinueAfterCheckout: () => void;
};

export function PlanPickerStep({
  isLoading,
  periodCode,
  plans,
  selectedPlanCode,
  selectedPriceDisplay,
  checkoutPending,
  onSwitchPeriod,
  onSelectPlan,
  onStartCheckout,
  onContinueAfterCheckout
}: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Pick your plan</Text>
      <PeriodToggle value={periodCode} onChange={onSwitchPeriod} />
      {plans.map((plan) => (
        <PlanOption
          key={plan.code}
          code={plan.code}
          displayName={plan.displayName}
          trialDays={plan.trialDays}
          isSelected={selectedPlanCode === plan.code}
          onSelect={onSelectPlan}
        />
      ))}
      <Text style={styles.body}>{selectedPriceDisplay ?? "$0.00"} now. You can cancel from billing settings.</Text>
      {checkoutPending ? (
        <>
          <Text style={styles.body}>Finished checkout? Your plan may take a moment to activate.</Text>
          <Button disabled={isLoading} label="I&apos;m back from checkout" onPress={onContinueAfterCheckout} />
        </>
      ) : (
        <Button disabled={isLoading} label="Continue to checkout" onPress={onStartCheckout} />
      )}
    </View>
  );
}
