import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Database, TrendingUp, Clock, Zap, HardDrive } from "lucide-react";
import { format } from "date-fns";

interface CacheAnalytic {
  id: string;
  cache_type: string;
  operation: string;
  response_time_ms: number | null;
  saved_api_cost_usd: number | null;
  timestamp: string;
  metadata: Record<string, any> | null;
}

export function CacheAnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['cache-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cache_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CacheAnalytic[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: cacheSize } = useQuery({
    queryKey: ['cache-size'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('merchants_cache_v2')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading cache analytics...</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics
  const hitRate = analytics?.filter(a => a.cache_type === 'merchant_discovery').length || 0;
  const totalSavings = analytics?.reduce((sum, a) => sum + (a.saved_api_cost_usd || 0), 0) || 0;
  const avgResponseTime = 
    analytics && analytics.length > 0
      ? analytics.reduce((sum, a) => sum + (a.response_time_ms || 0), 0) / analytics.length
      : 0;

  const recentEvictions = analytics?.filter(a => a.cache_type === 'lru_eviction') || [];
  const lastEviction = recentEvictions[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Cache Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              Cache Size
            </div>
            <div className="text-2xl font-bold">{cacheSize?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {cacheSize && cacheSize > 10000 ? (
                <Badge variant="destructive" className="text-xs">
                  Above threshold
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Within limits
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Cache Hits
            </div>
            <div className="text-2xl font-bold">{hitRate}</div>
            <div className="text-xs text-muted-foreground">Last 100 operations</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Avg Response
            </div>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <div className="text-xs text-muted-foreground">Query latency</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Cost Savings
            </div>
            <div className="text-2xl font-bold">${totalSavings.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">API cost reduction</div>
          </div>
        </div>

        {/* Recent Evictions */}
        {lastEviction && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Latest Cache Eviction
            </h3>
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {lastEviction.metadata?.total_removed || 0} entries removed
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(lastEviction.timestamp), 'PPp')}
                  </div>
                </div>
                <Badge variant="outline">LRU Policy</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Expired:</span>
                  <span className="ml-1 font-medium">
                    {lastEviction.metadata?.expired_removed || 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Old:</span>
                  <span className="ml-1 font-medium">
                    {lastEviction.metadata?.old_removed || 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">LRU:</span>
                  <span className="ml-1 font-medium">
                    {lastEviction.metadata?.lru_evicted || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cache Operations Log */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Recent Operations</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analytics?.slice(0, 10).map((analytic) => (
              <div 
                key={analytic.id}
                className="flex justify-between items-center text-xs border-b pb-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {analytic.cache_type}
                  </Badge>
                  <span className="text-muted-foreground">{analytic.operation}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {analytic.response_time_ms && (
                    <span>{analytic.response_time_ms}ms</span>
                  )}
                  <span>{format(new Date(analytic.timestamp), 'HH:mm:ss')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
