import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveSubscription, type SubscriptionRecord } from "@/integrations/stripe";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Fetches the current user's subscription row from Supabase.
 * Returns null if the user has no subscription row yet (free tier).
 */
export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery<SubscriptionRecord | null>({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes — billing status rarely changes mid-session
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as SubscriptionRecord | null;
    },
  });

  const subscription = query.data ?? null;

  return {
    subscription,
    plan:      subscription?.plan     ?? "free",
    status:    subscription?.status   ?? null,
    isPro:     hasActiveSubscription(subscription),
    isTrialing: subscription?.status === "trialing",
    trialEnd:  subscription?.trial_end ?? null,
    periodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    isLoading: query.isLoading,
    error:     query.error,
    refetch:   query.refetch,
  };
}
