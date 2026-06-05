import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useOnboardingFlow } from "@/features/onboarding/hooks/useOnboardingFlow";
import { AllSetStep } from "@/features/onboarding/components/AllSetStep";
import { CardConnectStep } from "@/features/onboarding/components/CardConnectStep";
import { LocationPermissionStep } from "@/features/onboarding/components/LocationPermissionStep";
import { ManualCardForm } from "@/features/onboarding/components/ManualCardForm";
import { NotificationsStep } from "@/features/onboarding/components/NotificationsStep";
import { PlanPickerStep } from "@/features/onboarding/components/PlanPickerStep";

export function OnboardingScreen() {
  const flow = useOnboardingFlow();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Set up TrueSpend</Text>
        {flow.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {flow.error ? <Text style={styles.error}>{flow.error}</Text> : null}

        {flow.step === "cards" ? (
          <CardConnectStep
            isLoading={flow.isLoading}
            cards={flow.cards}
            onConnectPlaid={() => void flow.connectPlaid()}
            onBeginManual={flow.beginManualCardEntry}
            onSkip={() => void flow.skipCards()}
          />
        ) : null}

        {flow.step === "manual" || flow.step === "cards" ? (
          <ManualCardForm
            isLoading={flow.isLoading}
            issuers={flow.issuers}
            products={flow.products}
            onSaveCard={(productId, issuerId, nickname, lastFour, isPrimary) =>
              void flow.addManualCard(productId, issuerId, nickname, lastFour, isPrimary)
            }
            onRequestMissing={(issuerName, cardName, nickname, lastFour, isPrimary) =>
              void flow.requestMissingCard(issuerName, cardName, nickname, lastFour, isPrimary)
            }
          />
        ) : null}

        {flow.step === "location" ? (
          <LocationPermissionStep isLoading={flow.isLoading} onReport={(state) => void flow.reportLocation(state)} />
        ) : null}

        {flow.step === "plan" ? (
          <PlanPickerStep
            isLoading={flow.isLoading}
            periodCode={flow.periodCode}
            plans={flow.plans}
            selectedPlanCode={flow.selectedPlanCode}
            selectedPriceDisplay={flow.selectedPrice?.amount.display ?? null}
            checkoutPending={flow.checkoutPending}
            onSwitchPeriod={(period) => void flow.switchPeriod(period)}
            onSelectPlan={flow.setSelectedPlanCode}
            onStartCheckout={() => void flow.startCheckout()}
            onContinueAfterCheckout={() => void flow.continueAfterCheckout()}
          />
        ) : null}

        {flow.step === "notifications" ? (
          <NotificationsStep
            isLoading={flow.isLoading}
            types={flow.notifications?.types ?? []}
            onSave={(push, email) => void flow.saveNotifications(push, email)}
          />
        ) : null}

        {flow.step === "done" ? <AllSetStep isLoading={flow.isLoading} onFinish={() => void flow.finish()} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  error: { color: colors.danger }
});
