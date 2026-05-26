/**
 * useAIAgent
 *
 * React hook that calls the TrueSpend ai-agent Edge Function and manages
 * loading, error, and response state. Supports both one-shot queries
 * (via the `query` helper) and cached react-query reads.
 *
 * @requires ai-agent edge function
 * @requires ai_recommendations table (RLS: user sees own rows)
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentIntent =
  | "analyze_spending"
  | "best_card_now"
  | "missed_rewards"
  | "apply_recommendations"
  | "anomaly_check"
  | "chat";

export interface AgentPayload {
  merchant?: string;
  category?: string;
  amount_cents?: number;
  period?: "week" | "month" | "quarter";
  days?: number;
  message?: string;
}

export interface AgentResponse {
  response: string;       // The AI's markdown text answer
  data?: unknown;         // Structured data from tool calls (card rankings, missed $ etc.)
  intent: string;
}

export interface AIRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  body: string;
  estimated_value_cents: number | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
  credit_card_id: string | null;
  catalog_card_id: string | null;
}

// ── Core agent caller ────────────────────────────────────────────────────────

async function callAgent(intent: AgentIntent, payload: AgentPayload = {}): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke("ai-agent", {
    body: { intent, payload },
  });
  if (error) throw new Error(error.message || "AI agent error");
  return data as AgentResponse;
}

// ── Hook: one-shot agent call ─────────────────────────────────────────────────

export function useAgentMutation() {
  const [result, setResult] = useState<AgentResponse | null>(null);

  const mutation = useMutation({
    mutationFn: ({ intent, payload }: { intent: AgentIntent; payload?: AgentPayload }) =>
      callAgent(intent, payload),
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => {
      toast.error(err.message || "AI analysis failed");
    },
  });

  return {
    ask: (intent: AgentIntent, payload?: AgentPayload) =>
      mutation.mutate({ intent, payload }),
    result,
    isPending: mutation.isPending,
    reset: () => { mutation.reset(); setResult(null); },
  };
}

// ── Hook: cached spending analysis ───────────────────────────────────────────

export function useSpendingAnalysis(period: "week" | "month" | "quarter" = "month") {
  const { session } = useAuth();
  return useQuery<AgentResponse>({
    queryKey: ["ai-agent-analysis", period, session?.user.id],
    enabled: !!session,
    staleTime: 60 * 60 * 1000,   // 1 hour — AI calls are expensive
    retry: 1,
    queryFn: () => callAgent("analyze_spending", { period }),
  });
}

// ── Hook: missed rewards ──────────────────────────────────────────────────────

export function useMissedRewards(days: 30 | 90 = 30) {
  const { session } = useAuth();
  return useQuery<AgentResponse>({
    queryKey: ["ai-agent-missed-rewards", days, session?.user.id],
    enabled: !!session,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: () => callAgent("missed_rewards", { days }),
  });
}

// ── Hook: best card for a purchase ───────────────────────────────────────────

export function useBestCardForPurchase(
  category: string | undefined,
  amountCents?: number
) {
  const { session } = useAuth();
  return useQuery<AgentResponse>({
    queryKey: ["ai-agent-best-card", category, amountCents, session?.user.id],
    enabled: !!session && !!category,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: () => callAgent("best_card_now", { category, amount_cents: amountCents }),
  });
}

// ── Hook: card apply recommendations ─────────────────────────────────────────

export function useCardApplyRecommendations() {
  const { session } = useAuth();
  return useQuery<AgentResponse>({
    queryKey: ["ai-agent-apply", session?.user.id],
    enabled: !!session,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — expensive + infrequent
    retry: 1,
    queryFn: () => callAgent("apply_recommendations"),
  });
}

// ── Hook: recommendation feed from DB ────────────────────────────────────────

export function useRecommendations() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<AIRecommendation[]>({
    queryKey: ["ai-recommendations", session?.user.id],
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_recommendations")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AIRecommendation[];
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_recommendations")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-recommendations"] }),
    onError: () => toast.error("Could not dismiss — please try again"),
  });

  const markActioned = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_recommendations")
        .update({ status: "actioned" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-recommendations"] }),
  });

  return {
    recommendations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    dismiss: dismiss.mutate,
    markActioned: markActioned.mutate,
    refetch: query.refetch,
  };
}

// ── Convenience: chat with the agent ─────────────────────────────────────────

export function useAgentChat() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [isPending, setIsPending] = useState(false);

  const send = useCallback(async (message: string) => {
    if (!message.trim() || isPending) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setIsPending(true);
    try {
      const res = await callAgent("chat", { message });
      setMessages((m) => [...m, { role: "assistant", text: res.response }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  return { messages, send, isPending, clear: () => setMessages([]) };
}
