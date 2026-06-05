import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "@/features/cards/api/cards.api";
import {
  deleteRewardOverrideSchema,
  upsertRewardOverrideSchema
} from "@/features/cards/schemas/cards.schema";
import { DeleteRewardOverrideInput, UpsertRewardOverrideInput } from "@/features/cards/types/cards.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useRewardOverrides(cardId: number) {
  const query = useQuery({
    queryKey: QueryKeys.CardRewardOverrides(cardId),
    queryFn: async () => {
      const response = await cardsApi.getRewardOverrides(cardId);
      return response.data;
    },
    enabled: cardId > 0
  });

  return {
    overrides: query.data?.rewardRules ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}

export function useUpsertRewardOverride(cardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertRewardOverrideInput) => {
      const parsed = upsertRewardOverrideSchema.parse(input);
      return cardsApi.upsertRewardOverride(cardId, parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.CardRewardOverrides(cardId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.CardDetail(cardId) });
    }
  });
}

export function useDeleteRewardOverride(cardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteRewardOverrideInput) => {
      const parsed = deleteRewardOverrideSchema.parse(input);
      return cardsApi.deleteRewardOverride(cardId, parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.CardRewardOverrides(cardId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.CardDetail(cardId) });
    }
  });
}
