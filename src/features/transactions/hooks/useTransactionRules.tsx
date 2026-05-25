import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/shared/hooks/use-toast";

export interface TransactionRule {
  id: string;
  user_id: string;
  rule_name: string;
  description: string | null;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTransactionRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['transaction-rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_rules')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TransactionRule[];
    },
    enabled: !!user,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<TransactionRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('transaction_rules')
        .insert([{ ...rule, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      toast({
        title: "Success",
        description: "Transaction rule created successfully",
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

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TransactionRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('transaction_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      toast({
        title: "Success",
        description: "Transaction rule updated successfully",
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

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
      toast({
        title: "Success",
        description: "Transaction rule deleted successfully",
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

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('transaction_rules')
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-rules'] });
    },
  });

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}
