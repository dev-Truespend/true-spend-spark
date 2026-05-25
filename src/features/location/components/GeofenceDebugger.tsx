import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { MapPin, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from '@/shared/hooks/use-toast';

interface GeofenceEvent {
  id: string;
  event_type: string;
  timestamp: string;
  location_lat: number;
  location_lng: number;
  accuracy_meters: number;
  geofence: {
    name: string;
    center_lat: number;
    center_lng: number;
    radius_meters: number;
  };
}

export function GeofenceDebugger() {
  const { user } = useAuth();
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('geofence_events')
        .select(`
          id,
          event_type,
          timestamp,
          location_lat,
          location_lng,
          accuracy_meters,
          geofences(name, center_lat, center_lng, radius_meters)
        `)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      setEvents(
        data?.map((event: any) => ({
          ...event,
          geofence: event.geofences,
        })) || []
      );
    } catch (error) {
      console.error('Error loading geofence events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load geofence events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearEvents = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('geofence_events')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setEvents([]);
      toast({
        title: 'Events Cleared',
        description: 'All geofence events have been deleted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear events',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user]);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geofence Event Debugger
            </CardTitle>
            <CardDescription>
              View and analyze geofence entry/exit events
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadEvents}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearEvents}
              disabled={events.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No geofence events recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const distance = calculateDistance(
                  event.location_lat,
                  event.location_lng,
                  event.geofence.center_lat,
                  event.geofence.center_lng
                );

                return (
                  <Card key={event.id} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold">{event.geofence.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant={event.event_type === 'enter' ? 'default' : 'secondary'}
                        >
                          {event.event_type.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Location</div>
                          <div className="font-mono text-xs">
                            {event.location_lat.toFixed(6)}, {event.location_lng.toFixed(6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Distance from Center</div>
                          <div className="font-medium">{distance.toFixed(1)}m</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Accuracy</div>
                          <div className="font-medium">±{event.accuracy_meters.toFixed(1)}m</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Geofence Radius</div>
                          <div className="font-medium">{event.geofence.radius_meters}m</div>
                        </div>
                      </div>

                      {distance > event.geofence.radius_meters && event.event_type === 'enter' && (
                        <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded">
                          ⚠️ Warning: Event triggered outside geofence radius (possibly due to GPS inaccuracy)
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
