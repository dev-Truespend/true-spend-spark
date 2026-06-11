import { useMemo, useState } from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { onboardingApi } from "@/features/onboarding/api/onboarding.api";
import { billingApi } from "@/features/billing/api/billing.api";
import { OnboardingStep } from "@/features/onboarding/types/onboarding.types";
import { PermissionState } from "@/features/permissions/types/permissions.types";
import { stepFromOnboarding } from "@/features/onboarding/mappers/onboardingStep.mapper";
import { openExternalUrl } from "@/shared/native/linking";
import {
  onboardingQueryKeys,
  PlaidLinkCancelledError,
  useAddManualCardMutation,
  useBillingCheckoutMutation,
  useConnectPlaidMutation,
  useOnboardingBootstrapQuery,
  useReportPermissionMutation,
  useRequestMissingCardMutation,
  useSaveNotificationSettingsMutation
} from "@/features/onboarding/hooks/useOnboardingQueries";

const DEFAULT_PERIOD_CODE = "monthly";
const DEFAULT_PLAN_CODE = "basic";

export function useOnboardingFlow() {
  // Local state holds *user intent*: where they are in the flow, what plan/period
  // they have selected, and one-time UI flags. Anything that lives on the server
  // (cards, issuers, products, plans, prices, notifications) is read directly
  // from the bootstrap query — never mirrored.
  const queryClient = useQueryClient();
  const [stepOverride, setStepOverride] = useState<OnboardingStep | null>(null);
  const [periodCode, setPeriodCode] = useState(DEFAULT_PERIOD_CODE);
  const [selectedPlanCode, setSelectedPlanCode] = useState(DEFAULT_PLAN_CODE);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const bootstrapQuery = useOnboardingBootstrapQuery(periodCode);
  const connectPlaidMutation = useConnectPlaidMutation();
  const addManualCardMutation = useAddManualCardMutation();
  const requestMissingCardMutation = useRequestMissingCardMutation();
  const reportPermissionMutation = useReportPermissionMutation();
  const checkoutMutation = useBillingCheckoutMutation();
  const saveNotificationsMutation = useSaveNotificationSettingsMutation();

  const data = bootstrapQuery.data;
  const cards = useMemo(
    () =>
      data?.cards.cards.map(
        (card) => `${card.displayName}${card.lastFour ? ` • ${card.lastFour}` : ""}`
      ) ?? [],
    [data?.cards.cards]
  );
  // 02-onboarding.md:151 + 04-cards.md:109 — card limits ship inside the cards
  // response, so onboarding screens can gate plaid/manual adds without a
  // separate /cards/limits call.
  const cardLimits = data?.cards.limits ?? null;
  const issuers = data?.issuers.issuers ?? [];
  const products = data?.products.products ?? [];
  const plans = data?.plans.plans ?? [];
  const prices = data?.prices.plans ?? [];
  const features = data?.features?.features ?? [];
  const notifications = data?.notifications ?? null;
  const serverStep: OnboardingStep | null = data ? stepFromOnboarding(data.onboarding) : null;
  const step: OnboardingStep = stepOverride ?? serverStep ?? "cards";

  const isLoading =
    bootstrapQuery.isLoading ||
    connectPlaidMutation.isPending ||
    addManualCardMutation.isPending ||
    requestMissingCardMutation.isPending ||
    reportPermissionMutation.isPending ||
    checkoutMutation.isPending ||
    saveNotificationsMutation.isPending;

  const error =
    actionError ??
    (bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : null);

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Something went wrong.");
    }
  }

  async function connectPlaid() {
    setActionError(null);
    try {
      await connectPlaidMutation.mutateAsync();
      setStepOverride("location");
    } catch (nextError) {
      // User cancelled Plaid Link — leave them on the same step silently so
      // they can try again or pick a different path.
      if (nextError instanceof PlaidLinkCancelledError) return;
      setActionError(nextError instanceof Error ? nextError.message : "Something went wrong.");
    }
  }

  async function skipCards() {
    await run(async () => {
      await onboardingApi.skipCardLinking();
      await queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.bootstrap(periodCode) });
      setStepOverride("location");
    });
  }

  function beginManualCardEntry() {
    setStepOverride("manual");
  }

  function cancelManualCardEntry() {
    setStepOverride("cards");
  }

  async function addManualCard(
    cardProductId: number,
    issuerId: number,
    nickname: string,
    lastFour: string,
    isPrimary: boolean
  ) {
    await run(async () => {
      await addManualCardMutation.mutateAsync({ cardProductId, issuerId, nickname, lastFour, isPrimary });
      setStepOverride("location");
    });
  }

  async function requestMissingCard(
    issuerName: string,
    cardName: string,
    nickname: string,
    lastFour: string,
    isPrimary: boolean
  ) {
    await run(async () => {
      await requestMissingCardMutation.mutateAsync({
        issuerName,
        cardName,
        createUserCard: true,
        nickname,
        lastFour,
        isPrimary
      });
      setStepOverride("location");
    });
  }

  async function reportLocation(state: PermissionState) {
    await run(async () => {
      await reportPermissionMutation.mutateAsync({ locationState: state });
      setStepOverride("plan");
    });
  }

  async function switchPeriod(nextPeriodCode: string) {
    await run(async () => {
      setPeriodCode(nextPeriodCode);
      // The bootstrap query keys off periodCode and React Query will fetch the
      // matching prices automatically — no manual mirror needed.
    });
  }

  async function refreshAndAdvanceAfterCheckout() {
    // Refresh subscription/entitlement state so any downstream gates see the
    // latest plan (after Stripe's webhook fires, or immediately for a simulated checkout).
    try {
      await Promise.all([billingApi.getSubscription(), billingApi.getEntitlements()]);
    } catch {
      // Subscription may still be pending — let the user move on either way.
    }
    setCheckoutPending(false);
    setStepOverride("notifications");
  }

  async function startCheckout() {
    await run(async () => {
      const response = await checkoutMutation.mutateAsync({ planCode: selectedPlanCode, periodCode });
      // Simulated checkout (TestFlight, no Stripe): the server provisions a trialing subscription
      // directly and returns an empty url. Treat it exactly like returning from a real checkout —
      // refresh entitlements and advance, with no browser hand-off.
      if (!response.data.url) {
        await refreshAndAdvanceAfterCheckout();
        return;
      }
      await openExternalUrl(response.data.url);
      // Do not advance the step here — the user has only been handed off to Stripe.
      // Their subscription is webhook driven; advance after they return and we
      // refresh entitlements via continueAfterCheckout().
      setCheckoutPending(true);
    });
  }

  async function continueWithFree() {
    await run(async () => {
      // Free tier needs no Stripe checkout — entitlements default to Free server-side when
      // there is no active subscription. Just advance to the notification opt-in step.
      setStepOverride("notifications");
    });
  }

  async function continueAfterCheckout() {
    await run(refreshAndAdvanceAfterCheckout);
  }

  async function saveNotifications(pushEnabled: boolean, emailEnabled: boolean) {
    await run(async () => {
      // Start from the current server settings when we have them so existing
      // quiet hours / type-level preferences survive the save.
      const nextSettings = notifications ?? {
        masterEnabled: pushEnabled || emailEnabled,
        pushEnabled,
        emailEnabled,
        quietHoursEnabled: false,
        types: []
      };
      await saveNotificationsMutation.mutateAsync({ pushEnabled, emailEnabled, settings: nextSettings });
      setStepOverride("done");
    });
  }

  async function finish() {
    await run(async () => {
      await onboardingApi.complete();
      router.replace("/(app)/(tabs)");
    });
  }

  // Saves notification preference and completes onboarding atomically — if the
  // notification save fails we do not navigate, so the user keeps the error
  // toast and can retry from the AllSet screen.
  async function completeOnboarding(allowNotifications: boolean) {
    await run(async () => {
      const nextSettings = notifications ?? {
        masterEnabled: allowNotifications,
        pushEnabled: allowNotifications,
        emailEnabled: allowNotifications,
        quietHoursEnabled: false,
        types: []
      };
      await saveNotificationsMutation.mutateAsync({
        pushEnabled: allowNotifications,
        emailEnabled: allowNotifications,
        settings: nextSettings
      });
      await onboardingApi.complete();
      router.replace("/(app)/(tabs)");
    });
  }

  function switchToPro() {
    const proCode = plans.find((p) => p.code.toLowerCase() === "pro")?.code;
    if (proCode) setSelectedPlanCode(proCode);
  }

  const selectedPrice = useMemo(
    () => prices.find((price) => price.planCode === selectedPlanCode && price.periodCode === periodCode),
    [prices, selectedPlanCode, periodCode]
  );

  return {
    addManualCard,
    beginManualCardEntry,
    cancelManualCardEntry,
    cards,
    cardLimits,
    checkoutPending,
    completeOnboarding,
    connectPlaid,
    continueAfterCheckout,
    continueWithFree,
    error,
    features,
    finish,
    isLoading,
    issuers,
    notifications,
    periodCode,
    plans,
    prices,
    products,
    reportLocation,
    requestMissingCard,
    saveNotifications,
    selectedPlanCode,
    selectedPrice,
    setSelectedPlanCode,
    skipCards,
    startCheckout,
    step,
    switchPeriod,
    switchToPro
  };
}
