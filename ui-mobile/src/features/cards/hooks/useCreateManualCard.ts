import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "@/features/cards/api/cards.api";
import { createManualCardSchema } from "@/features/cards/schemas/cards.schema";
import { CreateManualCardInput } from "@/features/cards/types/cards.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCreateManualCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateManualCardInput) => {
      const parsed = createManualCardSchema.parse(input);
      return cardsApi.createManualCard({
        cardProductId: parsed.cardProductId,
        issuerId: parsed.issuerId,
        nickname: parsed.nickname,
        lastFour: parsed.lastFour === "" ? undefined : parsed.lastFour,
        isPrimary: parsed.isPrimary
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.CardLimits });
    }
  });
}
