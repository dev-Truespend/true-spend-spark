// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Activity, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Database,
  Zap,
  Globe,
  Brain
} from 'lucide-react';

interface Trace {
  trace_id: string;
  operation_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: any;
}

interface Span {
  span_id: string;
  parent_span_id: string | null;
  operation_name: string;
  service_name: string;
  span_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  attributes: any;
}

interface SpanWithChildren extends Span {
  children: SpanWithChildren[];
}

export function TraceVisualizer({ traceId }: { traceId: string }) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTraceDetails();
  }, [traceId]);

  const fetchTraceDetails = async () => {
    try {
      // Fetch trace
      const { data: traceData, error: traceError } = await supabase
        .from('traces')
        .select('*')
        .eq('trace_id', traceId)
        .single();

      if (traceError) throw traceError;
      setTrace(traceData);

      // Fetch spans
      const { data: spansData, error: spansError } = await supabase
        .from('trace_spans')
        .select('*')
        .eq('trace_id', traceId)
        .order('started_at');

      if (spansError) throw spansError;
      setSpans(spansData || []);
    } catch (error) {
      console.error('Error fetching trace details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpan = (spanId: string) => {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId);
    } else {
      newExpanded.add(spanId);
    }
    setExpandedSpans(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSpanTypeIcon = (type: string) => {
    switch (type) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'cache':
        return <Zap className="h-4 w-4" />;
      case 'external_api':
        return <Globe className="h-4 w-4" />;
      case 'ai_model':
        return <Brain className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const buildSpanTree = (spans: Span[]): SpanWithChildren[] => {
    const spanMap = new Map<string, SpanWithChildren>();
    const rootSpans: SpanWithChildren[] = [];

    // Initialize span map
    spans.forEach(span => {
      spanMap.set(span.span_id, { ...span, children: [] });
    });

    // Build tree structure
    spans.forEach(span => {
      const spanWithChildren = spanMap.get(span.span_id)!;
      if (span.parent_span_id) {
        const parent = spanMap.get(span.parent_span_id);
        if (parent) {
          parent.children.push(spanWithChildren);
        } else {
          rootSpans.push(spanWithChildren);
        }
      } else {
        rootSpans.push(spanWithChildren);
      }
    });

    return rootSpans;
  };

  const renderSpan = (span: SpanWithChildren, depth: number = 0): JSX.Element => {
    const isExpanded = expandedSpans.has(span.span_id);
    const hasChildren = span.children.length > 0;

    return (
      <div key={span.span_id} style={{ marginLeft: `${depth * 24}px` }} className="border-l-2 border-border">
        <Collapsible open={isExpanded} onOpenChange={() => toggleSpan(span.span_id)}>
          <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
            {hasChildren && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
            )}
            {!hasChildren && <div className="w-6" />}
            
            {getStatusIcon(span.status)}
            {getSpanTypeIcon(span.span_type)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{span.operation_name}</span>
                <Badge variant="outline" className="text-xs">{span.service_name}</Badge>
                <Badge variant="secondary" className="text-xs">{span.span_type}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {span.duration_ms !== null && (
                  <span className="mr-3">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {span.duration_ms}ms
                  </span>
                )}
                {new Date(span.started_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          {hasChildren && (
            <CollapsibleContent>
              <div className="pl-4">
                {span.children.map(child => renderSpan(child, depth + 1))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading trace details...
        </CardContent>
      </Card>
    );
  }

  if (!trace) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Trace not found
        </CardContent>
      </Card>
    );
  }

  const spanTree = buildSpanTree(spans);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(trace.status)}
              <div>
                <CardTitle>{trace.operation_name}</CardTitle>
                <CardDescription className="flex gap-2 mt-1">
                  <Badge variant="outline">{trace.trace_id}</Badge>
                  <Badge variant={trace.status === 'completed' ? 'default' : trace.status === 'error' ? 'destructive' : 'secondary'}>
                    {trace.status}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              {trace.duration_ms !== null && (
                <div className="text-2xl font-bold">{trace.duration_ms}ms</div>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(trace.started_at).toLocaleString()}
              </div>
            </div>
          </div>
        </CardHeader>
        {trace.error_message && (
          <CardContent>
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {trace.error_message}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trace Timeline</CardTitle>
          <CardDescription>{spans.length} spans</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {spanTree.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No spans recorded for this trace
              </div>
            ) : (
              <div className="space-y-1">
                {spanTree.map(span => renderSpan(span))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}