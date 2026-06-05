import { useQuery } from "@tanstack/react-query";
import { cardsApi } from "@/features/cards/api/cards.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCardDetail(cardId: number) {
  const query = useQuery({
    queryKey: QueryKeys.CardDetail(cardId),
    queryFn: async () => {
      const response = await cardsApi.getCardDetail(cardId);
      return response.data;
    },
    enabled: cardId > 0
  });

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}
