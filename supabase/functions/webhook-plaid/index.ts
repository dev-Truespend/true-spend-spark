import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, plaid-verification',
};

// ── JWT / JWK verification ─────────────────────────────────────────────────

interface PlaidJwkKey {
  alg: string;
  created_at: number;
  expired_at: number | null;
  key_id: string;
  kty: string;
  crv: string;
  x: string;
  y: string;
}

// Simple base64url → Uint8Array
function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - (str.length % 4)) % 4,
    '='
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyPlaidJwt(
  jwt: string,
  body: string,
  clientId: string,
  secret: string,
  plaidUrl: string
): Promise<boolean> {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;

    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    const { kid, alg } = header;

    if (alg !== 'ES256') {
      console.error('[Plaid] Unexpected JWT algorithm:', alg);
      return false;
    }

    // Fetch the JWK from Plaid
    const jwkRes = await fetch(`${plaidUrl}/webhook_verification_key/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, key_id: kid }),
    });

    if (!jwkRes.ok) {
      console.error('[Plaid] Failed to fetch JWK:', await jwkRes.text());
      return false;
    }

    const { key }: { key: PlaidJwkKey } = await jwkRes.json();

    // Reject expired keys
    if (key.expired_at !== null && key.expired_at * 1000 < Date.now()) {
      console.error('[Plaid] JWK has expired');
      return false;
    }

    // Import the EC public key
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: key.kty, crv: key.crv, x: key.x, y: key.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Verify signature over header.payload
    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature    = base64UrlDecode(parts[2]);

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      signature,
      signingInput
    );

    if (!valid) {
      console.error('[Plaid] JWT signature invalid');
      return false;
    }

    // Verify payload claims
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

    // iat must be within 5 minutes of now
    const ageSecs = (Date.now() / 1000) - payload.iat;
    if (ageSecs > 300) {
      console.error('[Plaid] JWT too old (iat):', ageSecs, 'seconds');
      return false;
    }

    // request_body_sha256 must match SHA-256 of the raw request body
    const bodyBytes  = new TextEncoder().encode(body);
    const bodyDigest = await crypto.subtle.digest('SHA-256', bodyBytes);
    const bodyHex    = Array.from(new Uint8Array(bodyDigest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (payload.request_body_sha256 !== bodyHex) {
      console.error('[Plaid] Body hash mismatch');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Plaid] JWT verification error:', err);
    return false;
  }
}

// ── Main handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const PLAID_CLIENT_ID   = Deno.env.get('PLAID_CLIENT_ID') ?? '';
  const PLAID_SECRET      = Deno.env.get('PLAID_SECRET') ?? '';
  const PLAID_ENVIRONMENT = Deno.env.get('PLAID_ENVIRONMENT') || 'sandbox';

  const plaidUrl = PLAID_ENVIRONMENT === 'production'
    ? 'https://production.plaid.com'
    : PLAID_ENVIRONMENT === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com';

  try {
    const body              = await req.text();
    const plaidVerification = req.headers.get('Plaid-Verification');

    if (!plaidVerification) {
      console.error('[Plaid Webhook] Missing Plaid-Verification header');
      return new Response(
        JSON.stringify({ error: 'Missing Plaid-Verification header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In sandbox the header is a stub — skip full crypto verification
    const isSandbox = PLAID_ENVIRONMENT === 'sandbox';
    if (!isSandbox) {
      const valid = await verifyPlaidJwt(plaidVerification, body, PLAID_CLIENT_ID, PLAID_SECRET, plaidUrl);
      if (!valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = JSON.parse(body);
    const { webhook_type, webhook_code, item_id, error } = payload;

    console.log(`[Plaid Webhook] ${webhook_type}.${webhook_code} — item ${item_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('item_id', item_id)
      .single();

    if (itemError || !plaidItem) {
      console.warn(`[Plaid Webhook] Item not found: ${item_id}`);
      return new Response(
        JSON.stringify({ received: true, warning: 'Item not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(supabase, plaidItem, webhook_code, payload, plaidUrl, PLAID_CLIENT_ID, PLAID_SECRET);
        break;
      case 'ITEM':
        await handleItemWebhook(supabase, plaidItem, webhook_code, error);
        break;
      case 'AUTH':
        console.log(`[Plaid Webhook] AUTH.${webhook_code}`);
        break;
      default:
        console.log(`[Plaid Webhook] Unhandled type: ${webhook_type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Plaid Webhook] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Transactions webhook ──────────────────────────────────────────────────

async function handleTransactionsWebhook(
  supabase: ReturnType<typeof createClient>,
  plaidItem: Record<string, unknown>,
  webhookCode: string,
  payload: Record<string, unknown>,
  plaidUrl: string,
  clientId: string,
  secret: string
) {
  switch (webhookCode) {
    case 'SYNC_UPDATES_AVAILABLE': {
      let cursor    = (plaidItem.sync_cursor as string) || '';
      let hasMore   = true;
      let synced    = 0;
      let removed   = 0;

      while (hasMore) {
        const syncRes = await fetch(`${plaidUrl}/transactions/sync`, {
          method: 'POST',
          headers: {
            'Content-Type':   'application/json',
            'PLAID-CLIENT-ID': clientId,
            'PLAID-SECRET':    secret,
          },
          body: JSON.stringify({
            access_token: plaidItem.access_token_encrypted,
            cursor: cursor || undefined,
            count:  500,
          }),
        });

        const syncData = await syncRes.json();
        if (!syncRes.ok) {
          console.error('[Plaid] /transactions/sync error:', syncData);
          break;
        }

        const { added, modified, removed: removedTxs, next_cursor, has_more } = syncData;

        // ── Map account_id → credit_card row ────────────────────────────
        const { data: cards } = await supabase
          .from('credit_cards')
          .select('id, account_id')
          .eq('plaid_item_id', plaidItem.id);

        const accountToCard = new Map(
          (cards ?? []).map((c: Record<string, string>) => [c.account_id, c.id])
        );

        // ── Upsert added + modified ──────────────────────────────────────
        const upserts = [...(added ?? []), ...(modified ?? [])]
          .filter((tx: Record<string, unknown>) => accountToCard.has(tx.account_id as string))
          .map((tx: Record<string, unknown>) => ({
            user_id:              plaidItem.user_id,
            credit_card_id:       accountToCard.get(tx.account_id as string),
            plaid_transaction_id: tx.transaction_id,
            amount:               tx.amount,
            category:             (tx.personal_finance_category as Record<string, string>)?.primary
                                    ?? (tx.category as string[])?.[0]
                                    ?? 'other',
            description:          tx.name,
            timestamp:            tx.date,
            pending:              tx.pending ?? false,
            synced:               true,
          }));

        if (upserts.length > 0) {
          const { error: txErr } = await supabase
            .from('transactions')
            .upsert(upserts, { onConflict: 'plaid_transaction_id' });

          if (txErr) console.error('[Plaid] Upsert error:', txErr);
          else synced += upserts.length;
        }

        // ── Remove deleted transactions ───────────────────────────────────
        // Plaid sends { transaction_id } objects in the removed array
        const removedIds = (removedTxs ?? []).map((t: Record<string, string>) => t.transaction_id);
        if (removedIds.length > 0) {
          const { error: delErr } = await supabase
            .from('transactions')
            .delete()
            .in('plaid_transaction_id', removedIds);

          if (delErr) console.error('[Plaid] Delete error:', delErr);
          else removed += removedIds.length;
        }

        cursor  = next_cursor;
        hasMore = has_more;
      }

      // Persist cursor
      await supabase
        .from('plaid_items')
        .update({
          sync_cursor:   cursor,
          last_sync_at:  new Date().toISOString(),
          error_message: null,
          error_code:    null,
        })
        .eq('id', plaidItem.id);

      console.log(`[Plaid] Synced ${synced} added/modified, deleted ${removed} removed`);
      break;
    }

    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      console.log(`[Plaid] ${webhookCode} — triggering full sync`);
      // Re-use SYNC_UPDATES_AVAILABLE path (cursor starts empty so it does full sync)
      await handleTransactionsWebhook(
        supabase, plaidItem, 'SYNC_UPDATES_AVAILABLE', payload, plaidUrl, clientId, secret
      );
      break;

    default:
      console.log(`[Plaid] Unhandled transaction code: ${webhookCode}`);
  }
}

// ── Item webhook ─────────────────────────────────────────────────────────

async function handleItemWebhook(
  supabase: ReturnType<typeof createClient>,
  plaidItem: Record<string, unknown>,
  webhookCode: string,
  error: Record<string, string> | null
) {
  switch (webhookCode) {
    case 'ERROR': {
      const code    = error?.error_code    ?? 'UNKNOWN';
      const message = error?.error_message ?? 'Unknown error';
      console.error(`[Plaid] Item error: ${code} — ${message}`);
      await supabase.from('plaid_items').update({
        status:        code === 'ITEM_LOGIN_REQUIRED' ? 'login_required' : 'error',
        error_code:    code,
        error_message: message,
      }).eq('id', plaidItem.id);
      break;
    }
    case 'PENDING_EXPIRATION':
      await supabase.from('plaid_items').update({
        status:        'pending_expiration',
        error_message: 'Access consent is expiring. Please re-link your account.',
      }).eq('id', plaidItem.id);
      break;

    case 'USER_PERMISSION_REVOKED':
      await supabase.from('plaid_items').update({
        status:        'revoked',
        error_message: 'User permission was revoked.',
      }).eq('id', plaidItem.id);
      break;

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      console.log(`[Plaid] Webhook URL update acknowledged for item ${plaidItem.id}`);
      break;

    default:
      console.log(`[Plaid] Unhandled item code: ${webhookCode}`);
  }
}
