import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Save, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapClickHandlerProps {
  onClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapGeofenceCreator() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(500);
  const [name, setName] = useState('');
  const [type, setType] = useState<'spending' | 'savings' | 'budget'>('spending');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('0.8');
  
  const queryClient = useQueryClient();

  const createGeofenceMutation = useMutation({
    mutationFn: async () => {
      if (!position) throw new Error('No location selected');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('geofences').insert({
        user_id: user.id,
        name,
        type,
        center_lat: position.lat,
        center_lng: position.lng,
        radius_meters: radius,
        budget_limit: budgetLimit ? parseFloat(budgetLimit) : null,
        alert_threshold: parseFloat(alertThreshold),
        active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create geofence: ' + error.message);
    },
  });

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
  }, []);

  const resetForm = () => {
    setPosition(null);
    setName('');
    setBudgetLimit('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Create Geofence on Map
        </CardTitle>
        <CardDescription>
          Click on the map to select a location, then configure your geofence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Map */}
        <div className="h-96 rounded-lg overflow-hidden border">
          <MapContainer
            center={[37.7749, -122.4194]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onClick={handleMapClick} />
            {position && (
              <>
                <Marker position={[position.lat, position.lng]} />
                <Circle
                  center={[position.lat, position.lng]}
                  radius={radius}
                  pathOptions={{
                    color: 'hsl(var(--primary))',
                    fillColor: 'hsl(var(--primary))',
                    fillOpacity: 0.2,
                  }}
                />
              </>
            )}
          </MapContainer>
        </div>

        {/* Configuration Form */}
        {position && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid gap-2">
              <Label htmlFor="name">Geofence Name</Label>
              <Input
                id="name"
                placeholder="e.g., Downtown Office, Grocery Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spending">Spending Tracker</SelectItem>
                  <SelectItem value="savings">Savings Goal</SelectItem>
                  <SelectItem value="budget">Budget Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="radius">Radius (meters)</Label>
              <Input
                id="radius"
                type="number"
                min="100"
                max="5000"
                step="50"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget">Budget Limit (Optional)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="Enter budget limit"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="threshold">Alert Threshold</Label>
              <Select value={alertThreshold} onValueChange={setAlertThreshold}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50% of budget</SelectItem>
                  <SelectItem value="0.75">75% of budget</SelectItem>
                  <SelectItem value="0.8">80% of budget</SelectItem>
                  <SelectItem value="0.9">90% of budget</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createGeofenceMutation.mutate()}
                disabled={!name || createGeofenceMutation.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Geofence
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Location: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
