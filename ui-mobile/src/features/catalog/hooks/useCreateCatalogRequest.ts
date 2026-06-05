import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "@/features/catalog/api/catalog.api";
import { createCardProductRequestSchema } from "@/features/catalog/schemas/catalog.schema";
import { CreateCardProductRequestInput } from "@/features/catalog/types/catalog.types";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useCreateCatalogRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCardProductRequestInput) => {
      const parsed = createCardProductRequestSchema.parse(body);
      return catalogApi.createRequest(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
      void queryClient.invalidateQueries({ queryKey: QueryKeys.CardLimits });
    }
  });
}
