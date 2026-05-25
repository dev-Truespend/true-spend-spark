import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Calendar, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Extend Leaflet type to include heatLayer
declare module 'leaflet' {
  function heatLayer(
    latlngs: [number, number, number][],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      minOpacity?: number;
      gradient?: Record<number, string>;
    }
  ): L.Layer;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  category?: string;
  amount_spent: number;
}

interface HeatmapLayerProps {
  data: HeatmapPoint[];
}

function HeatmapLayer({ data }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Convert data to format expected by leaflet.heat: [lat, lng, intensity]
    const heatData: [number, number, number][] = data.map(point => [
      point.lat,
      point.lng,
      point.intensity
    ]);

    // Create heat layer
    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.0: '#3b82f6', // blue (low spending)
        0.5: '#f59e0b', // orange (medium spending)
        1.0: '#ef4444'  // red (high spending)
      }
    });

    heat.addTo(map);

    // Center map on data
    if (data.length > 0) {
      const bounds = L.latLngBounds(data.map(d => [d.lat, d.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      map.removeLayer(heat);
    };
  }, [data, map]);

  return null;
}

interface SpendingHeatmapProps {
  className?: string;
}

export function SpendingHeatmap({ className }: SpendingHeatmapProps) {
  const [periodDays, setPeriodDays] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch heatmap data
  const { data: heatmapData, isLoading, error } = useQuery({
    queryKey: ['spending-heatmap', periodDays, selectedCategory],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(periodDays));

      let query = supabase
        .from('geofence_heatmap_data')
        .select('lat, lng, intensity, category, amount_spent')
        .gte('period_start', startDate.toISOString())
        .order('intensity', { ascending: false })
        .limit(500); // Limit for performance

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HeatmapPoint[];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
  });

  // Fetch available categories
  const { data: categories } = useQuery({
    queryKey: ['heatmap-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_heatmap_data')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      const uniqueCategories = Array.from(
        new Set(data.map(d => d.category).filter(Boolean))
      );
      return uniqueCategories as string[];
    }
  });

  // Calculate stats
  const totalSpent = heatmapData?.reduce((sum, point) => sum + (point.amount_spent || 0), 0) || 0;
  const hotspotCount = heatmapData?.filter(point => point.intensity > 0.7).length || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Spending Heatmap
            </CardTitle>
            <CardDescription>
              Visualize your spending patterns across different locations
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Heatmap</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load heatmap data. Please try again later.'}
            </AlertDescription>
          </Alert>
        )}
        {isLoading ? (
          <Skeleton className="h-[500px] w-full rounded-lg" />
        ) : !heatmapData || heatmapData.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center border rounded-lg bg-muted/20">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No spending data available</p>
              <p className="text-sm text-muted-foreground">
                Complete transactions at geofenced locations to see heatmap
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">{heatmapData.length}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Hotspots</p>
                <p className="text-2xl font-bold">{hotspotCount}</p>
              </div>
            </div>

            <div className="h-[500px] rounded-lg overflow-hidden border">
              <MapContainer
                center={[37.7749, -122.4194]} // Default to SF
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatmapLayer data={heatmapData} />
              </MapContainer>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span>Low Spending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span>Medium Spending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span>High Spending</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
