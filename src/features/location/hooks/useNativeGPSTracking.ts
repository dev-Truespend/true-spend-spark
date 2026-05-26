// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useEffect, useCallback } from 'react';
import type { BackgroundGeolocationPlugin, Location } from '@capacitor-community/background-geolocation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from './use-toast';
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

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface UseNativeGPSTrackingOptions {
  enabled?: boolean;
  distanceFilter?: number; // meters
  stationaryRadius?: number; // meters
  notificationTitle?: string;
  notificationText?: string;
}

export function useNativeGPSTracking(options: UseNativeGPSTrackingOptions = {}) {
  const { user } = useAuth();
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [watcherId, setWatcherId] = useState<string | null>(null);
  const [isNative] = useState(isCapacitorNative());

  const {
    enabled = false,
    distanceFilter = 50, // Only update every 50 meters
    stationaryRadius = 25, // Start tracking after 25 meter movement
    notificationTitle = 'TrueSpend',
    notificationText = 'Tracking location for geofence alerts',
  } = options;

  // Check geofences against current position
  const checkGeofences = useCallback(async (lat: number, lng: number) => {
    if (!user) return;

    try {
      const { data: geofences, error: geofenceError } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true);

      if (geofenceError) throw geofenceError;

      for (const geofence of geofences || []) {
        const distance = calculateDistance(
          lat,
          lng,
          geofence.center_lat,
          geofence.center_lng
        );

        const isInside = distance <= geofence.radius_meters;

        // Check if state changed (entered or exited)
        const { data: lastEvent } = await supabase
          .from('geofence_events')
          .select('event_type')
          .eq('user_id', user.id)
          .eq('geofence_id', geofence.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        const wasInside = lastEvent?.event_type === 'enter';

        if (isInside && !wasInside) {
          // Entered geofence
          await supabase.from('geofence_events').insert({
            user_id: user.id,
            geofence_id: geofence.id,
            event_type: 'enter',
            location_lat: lat,
            location_lng: lng,
            accuracy_meters: position?.accuracy || null,
          });

          toast({
            title: `Entered ${geofence.name}`,
            description: 'Budget tracking active for this location',
          });
        } else if (!isInside && wasInside) {
          // Exited geofence
          await supabase.from('geofence_events').insert({
            user_id: user.id,
            geofence_id: geofence.id,
            event_type: 'exit',
            location_lat: lat,
            location_lng: lng,
            accuracy_meters: position?.accuracy || null,
          });

          toast({
            title: `Left ${geofence.name}`,
            description: 'Geofence tracking ended',
          });
        }
      }
    } catch (err) {
      console.error('Error checking geofences:', err);
    }
  }, [user, position?.accuracy]);

  // Start native background geolocation
  const startTracking = useCallback(async () => {
    if (!isNative) {
      setError('Background geolocation only works on native mobile apps');
      toast({
        title: 'Not Available',
        description: 'Background GPS tracking requires the native mobile app',
        variant: 'destructive',
      });
      return;
    }

    try {
      const BackgroundGeolocation = await getBackgroundGeolocation();

      // Configure background geolocation
      const id = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: notificationText,
          backgroundTitle: notificationTitle,
          requestPermissions: true,
          stale: false,
          distanceFilter,
        },
        (location: Location | null) => {
          if (location) {
            const newPosition: GPSPosition = {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              timestamp: new Date().toISOString(),
            };

            setPosition(newPosition);
            setError(null);

            // Check geofences
            checkGeofences(location.latitude, location.longitude);
          }
        }
      );

      setWatcherId(id);
      setTracking(true);
      toast({
        title: 'GPS Tracking Started',
        description: 'Background location tracking is now active',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start GPS tracking';
      setError(errorMessage);
      toast({
        title: 'Tracking Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [isNative, notificationText, notificationTitle, distanceFilter, checkGeofences]);

  // Stop background geolocation
  const stopTracking = useCallback(async () => {
    if (!isNative || !watcherId) return;

    try {
      const BackgroundGeolocation = await getBackgroundGeolocation();
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
      setWatcherId(null);
      setTracking(false);
      toast({
        title: 'GPS Tracking Stopped',
        description: 'Background location tracking has been disabled',
      });
    } catch (err) {
      console.error('Error stopping GPS tracking:', err);
    }
  }, [isNative, watcherId]);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (!user || !isNative) return;

    if (enabled && !tracking) {
      startTracking();
    } else if (!enabled && tracking) {
      stopTracking();
    }

    return () => {
      if (tracking) {
        stopTracking();
      }
    };
  }, [enabled, user, isNative, tracking, startTracking, stopTracking]);

  return {
    position,
    error,
    tracking,
    isNative,
    startTracking,
    stopTracking,
  };
}

// Haversine formula to calculate distance between two points
function calculateDistance(
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
