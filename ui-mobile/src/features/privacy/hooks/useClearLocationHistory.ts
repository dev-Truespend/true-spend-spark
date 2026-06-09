import { useMutation, useQueryClient } from "@tanstack/react-query";
import { privacyApi } from "@/features/privacy/api/privacy.api";
import {
  clearLocationHistorySchema,
  ClearLocationHistoryInput
} from "@/features/privacy/schemas/privacy.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useClearLocationHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClearLocationHistoryInput) => {
      const parsed = clearLocationHistorySchema.parse(input);
      return privacyApi.clearLocationHistory(parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.HomeRecommendation });
    }
  });
}
