import { useState, useCallback } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOptions, PlaidLinkError } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function usePlaid() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLinkToken = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-create-link-token');
      
      if (error) throw error;
      
      setLinkToken(data.link_token);
      return data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: "Connection Error",
        description: "Failed to initialize Plaid connection. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const exchangeToken = useCallback(async (publicToken: string, metadata: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
        body: { public_token: publicToken, metadata }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Connected ${data.cards_added} credit card(s)`,
      });

      // Invalidate queries to refresh the cards list
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      
      return data;
    } catch (error) {
      console.error('Error exchanging token:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect your account. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  const syncTransactions = useCallback(async (itemId: string, cardId?: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-sync-transactions', {
        body: { item_id: itemId, credit_card_id: cardId }
      });

      if (error) throw error;

      toast({
        title: "Synced!",
        description: `Updated ${data.transactions_synced} transaction(s)`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      return data;
    } catch (error) {
      console.error('Error syncing transactions:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync transactions. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  const disconnectItem = useCallback(async (itemId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('plaid-disconnect-item', {
        body: { item_id: itemId }
      });

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Successfully disconnected your account",
      });

      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    } catch (error) {
      console.error('Error disconnecting item:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, queryClient]);

  return { linkToken, isLoading, createLinkToken, exchangeToken, syncTransactions, disconnectItem };
}

export function usePlaidLinkFlow() {
  const { linkToken, createLinkToken, exchangeToken, isLoading } = usePlaid();
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  const initializeLinkToken = useCallback(async () => {
    if (linkToken) return; // Don't fetch if we already have a token
    
    setIsTokenLoading(true);
    try {
      await createLinkToken();
    } finally {
      setIsTokenLoading(false);
    }
  }, [linkToken, createLinkToken]);

  const onSuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    await exchangeToken(publicToken, metadata);
  }, [exchangeToken]);

  const onExit = useCallback((err: PlaidLinkError | null) => {
    if (err) {
      console.error('Plaid Link error:', err);
    }
  }, []);

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess,
    onExit,
  };

  const { open, ready } = usePlaidLink(config);

  const openPlaidLink = useCallback(() => {
    if (ready && linkToken) {
      open();
    }
  }, [ready, linkToken, open]);

  return {
    initializeLinkToken,
    openPlaidLink,
    isLoading: isLoading || isTokenLoading,
    ready: ready && !!linkToken,
  };
}
