import { useMutation, useQueryClient } from "@tanstack/react-query";
import { plaidApi, PlaidExchangeRequest } from "@/features/plaid/api/plaid.api";
import { exchangePlaidTokenSchema } from "@/features/plaid/schemas/plaid.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function usePlaidExchange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PlaidExchangeRequest) => {
      const parsed = exchangePlaidTokenSchema.parse(body);
      return plaidApi.exchangeToken(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.CardLimits });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.HomeRecommendation });
    }
  });
}
