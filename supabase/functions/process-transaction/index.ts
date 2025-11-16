import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

interface TransactionInput {
  amount: number;
  category: string;
  description?: string;
  merchant_id?: string;
  location_lat?: number;
  location_lng?: number;
  timestamp?: string;
  idempotency_key?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-request-id') || `req-${Date.now()}`;
  console.log(`[${correlationId}] Processing transaction request`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${correlationId}] Auth error:`, authError);
      return new Response(JSON.stringify({ 
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          correlationId,
        }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input: TransactionInput = await req.json();

    // Validate input
    if (!input.amount || input.amount <= 0) {
      return new Response(JSON.stringify({ 
        ok: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Invalid amount',
          correlationId,
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check idempotency
    if (input.idempotency_key) {
      console.log(`[${correlationId}] Checking idempotency key: ${input.idempotency_key}`);
      
      const { data: existingEvent } = await supabase
        .from('transaction_events_log')
        .select('response_payload')
        .eq('idempotency_key', input.idempotency_key)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .single();

      if (existingEvent && existingEvent.response_payload) {
        console.log(`[${correlationId}] Returning cached response for idempotency key`);
        return new Response(JSON.stringify(existingEvent.response_payload), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Idempotent-Replay': 'true',
          },
        });
      }

      // Log event start
      await supabase.from('transaction_events_log').insert({
        idempotency_key: input.idempotency_key,
        user_id: user.id,
        event_type: 'process_transaction',
        request_payload: input,
        status: 'processing',
        correlation_id: correlationId,
      });
    }

    // Step 1: Find matching geofence if location provided
    let geofence_id = null;
    if (input.location_lat && input.location_lng) {
      const { data: geofences } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true);

      if (geofences) {
        for (const geofence of geofences) {
          const distance = calculateDistance(
            input.location_lat,
            input.location_lng,
            Number(geofence.center_lat),
            Number(geofence.center_lng)
          );
          if (distance <= geofence.radius_meters) {
            geofence_id = geofence.id;
            break;
          }
        }
      }
    }

    // Step 2: Match or create merchant
    let merchant_id = input.merchant_id;
    if (!merchant_id && input.description) {
      const { data: existingMerchant } = await supabase
        .from('merchants')
        .select('id')
        .ilike('name', `%${input.description}%`)
        .limit(1)
        .single();

      if (existingMerchant) {
        merchant_id = existingMerchant.id;
      } else if (input.location_lat && input.location_lng) {
        const { data: newMerchant } = await supabase
          .from('merchants')
          .insert({
            name: input.description,
            lat: input.location_lat,
            lng: input.location_lng,
            place_id: `generated_${Date.now()}`,
          })
          .select()
          .single();

        if (newMerchant) merchant_id = newMerchant.id;
      }
    }

    // Step 3: Insert transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: input.amount,
        category: input.category,
        description: input.description,
        merchant_id,
        geofence_id,
        location_lat: input.location_lat,
        location_lng: input.location_lng,
        timestamp: input.timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) {
      console.error(`[${correlationId}] Transaction insert error:`, txError);
      throw txError;
    }

    console.log(`[${correlationId}] Transaction created: ${transaction.id}`);

    // Step 4: Budget threshold trigger will auto-fire via database trigger
    // No need to manually check budgets here

    // Step 5: Apply transaction rules
    // Step 5: Apply transaction rules using database function
    const { data: rulesResult, error: rulesError } = await supabase.rpc(
      'evaluate_transaction_rules',
      {
        p_user_id: user.id,
        p_transaction_data: {
          amount: input.amount,
          category: input.category,
          description: input.description,
          merchant_id,
          geofence_id
        }
      }
    );

    let rulesApplied = 0;
    if (!rulesError && rulesResult && Array.isArray(rulesResult)) {
      rulesApplied = rulesResult.length;
      console.log(`[${correlationId}] Applied ${rulesApplied} rules`);
      
      // Apply rule actions
      for (const appliedRule of rulesResult) {
        const actions = appliedRule.actions as any;
        if (actions?.add_tag) {
          await supabase
            .from('transactions')
            .update({
              description: `${transaction.description || ''} [${actions.add_tag}]`.trim()
            })
            .eq('id', transaction.id);
        }
        
        console.log(`Applied rule: ${appliedRule.rule_name}`, actions);
      }
    }

    const response = {
      ok: true,
      data: {
        transaction,
        geofence_matched: !!geofence_id,
        rules_applied: rulesApplied,
      },
    };

    // Update idempotency log
    if (input.idempotency_key) {
      await supabase
        .from('transaction_events_log')
        .update({
          response_payload: response,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('idempotency_key', input.idempotency_key)
        .eq('user_id', user.id);
    }

    console.log(`[${correlationId}] Transaction processing complete`);
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${correlationId}] Transaction processing error:`, error);
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          correlationId,
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}