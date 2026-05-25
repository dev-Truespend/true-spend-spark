import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Mark onboarding as complete (via the wizard's "Finish" or "Skip" buttons).
 * Triggers a profile refetch in useAuth so ProtectedRoute stops
 * redirecting to /onboarding.
 */
export function useCompleteOnboarding() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate anything that depends on profile state. useAuth's
      // profile refetches on user change, but not on profile change,
      // so we explicitly bust the auth-related caches here.
      qc.invalidateQueries({ queryKey: ["profile"] });
      // Force a page reload so useAuth's profile useEffect re-runs.
      // Cheap and reliable; happens once per user lifecycle.
      setTimeout(() => { window.location.href = "/dashboard"; }, 100);
    },
  });
}
