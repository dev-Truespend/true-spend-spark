import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { billingMapper } from "@/features/billing/mappers/billing.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useBillingFeatures() {
  const query = useQuery({
    queryKey: QueryKeys.BillingFeatures,
    queryFn: billingApi.getFeatures,
    staleTime: 1000 * 60 * 10
  });
  return { ...query, features: billingMapper.features(query.data?.data) };
}
