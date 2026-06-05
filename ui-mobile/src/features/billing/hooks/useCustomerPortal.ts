import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCustomerPortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingSubscription });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Entitlements });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.BillingPaymentMethods });
    }
  });
}
