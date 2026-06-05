import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { billingMapper } from "@/features/billing/mappers/billing.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useSubscription() {
  const query = useQuery({
    queryKey: QueryKeys.BillingSubscription,
    queryFn: billingApi.getSubscription,
    staleTime: 1000 * 30
  });
  return { ...query, subscription: billingMapper.subscription(query.data?.data) };
}
