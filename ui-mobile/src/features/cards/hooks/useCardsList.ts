import { useQuery } from "@tanstack/react-query";
import { cardsApi } from "@/features/cards/api/cards.api";
import { toDomainCards } from "@/features/cards/mappers/cards.mapper";
import { AppError } from "@/shared/errors/AppError";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCardsList() {
  const query = useQuery({
    queryKey: QueryKeys.Cards,
    queryFn: async () => {
      const response = await cardsApi.getCards();
      return toDomainCards(response.data);
    }
  });

  return {
    cards: query.data?.cards ?? [],
    limits: query.data?.limits,
    isLoading: query.isLoading,
    error: query.error instanceof AppError ? query.error.message : query.error?.message ?? null
  };
}
