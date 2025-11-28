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

    const { public_token, metadata } = await req.json();

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

    console.log(`[Plaid] Exchanging public token for user ${user.id}`);

    // Exchange public token for access token
    const exchangeResponse = await fetch(`${plaidUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({ public_token }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('[Plaid] Exchange error:', exchangeData);
      throw new Error(exchangeData.error_message || 'Failed to exchange token');
    }

    const { access_token, item_id } = exchangeData;

    // Store plaid item
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .insert({
        user_id: user.id,
        access_token_encrypted: access_token, // In production, use vault.create_secret
        item_id,
        institution_id: metadata.institution?.institution_id,
        institution_name: metadata.institution?.name,
        status: 'active',
        last_sync_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (itemError) {
      console.error('[Plaid] Item insert error:', itemError);
      throw itemError;
    }

    console.log(`[Plaid] Item stored: ${item_id}`);

    // Fetch accounts
    const accountsResponse = await fetch(`${plaidUrl}/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({ access_token }),
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok) {
      console.error('[Plaid] Accounts error:', accountsData);
      throw new Error(accountsData.error_message || 'Failed to fetch accounts');
    }

    // Filter credit card accounts and insert them
    const creditAccounts = accountsData.accounts.filter(
      (acc: any) => acc.type === 'credit' || acc.subtype === 'credit card'
    );

    const cardsToInsert = creditAccounts.map((account: any) => ({
      user_id: user.id,
      plaid_item_id: plaidItem.id,
      account_id: account.account_id,
      account_name: account.official_name || account.name,
      account_mask: account.mask,
      card_brand: account.subtype || 'credit card',
      current_balance: Math.abs(account.balances.current || 0),
      available_credit: account.balances.available || 0,
      credit_limit: account.balances.limit || 0,
      is_primary: false,
      is_active: true,
      last_sync_at: new Date().toISOString(),
    }));

    const { data: newCards, error: cardsError } = await supabase
      .from('credit_cards')
      .insert(cardsToInsert)
      .select();

    if (cardsError) {
      console.error('[Plaid] Cards insert error:', cardsError);
      throw cardsError;
    }

    console.log(`[Plaid] Added ${newCards.length} credit cards`);

    // Trigger initial transaction sync
    try {
      await supabase.functions.invoke('plaid-sync-transactions', {
        body: { item_id: plaidItem.id },
      });
    } catch (syncError) {
      console.error('[Plaid] Initial sync error:', syncError);
      // Don't fail the whole operation if sync fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cards: newCards,
        institution: metadata.institution?.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Plaid] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
