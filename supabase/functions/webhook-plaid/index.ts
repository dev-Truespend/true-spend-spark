import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, plaid-verification',
};

function verifyPlaidWebhook(body: string, signedJwt: string | null): boolean {
  // In production, verify using Plaid's webhook verification
  // For now, we check the webhook secret exists
  const webhookSecret = Deno.env.get('PLAID_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.warn('[Plaid Webhook] No webhook secret configured, skipping verification');
    return true;
  }
  
  // Plaid sends a signed JWT in the Plaid-Verification header
  // Full verification requires fetching Plaid's JWK and verifying the JWT
  // For production, implement full JWT verification
  if (!signedJwt) {
    console.error('[Plaid Webhook] Missing Plaid-Verification header');
    return false;
  }
  
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const plaidVerification = req.headers.get('Plaid-Verification');
    
    if (!verifyPlaidWebhook(body, plaidVerification)) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(body);
    const { webhook_type, webhook_code, item_id, error } = payload;

    console.log(`[Plaid Webhook] Received: ${webhook_type}.${webhook_code} for item ${item_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the plaid item by plaid's item_id
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('item_id', item_id)
      .single();

    if (itemError || !plaidItem) {
      console.error(`[Plaid Webhook] Item not found for item_id: ${item_id}`);
      return new Response(
        JSON.stringify({ received: true, warning: 'Item not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (webhook_type) {
      case 'TRANSACTIONS': {
        await handleTransactionsWebhook(supabase, plaidItem, webhook_code, payload);
        break;
      }
      case 'ITEM': {
        await handleItemWebhook(supabase, plaidItem, webhook_code, error);
        break;
      }
      case 'AUTH': {
        console.log(`[Plaid Webhook] AUTH event: ${webhook_code}`);
        break;
      }
      default: {
        console.log(`[Plaid Webhook] Unhandled webhook type: ${webhook_type}`);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Plaid Webhook] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleTransactionsWebhook(
  supabase: any,
  plaidItem: any,
  webhookCode: string,
  payload: any
) {
  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
  const PLAID_ENVIRONMENT = Deno.env.get('PLAID_ENVIRONMENT') || 'sandbox';

  const plaidUrl = PLAID_ENVIRONMENT === 'production'
    ? 'https://production.plaid.com'
    : PLAID_ENVIRONMENT === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com';

  switch (webhookCode) {
    case 'SYNC_UPDATES_AVAILABLE': {
      console.log(`[Plaid Webhook] Sync updates available for item ${plaidItem.id}`);
      
      // Trigger incremental sync
      let hasMore = true;
      let cursor = plaidItem.sync_cursor || '';
      let totalSynced = 0;

      while (hasMore) {
        const syncResponse = await fetch(`${plaidUrl}/transactions/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
            'PLAID-SECRET': PLAID_SECRET!,
          },
          body: JSON.stringify({
            access_token: plaidItem.access_token_encrypted,
            cursor: cursor || undefined,
            count: 500,
          }),
        });

        const syncData = await syncResponse.json();
        if (!syncResponse.ok) {
          console.error('[Plaid Webhook] Sync error:', syncData);
          break;
        }

        const { added, modified, removed, next_cursor, has_more } = syncData;

        // Get credit cards for this item
        const { data: cards } = await supabase
          .from('credit_cards')
          .select('id, account_id')
          .eq('plaid_item_id', plaidItem.id);

        const accountToCardMap = new Map(
          (cards || []).map((card: any) => [card.account_id, card.id])
        );

        // Insert added/modified transactions
        const allTransactions = [...(added || []), ...(modified || [])];
        const transactionsToInsert = allTransactions
          .filter((tx: any) => accountToCardMap.has(tx.account_id))
          .map((tx: any) => ({
            user_id: plaidItem.user_id,
            credit_card_id: accountToCardMap.get(tx.account_id),
            amount: tx.amount,
            category: tx.category?.[0] || tx.personal_finance_category?.primary || 'other',
            description: tx.name,
            timestamp: tx.date,
            synced: true,
          }));

        if (transactionsToInsert.length > 0) {
          const { error: txError } = await supabase
            .from('transactions')
            .upsert(transactionsToInsert, {
              onConflict: 'user_id,timestamp,amount,description',
              ignoreDuplicates: true,
            });

          if (txError) {
            console.error('[Plaid Webhook] Transaction insert error:', txError);
          } else {
            totalSynced += transactionsToInsert.length;
          }
        }

        // Handle removed transactions
        if (removed && removed.length > 0) {
          console.log(`[Plaid Webhook] ${removed.length} transactions removed`);
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Update cursor
      await supabase
        .from('plaid_items')
        .update({ 
          sync_cursor: cursor, 
          last_sync_at: new Date().toISOString(),
          error_message: null,
          error_code: null,
        })
        .eq('id', plaidItem.id);

      console.log(`[Plaid Webhook] Synced ${totalSynced} transactions`);
      break;
    }
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE': {
      console.log(`[Plaid Webhook] ${webhookCode} for item ${plaidItem.id}`);
      break;
    }
    default: {
      console.log(`[Plaid Webhook] Unhandled transaction code: ${webhookCode}`);
    }
  }
}

async function handleItemWebhook(
  supabase: any,
  plaidItem: any,
  webhookCode: string,
  error: any
) {
  switch (webhookCode) {
    case 'ERROR': {
      const errorCode = error?.error_code || 'UNKNOWN';
      const errorMessage = error?.error_message || 'Unknown error';
      console.error(`[Plaid Webhook] Item error: ${errorCode} - ${errorMessage}`);

      await supabase
        .from('plaid_items')
        .update({
          status: errorCode === 'ITEM_LOGIN_REQUIRED' ? 'login_required' : 'error',
          error_code: errorCode,
          error_message: errorMessage,
        })
        .eq('id', plaidItem.id);
      break;
    }
    case 'PENDING_EXPIRATION': {
      console.warn(`[Plaid Webhook] Item ${plaidItem.id} consent is expiring soon`);
      await supabase
        .from('plaid_items')
        .update({
          status: 'pending_expiration',
          error_message: 'Access consent is expiring. Please re-link your account.',
        })
        .eq('id', plaidItem.id);
      break;
    }
    case 'USER_PERMISSION_REVOKED': {
      console.warn(`[Plaid Webhook] User revoked permission for item ${plaidItem.id}`);
      await supabase
        .from('plaid_items')
        .update({
          status: 'revoked',
          error_message: 'User permission was revoked.',
        })
        .eq('id', plaidItem.id);
      break;
    }
    case 'WEBHOOK_UPDATE_ACKNOWLEDGED': {
      console.log(`[Plaid Webhook] Webhook URL update acknowledged for item ${plaidItem.id}`);
      break;
    }
    default: {
      console.log(`[Plaid Webhook] Unhandled item code: ${webhookCode}`);
    }
  }
}
