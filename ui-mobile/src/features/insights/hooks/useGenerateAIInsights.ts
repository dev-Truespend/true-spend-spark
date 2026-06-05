import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/features/insights/api/analytics.api";
import { QueryKeys } from "@/shared/constants/QueryKeys";

const POLL_INTERVAL_MS = 2_000;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

export function useGenerateAIInsights() {
  const queryClient = useQueryClient();
  const [activeRunId, setActiveRunId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () => analyticsApi.generateAIInsights(),
    onSuccess: (response) => {
      const runId = response.data?.runId ?? null;
      setActiveRunId(runId);
    }
  });

  const pollQuery = useQuery({
    queryKey: activeRunId !== null ? QueryKeys.AIInsightGenerationRun(activeRunId) : ["ai-insights", "run", "idle"],
    queryFn: async () => {
      if (activeRunId === null) return null;
      const response = await analyticsApi.getGenerationRun(activeRunId);
      return response.data ?? null;
    },
    enabled: activeRunId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.statusCode;
      return status && TERMINAL_STATUSES.has(status) ? false : POLL_INTERVAL_MS;
    }
  });

  const pollStatus = pollQuery.data?.statusCode ?? null;

  useEffect(() => {
    if (pollStatus && TERMINAL_STATUSES.has(pollStatus)) {
      if (pollStatus === "succeeded") {
        queryClient.invalidateQueries({ queryKey: QueryKeys.AIInsights });
      }
      setActiveRunId(null);
    }
  }, [pollStatus, queryClient]);

  const startingStatus = mutation.data?.data?.status ?? null;
  const isGenerating = mutation.isPending || (activeRunId !== null && !TERMINAL_STATUSES.has(pollStatus ?? ""));

  return {
    generate: mutation.mutate,
    runId: activeRunId,
    status: pollStatus ?? startingStatus,
    isLoading: isGenerating,
    error: mutation.error ? (mutation.error as Error).message : null
  };
}
