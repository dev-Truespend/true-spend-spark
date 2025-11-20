import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Database, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ReplicaMonitoring() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['replica-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('replica_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Calculate aggregated stats
  const stats = metrics?.reduce((acc, m) => {
    if (m.connection_type === 'replica') {
      acc.replicaQueries++;
      acc.totalReplicaLatency += m.latency_ms || 0;
    } else if (m.connection_type === 'primary') {
      acc.primaryQueries++;
      acc.totalPrimaryLatency += m.latency_ms || 0;
    }
    if (m.replica_lag_ms) {
      acc.maxLag = Math.max(acc.maxLag, m.replica_lag_ms);
    }
    return acc;
  }, {
    replicaQueries: 0,
    primaryQueries: 0,
    totalReplicaLatency: 0,
    totalPrimaryLatency: 0,
    maxLag: 0,
  });

  const avgReplicaLatency = stats ? Math.round(stats.totalReplicaLatency / stats.replicaQueries) : 0;
  const avgPrimaryLatency = stats ? Math.round(stats.totalPrimaryLatency / stats.primaryQueries) : 0;
  const replicaHealthy = metrics?.[0]?.replica_healthy ?? true;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Read Replica Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time monitoring of database read replica performance and health
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replica Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={replicaHealthy ? "default" : "destructive"}>
                {replicaHealthy ? "Healthy" : "Unhealthy"}
              </Badge>
              {!replicaHealthy && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replica Queries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.replicaQueries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {avgReplicaLatency}ms avg latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Queries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.primaryQueries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {avgPrimaryLatency}ms avg latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Replica Lag</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.maxLag || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              {stats?.maxLag && stats.maxLag < 1000 ? "Excellent" : "Monitor"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query Distribution</CardTitle>
          <CardDescription>
            Read/write query routing performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading metrics...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Read Replica</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.replicaQueries || 0} queries ({avgReplicaLatency}ms avg)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ 
                    width: `${((stats?.replicaQueries || 0) / ((stats?.replicaQueries || 0) + (stats?.primaryQueries || 1))) * 100}%` 
                  }}
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-medium">Primary</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.primaryQueries || 0} queries ({avgPrimaryLatency}ms avg)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-secondary h-2 rounded-full transition-all"
                  style={{ 
                    width: `${((stats?.primaryQueries || 0) / ((stats?.replicaQueries || 0) + (stats?.primaryQueries || 1))) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Metrics</CardTitle>
          <CardDescription>Last 100 database operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics?.map((metric) => (
              <div 
                key={metric.id} 
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={metric.connection_type === 'replica' ? 'default' : 'secondary'}>
                    {metric.connection_type}
                  </Badge>
                  <span className="text-sm">{metric.query_type}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {metric.latency_ms}ms
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
