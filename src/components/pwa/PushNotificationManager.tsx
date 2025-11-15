import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

// Type definitions for Capacitor Push Notifications
interface PushNotificationToken {
  value: string;
}

interface PushNotification {
  title?: string;
  body?: string;
  id: string;
  badge?: number;
  data?: any;
}

interface PushNotificationActionPerformed {
  actionId: string;
  notification: PushNotification;
}

interface CapacitorPlatform {
  getPlatform: () => string;
}

declare global {
  interface Window {
    Capacitor?: CapacitorPlatform;
    PushNotifications?: {
      checkPermissions: () => Promise<{ receive: string }>;
      requestPermissions: () => Promise<{ receive: string }>;
      register: () => Promise<void>;
      addListener: (eventName: string, callback: (data: any) => void) => Promise<{ remove: () => void }>;
      removeAllListeners: () => Promise<void>;
    };
  }
}

export function PushNotificationManager() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initPush = async () => {
      // Check if running in Capacitor native environment
      if (!window.Capacitor || !window.PushNotifications) {
        console.log('[Push] Not running in Capacitor environment');
        return;
      }

      setIsSupported(true);

      try {
        const PushNotifications = window.PushNotifications;

        // Check current permission status
        const result = await PushNotifications.checkPermissions();
        
        if (result.receive === 'granted') {
          setIsEnabled(true);
          await PushNotifications.register();
        } else if (result.receive === 'denied') {
          setIsEnabled(false);
        }

        // Handle registration
        await PushNotifications.addListener('registration', async (token: PushNotificationToken) => {
          console.log('[Push] FCM Token received:', token.value);
          
          if (user) {
            try {
              // Save token to database using direct insert/update
              const { error } = await supabase.from('user_devices').upsert({
                user_id: user.id,
                fcm_token: token.value,
                platform: window.Capacitor?.getPlatform() || 'unknown',
                push_enabled: true,
                device_name: navigator.userAgent.substring(0, 100),
                updated_at: new Date().toISOString()
              });

              if (error) {
                console.error('[Push] Failed to save token:', error);
                toast.error('Failed to enable push notifications');
              } else {
                console.log('[Push] Token saved successfully');
                toast.success('Push notifications enabled!');
                setIsEnabled(true);
              }
            } catch (err) {
              console.error('[Push] Token save error:', err);
            }
          }
        });

        // Handle notification received while app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotification) => {
          console.log('[Push] Notification received:', notification);
          toast.info(notification.title || 'New notification', {
            description: notification.body
          });
        });

        // Handle notification tapped
        await PushNotifications.addListener('pushNotificationActionPerformed', (action: PushNotificationActionPerformed) => {
          console.log('[Push] Notification action performed:', action);
          // Could navigate to relevant screen based on action.notification.data
          if (action.notification.data?.route) {
            window.location.href = action.notification.data.route;
          }
        });

        // Handle registration error
        await PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[Push] Registration error:', error);
          toast.error('Failed to register for push notifications');
        });

      } catch (error) {
        console.error('[Push] Initialization error:', error);
      }
    };

    if (user) {
      initPush();
    }

    return () => {
      if (window.PushNotifications) {
        window.PushNotifications.removeAllListeners();
      }
    };
  }, [user]);

  const enableNotifications = async () => {
    if (!window.PushNotifications) return;
    
    setLoading(true);
    try {
      const permission = await window.PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await window.PushNotifications.register();
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('[Push] Enable error:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update push_enabled to false in database
      const { error } = await supabase
        .from('user_devices')
        .update({ push_enabled: false })
        .eq('user_id', user.id);

      if (error) {
        console.error('[Push] Disable error:', error);
        toast.error('Failed to disable notifications');
      } else {
        setIsEnabled(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('[Push] Disable error:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if not in Capacitor environment
  if (!isSupported || !user) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? 'Enabled for budget alerts and updates' : 'Disabled'}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={isEnabled ? 'outline' : 'default'}
          onClick={isEnabled ? disableNotifications : enableNotifications}
          disabled={loading}
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </Card>
  );
}
