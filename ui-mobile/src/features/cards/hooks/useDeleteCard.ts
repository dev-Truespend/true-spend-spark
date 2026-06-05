import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "@/features/cards/api/cards.api";
import { cardIdSchema } from "@/features/cards/schemas/cards.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: number) => cardsApi.deleteCard(cardIdSchema.parse(cardId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
    }
  });
}
