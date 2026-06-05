import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingApi } from "@/features/onboarding/api/onboarding.api";
import { cardsApi } from "@/features/cards/api/cards.api";
import { catalogApi } from "@/features/catalog/api/catalog.api";
import { plaidApi } from "@/features/plaid/api/plaid.api";
import { permissionsApi, PermissionState } from "@/features/permissions/api/permissions.api";
import { billingApi } from "@/features/billing/api/billing.api";
import { notificationSettingsApi, NotificationSettings } from "@/features/notification-settings/api/notification-settings.api";
import { devicesApi } from "@/shared/api/devices.api";
import { ensurePushToken } from "@/shared/native/pushNotifications";
import { launchPlaidLink, PlaidLinkCancelledError } from "@/shared/native/plaidLinkLauncher";
import { createManualCardSchema, createCardProductRequestSchema } from "@/features/cards/schemas/cards.schema";
import { exchangePlaidTokenSchema } from "@/features/plaid/schemas/plaid.schema";
import { updatePermissionsSchema } from "@/features/permissions/schemas/permissions.schema";
import { createCheckoutSchema } from "@/features/billing/schemas/billing.schema";
import { updateNotificationSettingsSchema } from "@/features/notification-settings/schemas/notification-settings.schema";

export const onboardingQueryKeys = {
  bootstrap: (periodCode: string) => ["onboarding", "bootstrap", periodCode] as const
};

export function useOnboardingBootstrapQuery(periodCode: string) {
  return useQuery({
    queryKey: onboardingQueryKeys.bootstrap(periodCode),
    queryFn: async () => {
      const [onboarding, cards, issuers, products, plans, prices, notifications] = await Promise.all([
        onboardingApi.getOnboarding(),
        cardsApi.getCards(),
        catalogApi.getIssuers(),
        catalogApi.getProducts(),
        billingApi.getPlans(),
        billingApi.getPrices(periodCode),
        notificationSettingsApi.get()
      ]);

      return {
        onboarding: onboarding.data,
        cards: cards.data,
        issuers: issuers.data,
        products: products.data,
        plans: plans.data,
        prices: prices.data,
        notifications: notifications.data
      };
    }
  });
}

export function useConnectPlaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tokenResponse = await plaidApi.createLinkToken();
      const linkToken = tokenResponse.data?.linkToken;
      if (!linkToken) throw new Error("Could not start Plaid Link. Please try again.");
      const linkResult = await launchPlaidLink(linkToken);
      const payload = exchangePlaidTokenSchema.parse({ publicToken: linkResult.publicToken });
      await plaidApi.exchangeToken(payload);
      return (await cardsApi.getCards()).data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });
}

// Re-exported so screens can branch on user-cancel vs real error without
// importing from `shared/native/` directly.
export { PlaidLinkCancelledError };

export function useAddManualCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: { cardProductId: number; issuerId: number; nickname?: string; lastFour?: string; isPrimary: boolean }) => {
      const payload = createManualCardSchema.parse(request);
      await cardsApi.createManualCard(payload);
      return (await cardsApi.getCards()).data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });
}

export function useRequestMissingCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: { issuerName: string; cardName: string; createUserCard: boolean; nickname?: string; lastFour?: string; isPrimary: boolean }) => {
      const payload = createCardProductRequestSchema.parse(request);
      return catalogApi.createRequest(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });
}

export function useReportPermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: { locationState: PermissionState; notificationsState?: PermissionState }) => {
      const payload = updatePermissionsSchema.parse(request);
      return permissionsApi.update({ locationState: payload.locationState, notificationsState: payload.notificationsState });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });
}

export function useBillingCheckoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: { planCode: string; periodCode: string }) => {
      const payload = createCheckoutSchema.parse({ ...request, returnContextCode: "onboarding" });
      return billingApi.checkout(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });
}

export function useSaveNotificationSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: {
      pushEnabled: boolean;
      emailEnabled: boolean;
      settings: NotificationSettings;
    }) => {
      let pushToken: string | null = null;
      if (request.pushEnabled) {
        const result = await ensurePushToken();
        pushToken = result.token;
      }
      await permissionsApi.update({
        notificationsState: request.pushEnabled ? "granted" : "denied"
      });
      await devicesApi.register({ pushToken });
      const { types: _types, ...rest } = request.settings;
      const masterEnabled = request.pushEnabled || request.emailEnabled;
      const payload = updateNotificationSettingsSchema.parse({
        ...rest,
        masterEnabled,
        pushEnabled: request.pushEnabled,
        emailEnabled: request.emailEnabled
      });
      return notificationSettingsApi.update(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    }
  });
}
