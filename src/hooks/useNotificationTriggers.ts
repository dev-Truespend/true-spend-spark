import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook to automatically trigger push notifications for key events
 * - Budget threshold alerts
 * - Geofence entry/exit
 * - Transaction confirmations
 */
export const useNotificationTriggers = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Listen for budget updates
    const budgetChannel = supabase
      .channel('budget-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const budget = payload.new;
          
          // Calculate spending percentage
          // This would need a join with transactions to be accurate
          // For now, we'll trigger on alert_threshold if set
          if (budget.alert_threshold) {
            // Send notification
            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: user.id,
                title: 'Budget Alert',
                body: `Your ${budget.category} budget is nearing its limit`,
                category: 'budget_alert',
                data: {
                  budget_id: budget.id,
                  category: budget.category,
                  limit: budget.limit_amount,
                },
              },
            });
          }
        }
      )
      .subscribe();

    // Listen for geofence events
    const geofenceChannel = supabase
      .channel('geofence-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'geofence_events',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const event = payload.new;
          
          if (event.event_type === 'enter' && event.geofence_id) {
            // Fetch geofence details
            const { data: geofence } = await supabase
              .from('geofences')
              .select('name, type, budget_limit')
              .eq('id', event.geofence_id)
              .single();

            if (geofence) {
              const message = geofence.budget_limit 
                ? `You're at ${geofence.name}. Budget limit: $${geofence.budget_limit}`
                : `You've entered ${geofence.name}`;

              await supabase.functions.invoke('send-push-notification', {
                body: {
                  userId: user.id,
                  title: 'Location Reminder',
                  body: message,
                  category: 'geofence_reminder',
                  data: {
                    geofence_id: event.geofence_id,
                    event_type: 'enter',
                    place_name: geofence.name,
                  },
                },
              });
            }
          }
        }
      )
      .subscribe();

    // Listen for new transactions
    const transactionChannel = supabase
      .channel('transaction-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const transaction = payload.new;

          // Fetch merchant name if available
          let merchantName = 'Unknown Merchant';
          if (transaction.merchant_id) {
            const { data: merchant } = await supabase
              .from('merchants')
              .select('name')
              .eq('id', transaction.merchant_id)
              .single();
            
            if (merchant) {
              merchantName = merchant.name;
            }
          }

          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: user.id,
              title: 'New Transaction',
              body: `$${transaction.amount.toFixed(2)} at ${merchantName}`,
              category: 'transaction_alert',
              data: {
                transaction_id: transaction.id,
                amount: transaction.amount,
                merchant: merchantName,
                category: transaction.category,
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(budgetChannel);
      supabase.removeChannel(geofenceChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user]);
};
