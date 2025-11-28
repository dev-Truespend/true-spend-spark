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

    const { item_id, card_id } = await req.json();

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

    // Get plaid item and access token
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', item_id)
      .single();

    if (itemError || !plaidItem) {
      throw new Error('Plaid item not found');
    }

    console.log(`[Plaid] Syncing transactions for item ${item_id}`);

    // Get credit cards for this item
    let cardsQuery = supabase
      .from('credit_cards')
      .select('*')
      .eq('plaid_item_id', item_id)
      .eq('user_id', user.id);

    if (card_id) {
      cardsQuery = cardsQuery.eq('id', card_id);
    }

    const { data: cards, error: cardsError } = await cardsQuery;

    if (cardsError || !cards || cards.length === 0) {
      throw new Error('No credit cards found');
    }

    // Fetch transactions using Plaid Transactions Sync
    const syncResponse = await fetch(`${plaidUrl}/transactions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        access_token: plaidItem.access_token_encrypted,
        count: 100,
      }),
    });

    const syncData = await syncResponse.json();

    if (!syncResponse.ok) {
      console.error('[Plaid] Sync error:', syncData);
      throw new Error(syncData.error_message || 'Failed to sync transactions');
    }

    const { added, modified } = syncData;
    const allTransactions = [...added, ...modified];

    console.log(`[Plaid] Found ${allTransactions.length} transactions`);

    // Map account_id to card_id
    const accountToCardMap = new Map(
      cards.map(card => [card.account_id, card.id])
    );

    // Insert transactions
    const transactionsToInsert = allTransactions
      .filter((tx: any) => accountToCardMap.has(tx.account_id))
      .map((tx: any) => ({
        user_id: user.id,
        credit_card_id: accountToCardMap.get(tx.account_id),
        amount: tx.amount,
        category: tx.category?.[0] || tx.personal_finance_category?.primary || 'other',
        description: tx.name,
        date: tx.date,
        merchant: tx.merchant_name || tx.name,
        pending: tx.pending || false,
        synced: true,
      }));

    if (transactionsToInsert.length > 0) {
      const { error: txError } = await supabase
        .from('transactions')
        .upsert(transactionsToInsert, {
          onConflict: 'user_id,date,amount,description',
          ignoreDuplicates: true,
        });

      if (txError) {
        console.error('[Plaid] Transaction insert error:', txError);
        throw txError;
      }

      console.log(`[Plaid] Inserted ${transactionsToInsert.length} transactions`);
    }

    // Update last sync timestamp
    await supabase
      .from('plaid_items')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', item_id);

    for (const card of cards) {
      await supabase
        .from('credit_cards')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', card.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        synced: transactionsToInsert.length,
        has_more: syncData.has_more,
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
