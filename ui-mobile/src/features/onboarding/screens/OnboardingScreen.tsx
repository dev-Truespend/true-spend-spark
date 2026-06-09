import { ActivityIndicator } from "react-native";
import { Screen } from "@/shared/components/Screen";
import { Toast } from "@/shared/components/Toast";
import { colors } from "@/shared/theme/colors";
import { useOnboardingFlow } from "@/features/onboarding/hooks/useOnboardingFlow";
import { AllSetStep } from "@/features/onboarding/components/AllSetStep";
import { CardConnectStep } from "@/features/onboarding/components/CardConnectStep";
import { LocationPermissionStep } from "@/features/onboarding/components/LocationPermissionStep";
import { ManualCardForm } from "@/features/onboarding/components/ManualCardForm";
import { PlanPickerStep } from "@/features/onboarding/components/PlanPickerStep";

export function OnboardingScreen() {
  const flow = useOnboardingFlow();
  const isAllSet = flow.step === "notifications" || flow.step === "done";

  // The "You're all set!" step is a full-bleed celebration screen — the gradient
  // owns the entire viewport, so we drop the Screen's padding/scroll and let
  // AllSetStep manage its own bottom safe-area inset for the docked CTA.
  if (isAllSet) {
    return (
      <Screen scroll={false} padded={false} edges={["bottom"]} background="transparent">
        {flow.error ? <Toast tone="error" message={flow.error} /> : null}
        <AllSetStep
          isLoading={flow.isLoading}
          onComplete={(allowNotifications) => void flow.completeOnboarding(allowNotifications)}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {flow.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {flow.error ? <Toast tone="error" message={flow.error} /> : null}

      {flow.step === "cards" ? (
        <CardConnectStep
          isLoading={flow.isLoading}
          cards={flow.cards}
          onConnectPlaid={() => void flow.connectPlaid()}
          onBeginManual={flow.beginManualCardEntry}
          onSkip={() => void flow.skipCards()}
        />
      ) : null}

      {flow.step === "manual" ? (
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
          onBack={flow.cancelManualCardEntry}
          onSkip={() => void flow.skipCards()}
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
          prices={flow.prices}
          features={flow.features}
          selectedPlanCode={flow.selectedPlanCode}
          selectedPriceDisplay={flow.selectedPrice?.amount.display ?? null}
          checkoutPending={flow.checkoutPending}
          onSwitchPeriod={(period) => void flow.switchPeriod(period)}
          onSelectPlan={flow.setSelectedPlanCode}
          onStartCheckout={() => void flow.startCheckout()}
          onContinueAfterCheckout={() => void flow.continueAfterCheckout()}
          onContinueFree={() => void flow.continueWithFree()}
          onSwitchToPro={() => {
            flow.switchToPro();
            void flow.startCheckout();
          }}
        />
      ) : null}

    </Screen>
  );
}
