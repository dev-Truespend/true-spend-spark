import { apiGet, apiPost } from "@/shared/api/client";
import {
  CheckoutInput,
  EntitlementsResponse,
  HostedBillingResponse,
  PaymentMethodsResponse,
  PlanFeaturesResponse,
  PlanPricesResponse,
  PlansResponse,
  SubscriptionResponse
} from "@/features/billing/types/billing.types";

export const billingApi = {
  getPlans: () => apiGet<PlansResponse>("/api/v1/billing/plans"),
  getPrices: (periodCode: string, countryCode?: string) =>
    apiGet<PlanPricesResponse>("/api/v1/billing/prices", countryCode ? { countryCode, periodCode } : { periodCode }),
  getFeatures: () => apiGet<PlanFeaturesResponse>("/api/v1/billing/features"),
  getSubscription: () => apiGet<SubscriptionResponse>("/api/v1/billing/subscription"),
  getEntitlements: () => apiGet<EntitlementsResponse>("/api/v1/entitlements"),
  getPaymentMethods: () => apiGet<PaymentMethodsResponse>("/api/v1/billing/payment-methods"),
  checkout: (body: CheckoutInput) => apiPost<HostedBillingResponse>("/api/v1/billing/checkout", body),
  portal: () => apiPost<HostedBillingResponse>("/api/v1/billing/portal")
};
