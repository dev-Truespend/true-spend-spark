import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  Loader2, 
  RefreshCw, 
  TrendingUp,
  XCircle
} from 'lucide-react';
import { getCacheStats, clearAllCache } from '@/services/huggingface/cache';
import { getHFClient } from '@/services/huggingface/client';

interface CircuitStatus {
  status: string;
  failureCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  availableIn: number | null;
}

interface HFMetric {
  id: string;
  metric_name: string;
  value: number;
  timestamp: string;
  tags?: any;
}

export function HuggingFaceMonitor() {
  const [cacheStats, setCacheStats] = useState({ modelCount: 0, responseCount: 0, totalSize: 0 });
  const [clientMetrics, setClientMetrics] = useState({ requestCount: 0, successRate: 0, avgLatency: 0 });
  const [serverMetrics, setServerMetrics] = useState<HFMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load cache stats
      const stats = await getCacheStats();
      setCacheStats(stats);

      // Load client metrics
      const client = getHFClient();
      const metrics = client.getMetrics();
      setClientMetrics({
        requestCount: metrics.requestCount,
        successRate: metrics.successCount > 0 ? (metrics.successCount / metrics.requestCount) * 100 : 0,
        avgLatency: metrics.avgLatencyMs
      });

      // Load server metrics from last 24h
      const { data: metrics24h } = await supabase
        .from('system_metrics')
        .select('*')
        .in('metric_name', ['hf_ocr_request', 'hf_categorize_request'])
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      setServerMetrics(metrics24h || []);
    } catch (error) {
      console.error('Failed to load HF metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await clearAllCache();
      await loadData();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const ocrMetrics = serverMetrics.filter(m => m.metric_name === 'hf_ocr_request');
  const categorizeMetrics = serverMetrics.filter(m => m.metric_name === 'hf_categorize_request');

  const ocrSuccessRate = ocrMetrics.length > 0
    ? (ocrMetrics.filter(m => m.tags?.success).length / ocrMetrics.length) * 100
    : 0;

  const categorizeSuccessRate = categorizeMetrics.length > 0
    ? (categorizeMetrics.filter(m => m.tags?.success).length / categorizeMetrics.length) * 100
    : 0;

  const avgOcrLatency = ocrMetrics.length > 0
    ? ocrMetrics.reduce((sum, m) => sum + m.value, 0) / ocrMetrics.length
    : 0;

  const avgCategorizeLatency = categorizeMetrics.length > 0
    ? categorizeMetrics.reduce((sum, m) => sum + m.value, 0) / categorizeMetrics.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hugging Face Monitor</h2>
          <p className="text-muted-foreground">Real-time monitoring of HF services</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Server-side Services */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              OCR Service (Server)
            </CardTitle>
            <CardDescription>Receipt text extraction via HF API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Requests</span>
              <Badge variant="secondary">{ocrMetrics.length}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">{ocrSuccessRate.toFixed(1)}%</span>
              </div>
              <Progress value={ocrSuccessRate} className="h-2" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Latency</span>
              <span className="text-sm font-medium">{avgOcrLatency.toFixed(0)}ms</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Categorization Service (Server)
            </CardTitle>
            <CardDescription>Transaction categorization via HF API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24h Requests</span>
              <Badge variant="secondary">{categorizeMetrics.length}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">{categorizeSuccessRate.toFixed(1)}%</span>
              </div>
              <Progress value={categorizeSuccessRate} className="h-2" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Latency</span>
              <span className="text-sm font-medium">{avgCategorizeLatency.toFixed(0)}ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client-side Service */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Client-side Categorization
          </CardTitle>
          <CardDescription>Browser-based transaction categorization with Transformers.js</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Requests</div>
              <div className="text-2xl font-bold">{clientMetrics.requestCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
              <div className="text-2xl font-bold">{clientMetrics.successRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Avg Latency</div>
              <div className="text-2xl font-bold">{clientMetrics.avgLatency.toFixed(0)}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            IndexedDB Cache
          </CardTitle>
          <CardDescription>Local storage for models and responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Cached Models</div>
              <div className="text-2xl font-bold">{cacheStats.modelCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Cached Responses</div>
              <div className="text-2xl font-bold">{cacheStats.responseCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Size</div>
              <div className="text-2xl font-bold">{(cacheStats.totalSize / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          </div>
          <Button 
            onClick={handleClearCache} 
            variant="destructive" 
            size="sm"
            disabled={clearing}
          >
            {clearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Clear All Cache
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Server Activity</CardTitle>
          <CardDescription>Last 10 HF API calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {serverMetrics.slice(0, 10).map((metric, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {metric.tags?.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {metric.metric_name === 'hf_ocr_request' ? 'OCR' : 'Categorization'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(metric.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{metric.value.toFixed(0)}ms</div>
                  {metric.tags?.model && (
                    <div className="text-xs text-muted-foreground">{metric.tags.model}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
