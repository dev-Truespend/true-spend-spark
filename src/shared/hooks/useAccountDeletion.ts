import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";

// ── Pending deletion status (for in-app banner / settings page) ──────────

export interface PendingDeletion {
  user_id:      string;
  requested_at: string;
  purge_after:  string;
  purged_at:    string | null;
}

/**
 * Returns the user's pending-deletion row if they've requested deletion
 * but the 30-day grace period hasn't elapsed. Returns null otherwise.
 *
 * RLS allows users to SELECT their own row (see migration
 * 20260525150000_gdpr_deletion_queue.sql).
 */
export function usePendingDeletion() {
  const { user } = useAuth();

  return useQuery<PendingDeletion | null>({
    queryKey: ["pending-deletion", user?.id],
    enabled:  !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gdpr_deletion_queue")
        .select("user_id, requested_at, purge_after, purged_at")
        .eq("user_id", user!.id)
        .is("purged_at", null)
        .maybeSingle();

      if (error) {
        // Most likely RLS denial because no row exists. Treat as null.
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return (data as PendingDeletion | null) ?? null;
    },
  });
}

// ── Delete account mutation ──────────────────────────────────────────────

interface DeleteAccountInput {
  password?:    string;
  confirmText:  string; // must equal "DELETE"
}

export function useDeleteAccount() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteAccountInput) => {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: input,
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (error) throw new Error(error.message || "Failed to delete account");
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; message: string; purge_after: string };
    },
    onSuccess: () => {
      // The realtime listener in useAuth will sign the user out within
      // ~1s once it sees profile.status='deleted', but invalidate
      // queries here too so the UI doesn't briefly flash stale data.
      qc.clear();
    },
  });
}

// ── Cancel pending deletion mutation ────────────────────────────────────

export function useCancelAccountDeletion() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cancel-account-deletion", {
        body:    {},
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (error) throw new Error(error.message || "Failed to cancel deletion");
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-deletion"] });
    },
  });
}
