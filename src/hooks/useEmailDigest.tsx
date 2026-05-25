// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export interface DigestPreferences {
  user_id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  preferred_time: string;
  created_at: string;
  updated_at: string;
}

export function useEmailDigest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['digest-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('digest_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DigestPreferences | null;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<DigestPreferences>) => {
      const { data, error } = await supabase
        .from('digest_preferences')
        .upsert({
          user_id: user?.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest-preferences'] });
      toast({
        title: "Success",
        description: "Email digest preferences updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTestDigest = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-email-digest', {
        body: {
          userId: user?.id,
          period: 'week',
          isTest: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test Digest Sent",
        description: "Check your email for the test digest",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences,
    sendTestDigest,
  };
}
