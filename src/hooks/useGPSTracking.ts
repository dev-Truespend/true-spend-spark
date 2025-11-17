import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface GeofenceEvent {
  geofence_id: string;
  event_type: 'enter' | 'exit' | 'dwell';
  location_lat: number;
  location_lng: number;
  accuracy_meters: number;
  location_token?: string;
}

interface LocationToken {
  token: string;
  expires_at: string;
  lat: number;
  lng: number;
}

// Feature flag for JWT location security
const ENABLE_JWT_LOCATION_SECURITY = true;

export function useGPSTracking(enabled: boolean = false) {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const tokenCacheRef = useRef<LocationToken | null>(null);

  const getLocationToken = useCallback(async (lat: number, lng: number, accuracy: number): Promise<string | null> => {
    if (!ENABLE_JWT_LOCATION_SECURITY) {
      return null;
    }

    try {
      // Check if we have a valid cached token for this location
      const cached = tokenCacheRef.current;
      if (cached && new Date(cached.expires_at) > new Date()) {
        // Check if location hasn't changed significantly (within 10 meters)
        const distance = calculateDistance(lat, lng, cached.lat, cached.lng);
        if (distance < 10) {
          return cached.token;
        }
      }

      // Get new token from edge function
      const { data, error } = await supabase.functions.invoke('sign-location-payload', {
        body: {
          lat,
          lng,
          timestamp: Date.now(),
          accuracy
        }
      });

      if (error) {
        console.error('Error signing location:', error);
        return null;
      }

      if (data?.token) {
        // Cache the token
        tokenCacheRef.current = {
          token: data.token,
          expires_at: data.expires_at,
          lat,
          lng
        };
        return data.token;
      }

      return null;
    } catch (err) {
      console.error('Error getting location token:', err);
      return null;
    }
  }, []);

  const checkGeofences = useCallback(async (lat: number, lng: number, accuracy: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get signed location token
      const locationToken = await getLocationToken(lat, lng, accuracy);

      const { data: geofences } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('active', true);

      if (!geofences) return;

      for (const geofence of geofences) {
        const distance = calculateDistance(
          lat,
          lng,
          Number(geofence.center_lat),
          Number(geofence.center_lng)
        );

        const isInside = distance <= geofence.radius_meters;

        // Record event with optional location token
        const eventData: any = {
          user_id: user.user.id,
          geofence_id: geofence.id,
          event_type: isInside ? 'enter' : 'exit',
          location_lat: lat,
          location_lng: lng,
          accuracy_meters: accuracy,
        };

        // Add location token if JWT security is enabled
        if (locationToken) {
          eventData.location_token = locationToken;
        }

        const { error: eventError } = await supabase
          .from('geofence_events')
          .insert(eventData);

        if (eventError) {
          console.error('Error recording geofence event:', eventError);
        }
      }
    } catch (err) {
      console.error('Error checking geofences:', err);
    }
  }, [getLocationToken]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('GPS not available');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const gpsPos: GPSPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        
        setPosition(gpsPos);
        setError(null);
        setTracking(true);

        // Check geofences with new position
        checkGeofences(gpsPos.latitude, gpsPos.longitude, gpsPos.accuracy);
      },
      (err) => {
        setError(err.message);
        setTracking(false);
        toast.error(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
  }, [checkGeofences]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setTracking(false);
      toast.info('GPS tracking stopped');
    }
  }, [watchId]);

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled]);

  return {
    position,
    error,
    tracking,
    startTracking,
    stopTracking,
  };
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
