import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TraceContext {
  traceId: string;
  parentSpanId?: string;
}

export interface SpanOptions {
  operation: string;
  service: string;
  type: 'http' | 'database' | 'cache' | 'function' | 'external_api' | 'ai_model';
  attributes?: Record<string, any>;
  parentSpanId?: string;
}

interface ActiveSpan {
  spanId: string;
  startTime: number;
  operation: string;
  service: string;
  type: string;
  attributes: Record<string, any>;
  parentSpanId?: string;
}

export function useTracing() {
  const { user } = useAuth();
  const activeSpans = useRef<Map<string, ActiveSpan>>(new Map());
  const batchQueue = useRef<any[]>([]);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate unique IDs
  const generateId = useCallback((): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Batch send traces/spans for performance
  const flushBatch = useCallback(async () => {
    if (batchQueue.current.length === 0) return;

    const batch = [...batchQueue.current];
    batchQueue.current = [];

    try {
      await supabase.functions.invoke('trace-collector', {
        body: {
          type: 'batch',
          data: {
            traces: batch.filter(item => item.type === 'trace').map(item => item.data),
            spans: batch.filter(item => item.type === 'span').map(item => item.data),
            errors: batch.filter(item => item.type === 'error').map(item => item.data),
          },
        },
      });
    } catch (error) {
      console.error('[useTracing] Error flushing batch:', error);
    }
  }, []);

  const scheduleBatchFlush = useCallback(() => {
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    batchTimer.current = setTimeout(flushBatch, 1000); // Flush every 1 second
  }, [flushBatch]);

  // Start a new trace
  const startTrace = useCallback((operation: string, metadata?: Record<string, any>): TraceContext => {
    const traceId = `trace_${generateId()}`;
    const startTime = new Date().toISOString();

    batchQueue.current.push({
      type: 'trace',
      data: {
        trace_id: traceId,
        operation_name: operation,
        user_id: user?.id,
        status: 'in_progress',
        started_at: startTime,
        metadata: metadata || {},
        tags: {},
      },
    });

    scheduleBatchFlush();

    return { traceId };
  }, [generateId, user, scheduleBatchFlush]);

  // Complete a trace
  const completeTrace = useCallback((
    traceId: string,
    status: 'completed' | 'error' | 'timeout' = 'completed',
    errorMessage?: string
  ) => {
    const completedAt = new Date().toISOString();

    batchQueue.current.push({
      type: 'trace',
      data: {
        trace_id: traceId,
        status,
        completed_at: completedAt,
        error_message: errorMessage,
      },
    });

    scheduleBatchFlush();
  }, [scheduleBatchFlush]);

  // Start a span
  const startSpan = useCallback((traceId: string, options: SpanOptions): string => {
    const spanId = `span_${generateId()}`;
    const startTime = Date.now();

    activeSpans.current.set(spanId, {
      spanId,
      startTime,
      operation: options.operation,
      service: options.service,
      type: options.type,
      attributes: options.attributes || {},
      parentSpanId: options.parentSpanId,
    });

    batchQueue.current.push({
      type: 'span',
      data: {
        trace_id: traceId,
        span_id: spanId,
        parent_span_id: options.parentSpanId,
        operation_name: options.operation,
        service_name: options.service,
        span_type: options.type,
        status: 'in_progress',
        started_at: new Date(startTime).toISOString(),
        attributes: options.attributes || {},
        events: [],
      },
    });

    scheduleBatchFlush();

    return spanId;
  }, [generateId, scheduleBatchFlush]);

  // Complete a span
  const completeSpan = useCallback((
    traceId: string,
    spanId: string,
    status: 'completed' | 'error' = 'completed',
    errorMessage?: string
  ) => {
    const span = activeSpans.current.get(spanId);
    if (!span) {
      console.warn('[useTracing] Span not found:', spanId);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - span.startTime;

    batchQueue.current.push({
      type: 'span',
      data: {
        trace_id: traceId,
        span_id: spanId,
        status,
        completed_at: new Date(endTime).toISOString(),
        duration_ms: duration,
        error_message: errorMessage,
      },
    });

    activeSpans.current.delete(spanId);
    scheduleBatchFlush();
  }, [scheduleBatchFlush]);

  // Record an error
  const recordError = useCallback((
    traceId: string,
    error: Error,
    spanId?: string,
    metadata?: Record<string, any>
  ) => {
    batchQueue.current.push({
      type: 'error',
      data: {
        trace_id: traceId,
        span_id: spanId,
        error_type: error.name || 'Error',
        error_message: error.message,
        stack_trace: error.stack,
        metadata: metadata || {},
      },
    });

    scheduleBatchFlush();
  }, [scheduleBatchFlush]);

  // Wrap an async function with tracing
  const traceAsync = useCallback(async <T>(
    traceContext: TraceContext,
    options: SpanOptions,
    fn: () => Promise<T>
  ): Promise<T> => {
    const spanId = startSpan(traceContext.traceId, {
      ...options,
      parentSpanId: traceContext.parentSpanId,
    });

    try {
      const result = await fn();
      completeSpan(traceContext.traceId, spanId, 'completed');
      return result;
    } catch (error) {
      completeSpan(traceContext.traceId, spanId, 'error', error instanceof Error ? error.message : 'Unknown error');
      recordError(traceContext.traceId, error instanceof Error ? error : new Error(String(error)), spanId);
      throw error;
    }
  }, [startSpan, completeSpan, recordError]);

  return {
    startTrace,
    completeTrace,
    startSpan,
    completeSpan,
    recordError,
    traceAsync,
    flushBatch,
  };
}