import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishEventRequest {
  event_type: string;
  event_payload: Record<string, any>;
  topic: string;
  user_id?: string;
  scheduled_for?: string;
  max_retries?: number;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: PublishEventRequest = await req.json();

    // Validate required fields
    if (!body.event_type || !body.event_payload || !body.topic) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: event_type, event_payload, topic' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate event_type format (should be like 'transaction.created', 'budget.updated')
    if (!body.event_type.includes('.')) {
      return new Response(
        JSON.stringify({ 
          error: 'event_type must be in format: domain.action (e.g., transaction.created)' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create event log entry
    const eventData = {
      event_type: body.event_type,
      event_payload: body.event_payload,
      topic: body.topic,
      user_id: body.user_id || user.id,
      scheduled_for: body.scheduled_for || new Date().toISOString(),
      max_retries: body.max_retries ?? 3,
      status: 'pending',
      retry_count: 0,
      metadata: body.metadata || {},
    };

    console.log('Publishing event:', {
      event_type: eventData.event_type,
      topic: eventData.topic,
      user_id: eventData.user_id,
    });

    const { data: event, error: insertError } = await supabaseClient
      .from('event_log')
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting event:', insertError);
      throw insertError;
    }

    console.log('Event published successfully:', event.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: event.id,
        event_type: event.event_type,
        topic: event.topic,
        scheduled_for: event.scheduled_for,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in publish-event function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to publish event'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
