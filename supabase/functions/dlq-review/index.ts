import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabaseClient
      .rpc('get_user_roles', { _user_id: user.id });

    if (!roles || !roles.includes('admin')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'GET') {
      if (action === 'check') {
        // Check for alerts (high DLQ count)
        const { count, error } = await supabaseClient
          .from('dead_letter_queue')
          .select('*', { count: 'exact', head: true })
          .eq('resolved', false);

        if (error) {
          throw error;
        }

        const alertThreshold = 100;
        const needsAlert = (count || 0) > alertThreshold;

        if (needsAlert) {
          console.warn(`DLQ alert: ${count} unresolved items`);
          
          // Log security event
          await supabaseClient.from('security_logs').insert({
            event_type: 'dlq_alert',
            severity: 'warning',
            details: {
              count,
              threshold: alertThreshold,
              message: 'Dead letter queue exceeds threshold',
            },
          });
        }

        return new Response(
          JSON.stringify({ 
            count, 
            needsAlert, 
            threshold: alertThreshold 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List DLQ items
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const queueType = url.searchParams.get('queue_type');
      const resolved = url.searchParams.get('resolved') === 'true';

      let query = supabaseClient
        .from('dead_letter_queue')
        .select('*')
        .eq('resolved', resolved)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queueType) {
        query = query.eq('original_queue_type', queueType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ items: data, count: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { id, action: postAction } = body;

      if (postAction === 'retry') {
        // Retry a failed message
        const { data: item, error: fetchError } = await supabaseClient
          .from('dead_letter_queue')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError || !item) {
          throw new Error('Item not found');
        }

        // Move back to retry queue
        await supabaseClient.from('retry_queue').insert({
          queue_type: item.original_queue_type,
          payload: item.payload,
          scheduled_for: new Date().toISOString(),
          retry_count: 0,
          max_retries: 3, // Reduced retries for manual retry
          priority: 10, // High priority for manual retries
        });

        // Mark as resolved
        await supabaseClient
          .from('dead_letter_queue')
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
          })
          .eq('id', id);

        return new Response(
          JSON.stringify({ success: true, message: 'Item moved to retry queue' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (postAction === 'resolve') {
        // Mark as resolved without retry
        const { error } = await supabaseClient
          .from('dead_letter_queue')
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
          })
          .eq('id', id);

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Item marked as resolved' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('DLQ review error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
