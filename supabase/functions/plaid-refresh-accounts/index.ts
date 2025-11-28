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

    const { item_id } = await req.json();

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

    // Get plaid item
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', item_id)
      .single();

    if (itemError || !plaidItem) {
      throw new Error('Plaid item not found');
    }

    console.log(`[Plaid] Refreshing accounts for item ${item_id}`);

    // Fetch updated account balances
    const accountsResponse = await fetch(`${plaidUrl}/accounts/balance/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({ access_token: plaidItem.access_token_encrypted }),
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok) {
      console.error('[Plaid] Accounts refresh error:', accountsData);
      throw new Error(accountsData.error_message || 'Failed to refresh accounts');
    }

    // Update credit card balances
    const creditAccounts = accountsData.accounts.filter(
      (acc: any) => acc.type === 'credit' || acc.subtype === 'credit card'
    );

    for (const account of creditAccounts) {
      await supabase
        .from('credit_cards')
        .update({
          current_balance: Math.abs(account.balances.current || 0),
          available_credit: account.balances.available || 0,
          credit_limit: account.balances.limit || 0,
          last_sync_at: new Date().toISOString(),
        })
        .eq('account_id', account.account_id)
        .eq('user_id', user.id);
    }

    console.log(`[Plaid] Updated ${creditAccounts.length} credit cards`);

    return new Response(
      JSON.stringify({ 
        success: true,
        updated: creditAccounts.length,
      }),
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
