import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSupported] = useState(false); // Push notifications for native apps only
  const [isRegistered, setIsRegistered] = useState(false);

  // Simplified for web - would work on native mobile
  const registerDevice = useMutation({
    mutationFn: async () => {
      throw new Error('Push notifications only supported on native mobile apps');
    },
    onError: (error: Error) => {
      toast({
        title: "Not Available",
        description: "Push notifications are only available in the mobile app",
        variant: "destructive",
      });
    },
  });

  const unregisterDevice = useMutation({
    mutationFn: async (deviceToken: string) => {
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('fcm_token', deviceToken);

      if (error) throw error;
    },
    onSuccess: () => {
      setIsRegistered(false);
      toast({
        title: "Success",
        description: "Push notifications disabled",
      });
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
    },
  });

  const sendTestNotification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user?.id,
          title: 'Test Notification',
          body: 'This is a test push notification from TrueSpend',
          data: { type: 'test' },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test Sent",
        description: "Check your device for the notification",
      });
    },
  });

  return {
    isSupported,
    isRegistered,
    registerDevice,
    unregisterDevice,
    sendTestNotification,
  };
}
