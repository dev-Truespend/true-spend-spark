import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Database, HardDrive, Zap, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RedisMetrics {
  hitRate: number;
  totalRequests: number;
  memoryUsage: number;
  avgLatency: number;
  quotaRemaining: number;
}

export function RedisCacheMonitor() {
  const [metrics, setMetrics] = useState<RedisMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('redis-metrics');
        
        if (fnError) throw fnError;
        
        setMetrics(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Redis metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading Redis metrics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.hitRate.toFixed(1)}%</div>
            <Progress value={metrics.hitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Server-side Redis performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLatency.toFixed(1)}ms</div>
            <p className="text-xs text-muted-foreground mt-2">
              Redis response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Lifetime cache operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memoryUsage.toFixed(1)}MB</div>
            <Progress value={(metrics.memoryUsage / 256) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.quotaRemaining.toFixed(1)}% quota remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cache Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">L1 Redis (Server)</span>
                <Badge variant="default">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Edge functions use Redis for fast server-side caching
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">L2 IndexedDB (Browser)</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Client-side caching for offline support and reduced API calls
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">L3 Database (Supabase)</span>
                <Badge variant="secondary">Fallback</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Direct database queries when cache misses occur
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
