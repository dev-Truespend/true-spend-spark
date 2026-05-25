import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Activity, TrendingUp, Database, HardDrive, Server } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface CacheLayerStats {
  layer: string;
  hitRate: number;
  totalRequests: number;
  hits: number;
  misses: number;
  avgResponseTime?: number;
}

export const CacheAnalyticsDashboard = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['cache-analytics'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('cache_analytics')
        .select('*')
        .gte('timestamp', oneDayAgo);
      
      if (error) throw error;
      
      // Group by cache layer
      const byLayer = data.reduce((acc, row) => {
        const layer = row.cache_type;
        if (!acc[layer]) {
          acc[layer] = { 
            hits: 0, 
            misses: 0,
            totalResponseTime: 0,
            responseCount: 0
          };
        }
        
        if (row.operation === 'hit') {
          acc[layer].hits++;
        } else {
          acc[layer].misses++;
        }
        
        if (row.response_time_ms) {
          acc[layer].totalResponseTime += row.response_time_ms;
          acc[layer].responseCount++;
        }
        
        return acc;
      }, {} as Record<string, { hits: number; misses: number; totalResponseTime: number; responseCount: number }>);
      
      // Calculate stats for each layer
      const stats: CacheLayerStats[] = Object.entries(byLayer).map(([layer, data]) => {
        const totalRequests = data.hits + data.misses;
        const hitRate = totalRequests > 0 ? (data.hits / totalRequests) * 100 : 0;
        const avgResponseTime = data.responseCount > 0 
          ? Math.round(data.totalResponseTime / data.responseCount)
          : undefined;
        
        return {
          layer,
          hitRate,
          totalRequests,
          hits: data.hits,
          misses: data.misses,
          avgResponseTime
        };
      });
      
      // Sort by layer order (L1, L2, L3)
      stats.sort((a, b) => a.layer.localeCompare(b.layer));
      
      return stats;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const getLayerIcon = (layer: string) => {
    if (layer.includes('IndexedDB')) return <HardDrive className="w-5 h-5" />;
    if (layer.includes('Memory')) return <Server className="w-5 h-5" />;
    if (layer.includes('Database')) return <Database className="w-5 h-5" />;
    return <Activity className="w-5 h-5" />;
  };

  const getLayerColor = (hitRate: number) => {
    if (hitRate >= 80) return 'text-green-500';
    if (hitRate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const overallStats = analytics?.reduce((acc, layer) => ({
    totalRequests: acc.totalRequests + layer.totalRequests,
    totalHits: acc.totalHits + layer.hits
  }), { totalRequests: 0, totalHits: 0 });

  const overallHitRate = overallStats && overallStats.totalRequests > 0
    ? (overallStats.totalHits / overallStats.totalRequests) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Cache Analytics</h2>
      </div>

      {/* Overall Stats Card */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
        <h3 className="text-lg font-semibold mb-4">Overall Performance (24h)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Requests</div>
            <div className="text-3xl font-bold">{overallStats?.totalRequests || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Cache Hits</div>
            <div className="text-3xl font-bold text-green-500">{overallStats?.totalHits || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Overall Hit Rate</div>
            <div className={`text-3xl font-bold ${getLayerColor(overallHitRate)}`}>
              {overallHitRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </Card>

      {/* Layer-specific stats */}
      <div className="space-y-4">
        {analytics && analytics.length > 0 ? (
          analytics.map((layer) => (
            <Card key={layer.layer} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {getLayerIcon(layer.layer)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{layer.layer.replace(/_/g, ' ')}</h3>
                    <div className="text-sm text-muted-foreground">
                      {layer.totalRequests} requests
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${getLayerColor(layer.hitRate)}`} />
                  <span className={`text-2xl font-bold ${getLayerColor(layer.hitRate)}`}>
                    {layer.hitRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Hit Rate</span>
                    <span className="font-medium">{layer.hitRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={layer.hitRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Hits</span>
                    <span className="font-semibold text-green-500">{layer.hits}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Misses</span>
                    <span className="font-semibold text-red-500">{layer.misses}</span>
                  </div>
                </div>

                {layer.avgResponseTime && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Response Time</span>
                      <span className="font-semibold">{layer.avgResponseTime}ms</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-muted-foreground">
              No cache analytics data available yet. Cache events will appear here as users interact with the application.
            </p>
          </Card>
        )}
      </div>

      {/* Performance Targets */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Targets</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">L1 (IndexedDB)</div>
              <div className="text-sm text-muted-foreground">Target: {'>'} 80% hit rate</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {analytics?.find(l => l.layer.includes('IndexedDB'))?.hitRate.toFixed(1) || '0'}%
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">L2 (Memory)</div>
              <div className="text-sm text-muted-foreground">Target: {'>'} 70% hit rate</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {analytics?.find(l => l.layer.includes('Memory'))?.hitRate.toFixed(1) || '0'}%
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">L3 (Database)</div>
              <div className="text-sm text-muted-foreground">Target: {'<'} 30% miss rate</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {analytics?.find(l => l.layer.includes('Database'))?.hitRate.toFixed(1) || '0'}%
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
