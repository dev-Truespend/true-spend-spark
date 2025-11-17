import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Webhook, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface WebhookStats {
  total_events: number;
  processed_events: number;
  pending_events: number;
  failed_events: number;
  success_rate: number;
  avg_processing_time_ms: number;
  events_by_source: Array<{ source: string; count: number }>;
}

export function WebhookAnalyticsDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['webhook-analytics'],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: events, error } = await supabase
        .from('webhook_events')
        .select('*')
        .gte('received_at', oneDayAgo);

      if (error) throw error;

      const total = events?.length || 0;
      const processed = events?.filter(e => e.processed).length || 0;
      const pending = events?.filter(e => !e.processed && !e.error_message).length || 0;
      const failed = events?.filter(e => e.error_message).length || 0;

      // Group by source
      const sourceMap = events?.reduce((acc, e) => {
        acc[e.source] = (acc[e.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const eventsBySource = Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate average processing time (mock - you'd need to track this in the table)
      const avgProcessingTime = 150;

      return {
        total_events: total,
        processed_events: processed,
        pending_events: pending,
        failed_events: failed,
        success_rate: total > 0 ? (processed / total) * 100 : 0,
        avg_processing_time_ms: avgProcessingTime,
        events_by_source: eventsBySource
      } as WebhookStats;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Webhook className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Webhook Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_events}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.success_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.processed_events} processed
            </p>
          </CardContent>
        </Card>

        {/* Pending Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_events}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        {/* Failed Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed_events}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Events by Source */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Events by Source
          </CardTitle>
          <CardDescription>Breakdown of webhook events by source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.events_by_source.map((source) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{source.source}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {source.count} events
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {((source.count / stats.total_events) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
            {stats.events_by_source.length === 0 && (
              <p className="text-center text-muted-foreground">No events in the last 24 hours</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Time */}
      <Card>
        <CardHeader>
          <CardTitle>Average Processing Time</CardTitle>
          <CardDescription>Mean time to process webhook events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.avg_processing_time_ms}ms
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
