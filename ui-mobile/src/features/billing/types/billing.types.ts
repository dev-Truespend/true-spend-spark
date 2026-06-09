export type Money = {
  amount: number;
  currencyCode: string;
  display: string;
};

export type Plan = {
  code: string;
  displayName: string;
  description?: string | null;
  trialDays: number;
};

export type PlanPrice = {
  planCode: string;
  countryCode: string;
  periodCode: string;
  amount: Money;
  stripePriceId?: string | null;
};

export type PlanFeatureValue = {
  planCode: string;
  value: string;
};

export type PlanFeature = {
  code: string;
  displayName: string;
  description?: string | null;
  valueType: string;
  valuesByPlan: PlanFeatureValue[];
};

export type Subscription = {
  planCode: string;
  status: string;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
};

export type Entitlements = {
  planCode: string;
  trialing: boolean;
  trialEndsAt: string | null;
  manualCardLimit: number | null;
  plaidCardLimit: number | null;
  geoRecommendationsPerDay: number | null;
  unlimitedCards: boolean;
  aiInsightsEnabled: boolean;
  plaidLinkingEnabled: boolean;
  plaidTransactionsViewEnabled: boolean;
  geofencingEnabled: boolean;
  features: Record<string, string | number | boolean>;
};

export type PaymentMethod = {
  id: number;
  stripePaymentMethodId: string;
  brand?: string | null;
  lastFour?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  isDefault: boolean;
};

export type ReturnContextCode = "onboarding" | "billing";

export type CheckoutInput = {
  planCode: string;
  periodCode: string;
  returnContextCode: ReturnContextCode;
};

export type PlansResponse = { plans: Plan[] };
export type PlanPricesResponse = { plans: PlanPrice[] };
export type PlanFeaturesResponse = { features: PlanFeature[] };
export type SubscriptionResponse = Subscription;
export type EntitlementsResponse = Entitlements;
export type PaymentMethodsResponse = { paymentMethods: PaymentMethod[] };
export type HostedBillingResponse = { url: string };
