import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationService {
  isSupported: boolean;
  register: () => Promise<string | null>;
  unregister: (token: string) => Promise<void>;
  addListeners: () => void;
  removeListeners: () => void;
}

class NativePushNotificationService implements PushNotificationService {
  public readonly isSupported = Capacitor.isNativePlatform();
  private listeners: (() => void)[] = [];

  async register(): Promise<string | null> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported on this platform');
      return null;
    }

    try {
      // Request permission
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        // Register with OS
        await PushNotifications.register();
        
      // Token will be received in the 'registration' listener
      return new Promise(async (resolve) => {
        const removeListener = await PushNotifications.addListener('registration', (token: Token) => {
          removeListener.remove();
          resolve(token.value);
        });

        // Timeout after 10 seconds
        setTimeout(async () => {
          (await removeListener).remove();
          resolve(null);
        }, 10000);
      });
      } else {
        console.warn('Push notification permission denied');
        return null;
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async unregister(token: string): Promise<void> {
    if (!this.isSupported) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove from database
      await supabase
        .from('user_devices')
        .delete()
        .match({ 
          user_id: user.id,
          fcm_token: token 
        });

    } catch (error) {
      console.error('Error unregistering push notification:', error);
    }
  }

  async addListeners(): Promise<void> {
    if (!this.isSupported) return;

    // Registration success
    const registrationListener = await PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Store token in database
          const platform = Capacitor.getPlatform();
          await supabase.from('user_devices').upsert({
            user_id: user.id,
            fcm_token: token.value,
            platform: platform === 'ios' ? 'ios' : 'android',
            device_name: `${platform} Device`,
            active: true,
          }, {
            onConflict: 'fcm_token'
          });

        } catch (error) {
          console.error('Error saving device token:', error);
        }
      }
    );

    // Registration error
    const registrationErrorListener = await PushNotifications.addListener(
      'registrationError',
      (error: any) => {
        console.error('Push registration error:', error);
      }
    );

    // Notification received (app in foreground)
    const pushReceivedListener = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        
        // Handle foreground notification
        // You can show a custom in-app notification here if desired
      }
    );

    // Notification action performed (user tapped)
    const pushActionListener = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        
        // Handle notification tap
        // Navigate to appropriate screen based on notification.notification.data
        const data = notification.notification.data;
        if (data?.type === 'budget_alert') {
          // Navigate to budgets page
          window.location.href = '/budgets';
        } else if (data?.type === 'geofence_enter') {
          // Navigate to location page
          window.location.href = '/location-history';
        }
      }
    );

    // Store listener removal functions
    this.listeners = [
      () => registrationListener.remove(),
      () => registrationErrorListener.remove(),
      () => pushReceivedListener.remove(),
      () => pushActionListener.remove(),
    ];
  }

  removeListeners(): void {
    this.listeners.forEach(remove => remove());
    this.listeners = [];
  }
}

// Create singleton instance
export const pushNotificationService = new NativePushNotificationService();

// Auto-add listeners when supported
if (pushNotificationService.isSupported) {
  pushNotificationService.addListeners();
}
