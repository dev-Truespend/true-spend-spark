import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { createCheckoutSchema, CreateCheckoutInput } from "@/features/billing/schemas/billing.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCheckoutInput) => {
      const parsed = createCheckoutSchema.parse(input);
      return billingApi.checkout(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingSubscription });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Entitlements });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingPaymentMethods });
    }
  });
}
