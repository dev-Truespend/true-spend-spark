import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getExtensionCorsHeaders, handleExtensionCors, logExtensionRequest } from "../_shared/extension-cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleExtensionCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getExtensionCorsHeaders(origin);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Extension Telemetry] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log request for monitoring
    logExtensionRequest(req, user.id);

    // Parse request body
    const { events } = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid events array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Extension Telemetry] Processing ${events.length} events for user ${user.id}`);

    // Insert telemetry events
    const telemetryRecords = events.map((event: any) => ({
      user_id: user.id,
      event_type: event.event,
      properties: event.properties || {},
      extension_version: event.extension_version,
      timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('extension_telemetry')
      .insert(telemetryRecords);

    if (insertError) {
      console.error('[Extension Telemetry] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert telemetry data', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Extension Telemetry] Successfully inserted ${events.length} events`);

    return new Response(
      JSON.stringify({ success: true, count: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Extension Telemetry] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
