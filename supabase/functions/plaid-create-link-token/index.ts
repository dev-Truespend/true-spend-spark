import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENVIRONMENT = Deno.env.get('PLAID_ENVIRONMENT') || 'sandbox';

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const plaidUrl = PLAID_ENVIRONMENT === 'production' 
      ? 'https://production.plaid.com'
      : PLAID_ENVIRONMENT === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

    console.log(`[Plaid] Creating link token for user ${user.id}`);

    const response = await fetch(`${plaidUrl}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        user: {
          client_user_id: user.id,
        },
        client_name: 'TrueSpend',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-plaid`,
        account_filters: {
          credit: {
            account_subtypes: ['credit card'],
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Plaid] Link token error:', data);
      throw new Error(data.error_message || 'Failed to create link token');
    }

    console.log('[Plaid] Link token created successfully');

    return new Response(
      JSON.stringify({ link_token: data.link_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Plaid] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
