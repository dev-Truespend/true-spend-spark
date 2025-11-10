import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function PushNotificationManager() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Check if already subscribed
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(async (registration) => {
          const existingSub = await registration.pushManager.getSubscription();
          setSubscription(existingSub);
        });
      }

      // Show prompt if permission is default and user is logged in
      if (Notification.permission === 'default' && user) {
        const dismissed = localStorage.getItem('push-notification-dismissed');
        if (!dismissed) {
          setTimeout(() => setShowPrompt(true), 5000); // Show after 5 seconds
        }
      }
    }
  }, [user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported');
      return;
    }

    if (!user) {
      toast.error('Please sign in to enable notifications');
      return;
    }

    setLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      // Note: VAPID key should be stored in environment variables in production
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBmYRTyPB0TM8GU3QBQs';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(subscription);

      // TODO: Save subscription to backend when push_subscriptions table is created
      // For now, store locally
      localStorage.setItem('push-subscription', JSON.stringify(subscription.toJSON()));

      toast.success('Push notifications enabled!');
      setShowPrompt(false);
    } catch (error) {
      console.error('[PushNotificationManager] Subscribe error:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription || !user) return;

    setLoading(true);

    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // TODO: Remove from backend when push_subscriptions table is created
      localStorage.removeItem('push-subscription');

      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('[PushNotificationManager] Unsubscribe error:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('push-notification-dismissed', 'true');
  };

  if (!('Notification' in window)) {
    return null;
  }

  if (showPrompt && permission === 'default') {
    return (
      <Card className="fixed bottom-4 left-4 max-w-sm p-4 shadow-lg z-50 animate-in slide-in-from-bottom">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Enable Notifications</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get notified about budget alerts, spending milestones, and transaction updates.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={subscribeToPush}
                disabled={loading}
              >
                <Check className="h-4 w-4 mr-1" />
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissPrompt}
              >
                <X className="h-4 w-4 mr-1" />
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Settings UI
  if (permission === 'granted') {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscription ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {subscription ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={subscription ? 'outline' : 'default'}
            onClick={subscription ? unsubscribeFromPush : subscribeToPush}
            disabled={loading}
          >
            {subscription ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
