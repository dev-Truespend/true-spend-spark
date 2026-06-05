import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "@/features/cards/api/cards.api";
import { cardIdSchema } from "@/features/cards/schemas/cards.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useSetPrimary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: number) => cardsApi.setPrimary(cardIdSchema.parse(cardId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
    }
  });
}
