import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse CSP violation report
    const report = await req.json();
    const cspReport = report['csp-report'];

    if (!cspReport) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSP report format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('CSP Violation detected:', {
      documentUri: cspReport['document-uri'],
      violatedDirective: cspReport['violated-directive'],
      blockedUri: cspReport['blocked-uri'],
    });

    // Store violation in database
    const { error: insertError } = await supabase
      .from('csp_violations')
      .insert({
        document_uri: cspReport['document-uri'],
        violated_directive: cspReport['violated-directive'],
        blocked_uri: cspReport['blocked-uri'],
        source_file: cspReport['source-file'],
        line_number: cspReport['line-number'],
        column_number: cspReport['column-number'],
        user_agent: req.headers.get('user-agent'),
      });

    if (insertError) {
      console.error('Error storing CSP violation:', insertError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 204,
        headers: corsHeaders,
      }
    );

  } catch (error) {
    console.error('Error in csp-reporter function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
