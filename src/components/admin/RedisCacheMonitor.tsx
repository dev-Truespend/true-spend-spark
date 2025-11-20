import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { cacheService } from "@/services/cacheService";
import { Activity, Database, HardDrive, Zap } from "lucide-react";

export function RedisCacheMonitor() {
  const [stats, setStats] = useState({
    hitRate: { redis: 0, indexeddb: 0, miss: 0 },
    latency: { redis: 0, indexeddb: 0 },
    totalRequests: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      const hitRate = cacheService.getCacheHitRate();
      const latency = cacheService.getAverageLatency();
      const allStats = cacheService.getStats();

      setStats({
        hitRate,
        latency,
        totalRequests: allStats.length,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalHitRate = stats.hitRate.redis + stats.hitRate.indexeddb;
  const avgLatency = (stats.latency.redis + stats.latency.indexeddb) / 2;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHitRate.toFixed(1)}%</div>
            <Progress value={totalHitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Redis: {stats.hitRate.redis.toFixed(1)}% | IDB: {stats.hitRate.indexeddb.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLatency.toFixed(1)}ms</div>
            <p className="text-xs text-muted-foreground mt-2">
              Redis: {stats.latency.redis.toFixed(1)}ms | IDB: {stats.latency.indexeddb.toFixed(1)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 1000 operations tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Layers</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">L1 Redis</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">L2 IndexedDB</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">L3 Supabase</span>
                <Badge variant="outline">Fallback</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cache Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Redis (L1)</span>
                <span className="text-sm text-muted-foreground">
                  {stats.hitRate.redis.toFixed(1)}% hit rate
                </span>
              </div>
              <Progress value={stats.hitRate.redis} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">IndexedDB (L2)</span>
                <span className="text-sm text-muted-foreground">
                  {stats.hitRate.indexeddb.toFixed(1)}% hit rate
                </span>
              </div>
              <Progress value={stats.hitRate.indexeddb} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Cache Miss (L3)</span>
                <span className="text-sm text-muted-foreground">
                  {stats.hitRate.miss.toFixed(1)}% miss rate
                </span>
              </div>
              <Progress value={stats.hitRate.miss} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
