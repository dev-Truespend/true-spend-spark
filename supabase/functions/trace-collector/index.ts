import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id',
};

interface TraceData {
  trace_id: string;
  operation_name: string;
  user_id?: string;
  status?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  metadata?: any;
  tags?: any;
}

interface SpanData {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation_name: string;
  service_name: string;
  span_type: string;
  status?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  attributes?: any;
  events?: any[];
}

interface ErrorData {
  trace_id: string;
  span_id?: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  metadata?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, data } = await req.json();

    console.log(`[trace-collector] Received ${type} request`);

    if (type === 'trace') {
      const traceData: TraceData = data;
      
      // Insert or update trace
      const { error: traceError } = await supabase
        .from('traces')
        .upsert({
          trace_id: traceData.trace_id,
          operation_name: traceData.operation_name,
          user_id: traceData.user_id,
          status: traceData.status || 'in_progress',
          started_at: traceData.started_at,
          completed_at: traceData.completed_at,
          duration_ms: traceData.duration_ms,
          error_message: traceData.error_message,
          metadata: traceData.metadata || {},
          tags: traceData.tags || {},
        }, {
          onConflict: 'trace_id',
        });

      if (traceError) {
        console.error('[trace-collector] Error inserting trace:', traceError);
        throw traceError;
      }

      return new Response(
        JSON.stringify({ success: true, trace_id: traceData.trace_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'span') {
      const spanData: SpanData = data;

      // Insert or update span
      const { error: spanError } = await supabase
        .from('trace_spans')
        .upsert({
          trace_id: spanData.trace_id,
          span_id: spanData.span_id,
          parent_span_id: spanData.parent_span_id,
          operation_name: spanData.operation_name,
          service_name: spanData.service_name,
          span_type: spanData.span_type,
          status: spanData.status || 'in_progress',
          started_at: spanData.started_at,
          completed_at: spanData.completed_at,
          duration_ms: spanData.duration_ms,
          error_message: spanData.error_message,
          attributes: spanData.attributes || {},
          events: spanData.events || [],
        }, {
          onConflict: 'span_id',
        });

      if (spanError) {
        console.error('[trace-collector] Error inserting span:', spanError);
        throw spanError;
      }

      return new Response(
        JSON.stringify({ success: true, span_id: spanData.span_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'error') {
      const errorData: ErrorData = data;

      // Insert error
      const { error: insertError } = await supabase
        .from('trace_errors')
        .insert({
          trace_id: errorData.trace_id,
          span_id: errorData.span_id,
          error_type: errorData.error_type,
          error_message: errorData.error_message,
          stack_trace: errorData.stack_trace,
          metadata: errorData.metadata || {},
        });

      if (insertError) {
        console.error('[trace-collector] Error inserting error:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'batch') {
      // Handle batch inserts for performance
      const { traces = [], spans = [], errors = [] } = data;

      if (traces.length > 0) {
        const { error: traceError } = await supabase
          .from('traces')
          .upsert(traces, { onConflict: 'trace_id' });
        
        if (traceError) {
          console.error('[trace-collector] Error batch inserting traces:', traceError);
        }
      }

      if (spans.length > 0) {
        const { error: spanError } = await supabase
          .from('trace_spans')
          .upsert(spans, { onConflict: 'span_id' });
        
        if (spanError) {
          console.error('[trace-collector] Error batch inserting spans:', spanError);
        }
      }

      if (errors.length > 0) {
        const { error: errorError } = await supabase
          .from('trace_errors')
          .insert(errors);
        
        if (errorError) {
          console.error('[trace-collector] Error batch inserting errors:', errorError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          inserted: { 
            traces: traces.length, 
            spans: spans.length, 
            errors: errors.length 
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type. Must be trace, span, error, or batch' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[trace-collector] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});