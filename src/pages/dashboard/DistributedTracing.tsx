// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TraceVisualizer } from '@/components/tracing/TraceVisualizer';
import { TracePerformanceAnalytics } from '@/components/tracing/TracePerformanceAnalytics';
import { Search, Activity, TrendingUp, RefreshCw } from 'lucide-react';

interface Trace {
  trace_id: string;
  operation_name: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  error_message: string | null;
}

export default function DistributedTracing() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTraces();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('traces-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'traces',
        },
        () => {
          fetchTraces();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchTraces = async () => {
    try {
      const { data, error } = await supabase
        .from('traces')
        .select('trace_id, operation_name, status, started_at, duration_ms, error_message')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTraces(data || []);
    } catch (error) {
      console.error('Error fetching traces:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTraces = traces.filter(trace =>
    trace.operation_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trace.trace_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      error: 'destructive',
      in_progress: 'secondary',
      timeout: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Distributed Tracing</h1>
        <p className="text-muted-foreground">
          Monitor and analyze request flows across your application with trace-level visibility
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance Analytics
          </TabsTrigger>
          <TabsTrigger value="traces" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Trace Explorer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <TracePerformanceAnalytics />
        </TabsContent>

        <TabsContent value="traces">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Trace List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Traces</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchTraces}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>{traces.length} traces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search traces..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {filteredTraces.map((trace) => (
                      <div
                        key={trace.trace_id}
                        onClick={() => setSelectedTraceId(trace.trace_id)}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedTraceId === trace.trace_id
                            ? 'bg-accent border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm truncate">
                            {trace.operation_name}
                          </span>
                          {getStatusBadge(trace.status)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="font-mono truncate">{trace.trace_id}</div>
                          <div className="flex justify-between">
                            <span>{new Date(trace.started_at).toLocaleTimeString()}</span>
                            {trace.duration_ms !== null && (
                              <span className="font-medium">{trace.duration_ms}ms</span>
                            )}
                          </div>
                        </div>
                        {trace.error_message && (
                          <div className="mt-2 text-xs text-destructive truncate">
                            {trace.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Trace Details */}
            <div className="lg:col-span-2">
              {selectedTraceId ? (
                <TraceVisualizer traceId={selectedTraceId} />
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a trace to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}