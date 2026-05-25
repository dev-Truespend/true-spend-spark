// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/shared/hooks/use-toast';

export interface CreditCard {
  id: string;
  user_id: string;
  plaid_item_id: string | null;
  account_id: string;
  account_name: string | null;
  account_mask: string | null;
  card_brand: string | null;
  current_balance: number | null;
  available_credit: number | null;
  credit_limit: number | null;
  apr_percentage: number | null;
  due_date: string | null;
  minimum_payment: number | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_FREE_CARDS = 3;
const MAX_TOTAL_CARDS = 10;
const ADDITIONAL_CARD_PRICE = 1.50;

export function useCreditCards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user?.id,
  });

  const cardCount = cards.length;
  const freeSlots = Math.max(0, MAX_FREE_CARDS - cardCount);
  const paidSlots = Math.max(0, MAX_TOTAL_CARDS - Math.max(cardCount, MAX_FREE_CARDS));
  const canAddMoreCards = cardCount < MAX_TOTAL_CARDS;
  const needsPayment = cardCount >= MAX_FREE_CARDS;

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_active: false })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({
        title: 'Card removed',
        description: 'Credit card has been successfully removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove card. Please try again.',
        variant: 'destructive',
      });
      console.error('Error deleting card:', error);
    },
  });

  const setPrimaryCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      // First, unset all primary flags
      await supabase
        .from('credit_cards')
        .update({ is_primary: false })
        .eq('user_id', user?.id);

      // Then set the selected card as primary
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_primary: true })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({
        title: 'Primary card updated',
        description: 'Your primary card has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update primary card.',
        variant: 'destructive',
      });
      console.error('Error setting primary card:', error);
    },
  });

  return {
    cards,
    isLoading,
    cardCount,
    freeSlots,
    paidSlots,
    canAddMoreCards,
    needsPayment,
    additionalCardPrice: ADDITIONAL_CARD_PRICE,
    maxCards: MAX_TOTAL_CARDS,
    deleteCard: deleteCardMutation.mutate,
    setPrimaryCard: setPrimaryCardMutation.mutate,
    isDeleting: deleteCardMutation.isPending,
  };
}
