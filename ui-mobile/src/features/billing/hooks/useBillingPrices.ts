import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api/billing.api";
import { billingMapper } from "@/features/billing/mappers/billing.mapper";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useBillingPrices(periodCode: string, countryCode?: string) {
  const query = useQuery({
    queryKey: [...QueryKeys.BillingPrices(countryCode ?? "profile"), periodCode],
    queryFn: () => billingApi.getPrices(periodCode, countryCode),
    enabled: Boolean(periodCode),
    staleTime: 1000 * 60 * 10
  });
  const prices = query.data?.data?.plans?.map(billingMapper.price) ?? [];
  return { ...query, prices };
}
