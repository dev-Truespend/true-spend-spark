import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, MapPin, Zap, Users, Target } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface CacheStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number;
  avg_response_time: number;
}

interface GeofenceStats {
  total_events: number;
  unique_users: number;
  avg_accuracy: number;
  false_positives: number;
}

interface AIInsightsStats {
  total_insights: number;
  actioned_insights: number;
  avg_confidence: number;
  top_insight_types: Array<{ type: string; count: number }>;
}

export default function LocationMetrics() {
  // Fetch cache analytics
  const { data: cacheStats, isLoading: cacheLoading } = useQuery({
    queryKey: ['cache-analytics'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('cache_analytics')
        .select('*')
        .gte('timestamp', oneDayAgo);

      if (error) throw error;

      const hits = data?.filter(d => d.operation === 'hit').length || 0;
      const misses = data?.filter(d => d.operation === 'miss').length || 0;
      const total = hits + misses;
      const avgTime = data?.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / (data?.length || 1);

      return {
        total_requests: total,
        cache_hits: hits,
        cache_misses: misses,
        hit_rate: total > 0 ? (hits / total) * 100 : 0,
        avg_response_time: avgTime
      } as CacheStats;
    }
  });

  // Fetch geofence metrics
  const { data: geofenceStats, isLoading: geofenceLoading } = useQuery({
    queryKey: ['geofence-stats'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: events, error } = await supabase
        .from('geofence_events')
        .select('user_id, accuracy_meters')
        .gte('timestamp', oneDayAgo);

      if (error) throw error;

      const uniqueUsers = new Set(events?.map(e => e.user_id)).size;
      const avgAccuracy = events?.reduce((sum, e) => sum + (e.accuracy_meters || 0), 0) / (events?.length || 1);

      return {
        total_events: events?.length || 0,
        unique_users: uniqueUsers,
        avg_accuracy: avgAccuracy,
        false_positives: 0 // Calculated separately if needed
      } as GeofenceStats;
    }
  });

  // Fetch AI insights stats
  const { data: insightsStats, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_insights')
        .select('insight_type, confidence_score, actioned');

      if (error) throw error;

      const actioned = data?.filter(d => d.actioned).length || 0;
      const avgConfidence = data?.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / (data?.length || 1);

      // Count by type
      const typeCounts = data?.reduce((acc, d) => {
        acc[d.insight_type] = (acc[d.insight_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total_insights: data?.length || 0,
        actioned_insights: actioned,
        avg_confidence: avgConfidence * 100,
        top_insight_types: topTypes
      } as AIInsightsStats;
    }
  });

  // Fetch merchant recommendations stats
  const { data: merchantStats, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant-recommendations-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_recommendations')
        .select('viewed, clicked, converted');

      if (error) throw error;

      const total = data?.length || 0;
      const viewed = data?.filter(d => d.viewed).length || 0;
      const clicked = data?.filter(d => d.clicked).length || 0;
      const converted = data?.filter(d => d.converted).length || 0;

      return {
        total,
        viewed,
        clicked,
        converted,
        view_rate: total > 0 ? (viewed / total) * 100 : 0,
        click_rate: viewed > 0 ? (clicked / viewed) * 100 : 0,
        conversion_rate: clicked > 0 ? (converted / clicked) * 100 : 0
      };
    }
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Location Intelligence Metrics</h1>
        <p className="text-muted-foreground">Phase 7 Performance Dashboard - Real-time Analytics</p>
      </div>

      {/* Cache Performance */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Cache Performance (24h)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Requests</CardDescription>
              <CardTitle className="text-3xl">
                {cacheLoading ? <Skeleton className="h-8 w-20" /> : cacheStats?.total_requests || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cache Hit Rate</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {cacheLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    {cacheStats?.hit_rate.toFixed(1) || 0}%
                    <Badge variant={cacheStats && cacheStats.hit_rate >= 85 ? "default" : "destructive"}>
                      {cacheStats && cacheStats.hit_rate >= 85 ? "Good" : "Low"}
                    </Badge>
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cache Hits</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {cacheLoading ? <Skeleton className="h-8 w-20" /> : cacheStats?.cache_hits || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Response Time</CardDescription>
              <CardTitle className="text-3xl">
                {cacheLoading ? <Skeleton className="h-8 w-20" /> : `${cacheStats?.avg_response_time.toFixed(0) || 0}ms`}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Geofence Accuracy */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Geofence Accuracy (24h)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Events</CardDescription>
              <CardTitle className="text-3xl">
                {geofenceLoading ? <Skeleton className="h-8 w-20" /> : geofenceStats?.total_events || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Users</CardDescription>
              <CardTitle className="text-3xl">
                {geofenceLoading ? <Skeleton className="h-8 w-20" /> : geofenceStats?.unique_users || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Accuracy</CardDescription>
              <CardTitle className="text-3xl">
                {geofenceLoading ? <Skeleton className="h-8 w-20" /> : `±${geofenceStats?.avg_accuracy.toFixed(0) || 0}m`}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>False Positives</CardDescription>
              <CardTitle className="text-3xl text-orange-600">
                {geofenceLoading ? <Skeleton className="h-8 w-20" /> : geofenceStats?.false_positives || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* AI Insights Performance */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          AI Insights Performance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Insights Generated</CardDescription>
              <CardTitle className="text-3xl">
                {insightsLoading ? <Skeleton className="h-8 w-20" /> : insightsStats?.total_insights || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>User Action Rate</CardDescription>
              <CardTitle className="text-3xl">
                {insightsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  `${insightsStats && insightsStats.total_insights > 0 
                    ? ((insightsStats.actioned_insights / insightsStats.total_insights) * 100).toFixed(1)
                    : 0}%`
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Confidence Score</CardDescription>
              <CardTitle className="text-3xl">
                {insightsLoading ? <Skeleton className="h-8 w-20" /> : `${insightsStats?.avg_confidence.toFixed(1) || 0}%`}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Top Insight Types */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Top Insight Types</CardTitle>
            <CardDescription>Most frequently generated AI insights</CardDescription>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {insightsStats?.top_insight_types.map(({ type, count }) => (
                  <div key={type} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                    <Badge>{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Merchant Discovery */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Merchant Recommendations
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Recommendations</CardDescription>
              <CardTitle className="text-3xl">
                {merchantLoading ? <Skeleton className="h-8 w-20" /> : merchantStats?.total || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>View Rate</CardDescription>
              <CardTitle className="text-3xl">
                {merchantLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  `${merchantStats?.view_rate.toFixed(1) || 0}%`
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Click-Through Rate</CardDescription>
              <CardTitle className="text-3xl">
                {merchantLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  `${merchantStats?.click_rate.toFixed(1) || 0}%`
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Conversion Rate</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {merchantLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  `${merchantStats?.conversion_rate.toFixed(1) || 0}%`
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Performance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Phase 7 Status
          </CardTitle>
          <CardDescription>Overall system health and performance indicators</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Cache Performance Target (≥85%)</span>
            <Badge variant={cacheStats && cacheStats.hit_rate >= 85 ? "default" : "destructive"}>
              {cacheStats && cacheStats.hit_rate >= 85 ? "✓ Met" : "✗ Below Target"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Response Time Target (≤100ms)</span>
            <Badge variant={cacheStats && cacheStats.avg_response_time <= 100 ? "default" : "secondary"}>
              {cacheStats && cacheStats.avg_response_time <= 100 ? "✓ Met" : "○ Monitoring"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>AI Insights Action Rate Target (≥30%)</span>
            <Badge variant={
              insightsStats && insightsStats.total_insights > 0 &&
              (insightsStats.actioned_insights / insightsStats.total_insights) >= 0.3
                ? "default"
                : "secondary"
            }>
              {insightsStats && insightsStats.total_insights > 0 &&
              (insightsStats.actioned_insights / insightsStats.total_insights) >= 0.3
                ? "✓ Met"
                : "○ Monitoring"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
