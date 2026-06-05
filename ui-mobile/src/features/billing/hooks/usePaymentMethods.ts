import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { billingMapper } from "@/features/billing/mappers/billing.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePaymentMethods() {
  const query = useQuery({
    queryKey: QueryKeys.BillingPaymentMethods,
    queryFn: billingApi.getPaymentMethods,
    staleTime: 1000 * 60
  });
  return { ...query, paymentMethods: billingMapper.paymentMethods(query.data?.data) };
}
