import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { MapPin, Loader2, Target, TrendingUp } from 'lucide-react';

interface GeofenceSuggestion {
  cluster_id: number;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  transaction_count: number;
  total_spent: number;
  top_categories: Array<{ category: string; count: number }>;
  confidence_score: number;
}

export function GeofenceOptimizer() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [numClusters, setNumClusters] = useState('5');
  const [suggestions, setSuggestions] = useState<GeofenceSuggestion[]>([]);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-geofences', {
        body: {
          numClusters: parseInt(numClusters),
          minTransactions: 3,
        },
      });

      if (error) throw error;

      setSuggestions(data.suggestions);
      
      toast({
        title: 'Geofences Optimized!',
        description: `Generated ${data.suggestions.length} geofence suggestions using K-Means++ clustering`,
      });
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to optimize geofences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Geofence Optimizer</CardTitle>
        </div>
        <CardDescription>
          Uses K-Means++ clustering to suggest optimal geofence locations based on your spending patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numClusters">Number of Geofences</Label>
            <Input
              id="numClusters"
              type="number"
              value={numClusters}
              onChange={(e) => setNumClusters(e.target.value)}
              placeholder="Enter number of geofences"
              min="2"
              max="10"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 3-7 geofences for optimal coverage
            </p>
          </div>

          <Button 
            onClick={handleOptimize} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Locations...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Generate Suggestions
              </>
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Suggested Geofences</h3>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion.cluster_id} className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        Zone {suggestion.cluster_id + 1}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {(suggestion.confidence_score * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Radius</p>
                      <p className="font-medium">{suggestion.radius_meters}m</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transactions</p>
                      <p className="font-medium">{suggestion.transaction_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Spent</p>
                      <p className="font-medium">${suggestion.total_spent.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium text-xs">
                        {suggestion.center_lat.toFixed(4)}, {suggestion.center_lng.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {suggestion.top_categories.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Top Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.top_categories.map((cat, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cat.category} ({cat.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
