import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  MapPin, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Radio
} from 'lucide-react';
import { useNativeGPSTracking } from '@/hooks/useNativeGPSTracking';
import { pushNotificationService } from '@/services/pushNotificationService';
import { nativeGeofencingService } from '@/services/nativeGeofencingService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export function NativeFeatureTestPanel() {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { position, tracking, startTracking, stopTracking } = useNativeGPSTracking({
    enabled: gpsEnabled,
  });

  const handleToggleGPS = async () => {
    setLoading({ ...loading, gps: true });
    try {
      if (gpsEnabled) {
        await stopTracking();
        setGpsEnabled(false);
        toast({
          title: 'GPS Disabled',
          description: 'Background location tracking stopped',
        });
      } else {
        await startTracking();
        setGpsEnabled(true);
        toast({
          title: 'GPS Enabled',
          description: 'Background location tracking started',
        });
      }
    } catch (error) {
      toast({
        title: 'GPS Error',
        description: error instanceof Error ? error.message : 'Failed to toggle GPS',
        variant: 'destructive',
      });
    } finally {
      setLoading({ ...loading, gps: false });
    }
  };

  const handleRegisterPush = async () => {
    setLoading({ ...loading, push: true });
    try {
      const token = await pushNotificationService.register();
      if (token) {
        setPushToken(token);
        toast({
          title: 'Push Notifications Registered',
          description: 'You will now receive push notifications',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: 'Could not register for push notifications',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Push Error',
        description: error instanceof Error ? error.message : 'Registration failed',
        variant: 'destructive',
      });
    } finally {
      setLoading({ ...loading, push: false });
    }
  };

  const handleToggleGeofencing = async () => {
    if (!user) return;
    
    setLoading({ ...loading, geofence: true });
    try {
      if (geofencingActive) {
        await nativeGeofencingService.stopMonitoring();
        setGeofencingActive(false);
        toast({
          title: 'Geofencing Disabled',
          description: 'Location-based alerts stopped',
        });
      } else {
        await nativeGeofencingService.startMonitoring(user.id);
        setGeofencingActive(true);
        toast({
          title: 'Geofencing Enabled',
          description: 'Location-based alerts are now active',
        });
      }
    } catch (error) {
      toast({
        title: 'Geofencing Error',
        description: error instanceof Error ? error.message : 'Failed to toggle geofencing',
        variant: 'destructive',
      });
    } finally {
      setLoading({ ...loading, geofence: false });
    }
  };

  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Native Features Test Panel
          </CardTitle>
          <CardDescription>
            Test native mobile features (GPS, Push Notifications, Geofencing)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Native features are only available in the mobile app. Please build and run the app on iOS or Android to test these features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Native Features Test Panel
        </CardTitle>
        <CardDescription>
          Platform: <Badge variant="outline">{platform}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GPS Tracking */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Background GPS Tracking</h3>
            </div>
            <Badge variant={tracking ? 'default' : 'secondary'}>
              {tracking ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {position && (
            <div className="bg-muted p-3 rounded-md mb-3 space-y-1 text-sm">
              <div>Latitude: {position.latitude.toFixed(6)}</div>
              <div>Longitude: {position.longitude.toFixed(6)}</div>
              <div>Accuracy: {position.accuracy.toFixed(1)}m</div>
              <div>Updated: {new Date(position.timestamp).toLocaleTimeString()}</div>
            </div>
          )}
          
          <Button
            onClick={handleToggleGPS}
            disabled={loading.gps}
            variant={gpsEnabled ? 'destructive' : 'default'}
            className="w-full"
          >
            {loading.gps && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {gpsEnabled ? 'Stop GPS Tracking' : 'Start GPS Tracking'}
          </Button>
        </div>

        <Separator />

        {/* Push Notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Push Notifications</h3>
            </div>
            <Badge variant={pushToken ? 'default' : 'secondary'}>
              {pushToken ? 'Registered' : 'Not Registered'}
            </Badge>
          </div>
          
          {pushToken && (
            <div className="bg-muted p-3 rounded-md mb-3 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Device registered for notifications</span>
              </div>
              <div className="mt-2 font-mono text-xs break-all opacity-70">
                Token: {pushToken.substring(0, 30)}...
              </div>
            </div>
          )}
          
          <Button
            onClick={handleRegisterPush}
            disabled={loading.push || !!pushToken}
            className="w-full"
          >
            {loading.push && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pushToken ? 'Already Registered' : 'Register for Push Notifications'}
          </Button>
        </div>

        <Separator />

        {/* Geofencing */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Geofence Monitoring</h3>
            </div>
            <Badge variant={geofencingActive ? 'default' : 'secondary'}>
              {geofencingActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {geofencingActive && (
            <div className="bg-muted p-3 rounded-md mb-3 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Monitoring {nativeGeofencingService.getStatus().activeGeofenceCount} geofences</span>
              </div>
              <div className="mt-1">
                Currently inside: {nativeGeofencingService.getStatus().insideGeofenceCount} geofences
              </div>
            </div>
          )}
          
          <Button
            onClick={handleToggleGeofencing}
            disabled={loading.geofence || !user}
            variant={geofencingActive ? 'destructive' : 'default'}
            className="w-full"
          >
            {loading.geofence && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {geofencingActive ? 'Stop Geofence Monitoring' : 'Start Geofence Monitoring'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
