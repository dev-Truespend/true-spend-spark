import { useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOptions } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function usePlaid() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createLinkToken = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-create-link-token');

      if (error) throw error;

      if (data?.link_token) {
        setLinkToken(data.link_token);
        return data.link_token;
      } else {
        throw new Error('No link token received');
      }
    } catch (error) {
      console.error('[usePlaid] Create link token error:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize Plaid connection. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeToken = async (publicToken: string, metadata: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
        body: {
          public_token: publicToken,
          metadata,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Success!',
          description: `Connected ${data.cards?.length || 0} credit card(s) from ${data.institution || 'your bank'}.`,
        });
        
        // Refresh credit cards query
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
        
        return data;
      } else {
        throw new Error('Token exchange failed');
      }
    } catch (error) {
      console.error('[usePlaid] Exchange token error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect your accounts. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncTransactions = async (itemId: string, cardId?: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-sync-transactions', {
        body: { item_id: itemId, card_id: cardId },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Synced!',
          description: `Synced ${data.synced} transaction(s).`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
        queryClient.invalidateQueries({ queryKey: ['card-transactions'] });
        
        return data;
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('[usePlaid] Sync error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync transactions. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectItem = async (itemId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-disconnect-item', {
        body: { item_id: itemId },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Disconnected',
          description: 'Bank connection removed successfully.',
        });
        
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
        
        return data;
      } else {
        throw new Error('Disconnect failed');
      }
    } catch (error) {
      console.error('[usePlaid] Disconnect error:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    linkToken,
    isLoading,
    createLinkToken,
    exchangeToken,
    syncTransactions,
    disconnectItem,
  };
}

export function usePlaidLinkFlow() {
  const { linkToken, createLinkToken, exchangeToken, isLoading } = usePlaid();

  const onSuccess: PlaidLinkOnSuccess = async (publicToken, metadata) => {
    console.log('[Plaid] Link success, exchanging token...');
    await exchangeToken(publicToken, metadata);
  };

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  const openPlaidLink = async () => {
    if (!linkToken) {
      const token = await createLinkToken();
      if (token) {
        // Token is set, will trigger usePlaidLink to become ready
        setTimeout(() => open(), 100);
      }
    } else if (ready) {
      open();
    }
  };

  return {
    openPlaidLink,
    isLoading,
    ready: ready && !!linkToken,
  };
}
