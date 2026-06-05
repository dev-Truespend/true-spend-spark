import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { billingMapper } from "@/features/billing/mappers/billing.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useBillingPlans() {
  const query = useQuery({
    queryKey: QueryKeys.BillingPlans,
    queryFn: billingApi.getPlans,
    staleTime: 1000 * 60 * 10
  });
  const plans = query.data?.data?.plans?.map(billingMapper.plan) ?? [];
  return { ...query, plans };
}
