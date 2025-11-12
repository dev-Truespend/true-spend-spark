import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Geofences() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const queryClient = useQueryClient();
  const { position, tracking } = useGPSTracking(trackingEnabled);

  const [formData, setFormData] = useState({
    name: '',
    type: 'spending' as 'spending' | 'alert',
    center_lat: '',
    center_lng: '',
    radius_meters: '500',
    budget_limit: '',
    alert_threshold: '0.8',
  });

  const { data: geofences, isLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('geofences').insert({
        user_id: user.user.id,
        name: data.name,
        type: data.type,
        center_lat: parseFloat(data.center_lat),
        center_lng: parseFloat(data.center_lng),
        radius_meters: parseInt(data.radius_meters),
        budget_limit: data.budget_limit ? parseFloat(data.budget_limit) : null,
        alert_threshold: parseFloat(data.alert_threshold),
        active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence created successfully');
      setDialogOpen(false);
      setFormData({
        name: '',
        type: 'spending',
        center_lat: '',
        center_lng: '',
        radius_meters: '500',
        budget_limit: '',
        alert_threshold: '0.8',
      });
    },
    onError: (error) => {
      toast.error(`Failed to create geofence: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('geofences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('geofences').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });

  const useCurrentLocation = () => {
    if (position) {
      setFormData((prev) => ({
        ...prev,
        center_lat: position.latitude.toFixed(6),
        center_lng: position.longitude.toFixed(6),
      }));
      toast.success('Location set from GPS');
    } else {
      toast.error('GPS position not available. Enable tracking first.');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Geofences</h1>
          <p className="text-muted-foreground">
            Manage location-based spending zones and alerts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Geofence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Geofence</DialogTitle>
              <DialogDescription>
                Define a geographic area for tracking spending
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Downtown Shopping District"
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'spending' | 'alert') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spending">Spending Zone</SelectItem>
                    <SelectItem value="alert">Alert Zone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.000001"
                    value={formData.center_lat}
                    onChange={(e) => setFormData({ ...formData, center_lat: e.target.value })}
                    placeholder="37.7749"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.000001"
                    value={formData.center_lng}
                    onChange={(e) => setFormData({ ...formData, center_lng: e.target.value })}
                    placeholder="-122.4194"
                  />
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={useCurrentLocation} className="w-full">
                <Navigation className="mr-2 h-4 w-4" />
                Use Current Location
              </Button>

              <div>
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                />
              </div>

              {formData.type === 'spending' && (
                <div>
                  <Label htmlFor="budget">Budget Limit ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget_limit}
                    onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
                    placeholder="100.00"
                  />
                </div>
              )}

              <Button onClick={() => createMutation.mutate(formData)} className="w-full">
                Create Geofence
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>GPS Tracking</CardTitle>
              <CardDescription>
                {tracking
                  ? `Location: ${position?.latitude.toFixed(6)}, ${position?.longitude.toFixed(6)} (±${position?.accuracy.toFixed(0)}m)`
                  : 'Enable to track your location'}
              </CardDescription>
            </div>
            <Switch checked={trackingEnabled} onCheckedChange={setTrackingEnabled} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">Loading...</CardContent>
          </Card>
        ) : geofences?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No geofences yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          geofences?.map((geofence) => (
            <Card key={geofence.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{geofence.name}</CardTitle>
                  </div>
                  <Switch
                    checked={geofence.active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: geofence.id, active: checked })
                    }
                  />
                </div>
                <Badge variant="outline">{geofence.type}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Center:</span>{' '}
                    {Number(geofence.center_lat).toFixed(4)}, {Number(geofence.center_lng).toFixed(4)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Radius:</span> {geofence.radius_meters}m
                  </div>
                  {geofence.budget_limit && (
                    <div>
                      <span className="text-muted-foreground">Budget:</span> $
                      {Number(geofence.budget_limit).toFixed(2)}
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(geofence.id)}
                    className="w-full mt-4"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
