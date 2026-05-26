// @ts-nocheck -- TODO: fix strictNullChecks errors
import type { BackgroundGeolocationPlugin, Location } from '@capacitor-community/background-geolocation';
import { supabase } from '@/integrations/supabase/client';
import { isCapacitorNative } from '@/shared/lib/platform/capacitor';

let backgroundGeolocationPromise: Promise<BackgroundGeolocationPlugin> | null = null;

async function getBackgroundGeolocation(): Promise<BackgroundGeolocationPlugin> {
  if (!backgroundGeolocationPromise) {
    backgroundGeolocationPromise = import('@capacitor/core').then(({ registerPlugin }) =>
      registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')
    );
  }
  return backgroundGeolocationPromise;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  active: boolean;
}

export interface GeofenceEvent {
  geofenceId: string;
  geofenceName: string;
  eventType: 'enter' | 'exit';
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

class NativeGeofencingService {
  public readonly isSupported = isCapacitorNative();
  private watcherId: string | null = null;
  private activeGeofences: Map<string, Geofence> = new Map();
  private insideGeofences: Set<string> = new Set();

  /**
   * Start monitoring geofences
   */
  async startMonitoring(userId: string): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Geofencing only supported on native platforms');
    }

    if (this.watcherId) {
      console.warn('Geofencing already started');
      return;
    }

    try {
      const BackgroundGeolocation = await getBackgroundGeolocation();

      // Load user's geofences from database
      await this.loadGeofences(userId);

      // Start background geolocation with high accuracy
      this.watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'TrueSpend is tracking your location for spending alerts',
          backgroundTitle: 'Location Tracking Active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 25, // Update every 25 meters
        },
        async (location: Location | null) => {
          if (location) {
            await this.checkGeofences(
              userId,
              location.latitude,
              location.longitude,
              location.accuracy
            );
          }
        }
      );

    } catch (error) {
      console.error('Error starting geofencing:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring geofences
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isSupported || !this.watcherId) return;

    try {
      const BackgroundGeolocation = await getBackgroundGeolocation();
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      this.watcherId = null;
      this.activeGeofences.clear();
      this.insideGeofences.clear();
    } catch (error) {
      console.error('Error stopping geofencing:', error);
    }
  }

  /**
   * Load geofences from database
   */
  private async loadGeofences(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

      if (error) throw error;

      this.activeGeofences.clear();
      data?.forEach((geofence) => {
        this.activeGeofences.set(geofence.id, {
          id: geofence.id,
          name: geofence.name,
          latitude: geofence.center_lat,
          longitude: geofence.center_lng,
          radius: geofence.radius_meters,
          active: geofence.active,
        });
      });

    } catch (error) {
      console.error('Error loading geofences:', error);
      throw error;
    }
  }

  /**
   * Check if current location is inside any geofences
   */
  private async checkGeofences(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number
  ): Promise<void> {
    const events: GeofenceEvent[] = [];

    for (const [geofenceId, geofence] of this.activeGeofences) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        geofence.latitude,
        geofence.longitude
      );

      const isInside = distance <= geofence.radius;
      const wasInside = this.insideGeofences.has(geofenceId);

      if (isInside && !wasInside) {
        // Entered geofence
        this.insideGeofences.add(geofenceId);
        events.push({
          geofenceId,
          geofenceName: geofence.name,
          eventType: 'enter',
          timestamp: new Date().toISOString(),
          latitude,
          longitude,
          accuracy,
        });

        // Send push notification
        await this.sendGeofenceNotification(userId, geofence, 'enter');
      } else if (!isInside && wasInside) {
        // Exited geofence
        this.insideGeofences.delete(geofenceId);
        events.push({
          geofenceId,
          geofenceName: geofence.name,
          eventType: 'exit',
          timestamp: new Date().toISOString(),
          latitude,
          longitude,
          accuracy,
        });

        // Send push notification
        await this.sendGeofenceNotification(userId, geofence, 'exit');
      }
    }

    // Record events in database
    if (events.length > 0) {
      await this.recordGeofenceEvents(userId, events);
    }
  }

  /**
   * Record geofence events in database
   */
  private async recordGeofenceEvents(
    userId: string,
    events: GeofenceEvent[]
  ): Promise<void> {
    try {
      const records = events.map((event) => ({
        user_id: userId,
        geofence_id: event.geofenceId,
        event_type: event.eventType,
        location_lat: event.latitude,
        location_lng: event.longitude,
        accuracy_meters: event.accuracy,
        timestamp: event.timestamp,
      }));

      const { error } = await supabase.from('geofence_events').insert(records);

      if (error) throw error;

    } catch (error) {
      console.error('Error recording geofence events:', error);
    }
  }

  /**
   * Send push notification for geofence event
   */
  private async sendGeofenceNotification(
    userId: string,
    geofence: Geofence,
    eventType: 'enter' | 'exit'
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title: eventType === 'enter' ? `Entered ${geofence.name}` : `Left ${geofence.name}`,
          body:
            eventType === 'enter'
              ? 'Budget tracking is now active for this location'
              : 'Geofence tracking ended',
          data: {
            type: `geofence_${eventType}`,
            geofenceId: geofence.id,
            geofenceName: geofence.name,
          },
        },
      });
    } catch (error) {
      console.error('Error sending geofence notification:', error);
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Manually refresh geofences from database
   */
  async refreshGeofences(userId: string): Promise<void> {
    await this.loadGeofences(userId);
  }

  /**
   * Get current geofence status
   */
  getStatus(): {
    isMonitoring: boolean;
    activeGeofenceCount: number;
    insideGeofenceCount: number;
  } {
    return {
      isMonitoring: this.watcherId !== null,
      activeGeofenceCount: this.activeGeofences.size,
      insideGeofenceCount: this.insideGeofences.size,
    };
  }
}

// Export singleton instance
export const nativeGeofencingService = new NativeGeofencingService();
