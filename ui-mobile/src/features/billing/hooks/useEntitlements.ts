import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { billingMapper } from "@/features/billing/mappers/billing.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useEntitlements() {
  const query = useQuery({
    queryKey: QueryKeys.Entitlements,
    queryFn: billingApi.getEntitlements,
    staleTime: 1000 * 30
  });
  return { ...query, entitlements: billingMapper.entitlements(query.data?.data) };
}
