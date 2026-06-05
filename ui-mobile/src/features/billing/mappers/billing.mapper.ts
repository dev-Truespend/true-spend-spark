import {
  Entitlements,
  EntitlementsResponse,
  Money,
  PaymentMethod,
  PaymentMethodsResponse,
  Plan,
  PlanFeature,
  PlanFeaturesResponse,
  PlanPrice,
  Subscription,
  SubscriptionResponse
} from "@/features/billing/types/billing.types";

export const billingMapper = {
  money: (raw: Money): Money => ({
    amount: raw.amount,
    currencyCode: raw.currencyCode,
    display: raw.display
  }),
  plan: (raw: Plan): Plan => ({ ...raw }),
  price: (raw: PlanPrice): PlanPrice => ({
    planCode: raw.planCode,
    countryCode: raw.countryCode,
    periodCode: raw.periodCode,
    amount: billingMapper.money(raw.amount),
    stripePriceId: raw.stripePriceId ?? null
  }),
  feature: (raw: PlanFeature): PlanFeature => ({
    code: raw.code,
    displayName: raw.displayName,
    description: raw.description ?? null,
    valueType: raw.valueType,
    valuesByPlan: raw.valuesByPlan.map((v) => ({ planCode: v.planCode, value: v.value }))
  }),
  features: (raw: PlanFeaturesResponse | undefined): PlanFeature[] =>
    raw?.features?.map(billingMapper.feature) ?? [],
  subscription: (raw: SubscriptionResponse | undefined): Subscription | null =>
    raw
      ? {
          planCode: raw.planCode,
          status: raw.status,
          trialEnd: raw.trialEnd ?? null,
          currentPeriodEnd: raw.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: raw.cancelAtPeriodEnd
        }
      : null,
  entitlements: (raw: EntitlementsResponse | undefined): Entitlements | null =>
    raw
      ? {
          planCode: raw.planCode,
          trialing: raw.trialing ?? false,
          trialEndsAt: raw.trialEndsAt ?? null,
          cardLinkLimit: raw.cardLinkLimit ?? null,
          unlimitedCards: raw.unlimitedCards,
          aiInsightsEnabled: raw.aiInsightsEnabled,
          plaidLinkingEnabled: raw.plaidLinkingEnabled ?? false,
          plaidTransactionsViewEnabled: raw.plaidTransactionsViewEnabled ?? false,
          geofencingEnabled: raw.geofencingEnabled ?? false,
          features: raw.features ?? {}
        }
      : null,
  paymentMethod: (raw: PaymentMethod): PaymentMethod => ({
    id: raw.id,
    stripePaymentMethodId: raw.stripePaymentMethodId,
    brand: raw.brand ?? null,
    lastFour: raw.lastFour ?? null,
    expMonth: raw.expMonth ?? null,
    expYear: raw.expYear ?? null,
    isDefault: raw.isDefault
  }),
  paymentMethods: (raw: PaymentMethodsResponse | undefined): PaymentMethod[] =>
    raw?.paymentMethods?.map(billingMapper.paymentMethod) ?? []
};
