import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model_type, date_range } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startDate = date_range?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = date_range?.end || new Date().toISOString();

    let trainingData: any = null;
    let dataId = `${model_type}_${Date.now()}`;

    console.log(`Preparing training data for ${model_type} from ${startDate} to ${endDate}`);

    // Fetch data based on model type
    switch (model_type) {
      case 'lambdamart_ranking': {
        // Fetch transaction data with merchant and category info for ranking
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*, merchant_name, category, amount, timestamp')
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)
          .order('timestamp', { ascending: true })
          .limit(5000);

        if (transactions && transactions.length > 0) {
          trainingData = {
            features: transactions.map(t => ({
              merchant_name: t.merchant_name || 'Unknown',
              category: t.category || 'Other',
              amount: t.amount,
              hour_of_day: new Date(t.timestamp).getHours(),
              day_of_week: new Date(t.timestamp).getDay(),
            })),
            labels: transactions.map(() => Math.random() > 0.5 ? 1 : 0), // Placeholder - would be actual CTR data
            query_ids: transactions.map((_, idx) => Math.floor(idx / 10)),
          };
        }
        break;
      }

      case 'prophet_forecast': {
        // Fetch aggregated daily spending
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, timestamp')
          .eq('user_id', user.id)
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)
          .order('timestamp', { ascending: true });

        if (transactions && transactions.length > 0) {
          // Aggregate by day
          const dailyData = transactions.reduce((acc: any, t) => {
            const date = new Date(t.timestamp).toISOString().split('T')[0];
            if (!acc[date]) {
              acc[date] = { ds: date, y: 0 };
            }
            acc[date].y += t.amount;
            return acc;
          }, {});

          trainingData = Object.values(dailyData);
        }
        break;
      }

      case 'als_collab_filter': {
        // Fetch user-merchant interactions
        const { data: transactions } = await supabase
          .from('transactions')
          .select('user_id, merchant_name, amount')
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)
          .limit(10000);

        if (transactions && transactions.length > 0) {
          // Create interaction matrix
          const interactions = transactions.map(t => ({
            user_id: t.user_id,
            merchant_name: t.merchant_name || 'Unknown',
            rating: Math.min(5, Math.ceil(t.amount / 20)), // Convert amount to rating scale
          }));

          trainingData = {
            interactions,
            n_users: new Set(interactions.map(i => i.user_id)).size,
            n_items: new Set(interactions.map(i => i.merchant_name)).size,
          };
        }
        break;
      }

      case 'dqn_cache_policy': {
        // Fetch API request logs for cache optimization
        const { data: apiLogs } = await supabase
          .from('api_request_log')
          .select('endpoint, response_time_ms, cache_hit, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true })
          .limit(10000);

        if (apiLogs && apiLogs.length > 0) {
          trainingData = {
            states: apiLogs.map(log => ({
              endpoint: log.endpoint,
              cache_hit: log.cache_hit ? 1 : 0,
              response_time: log.response_time_ms || 0,
              timestamp: new Date(log.created_at).getTime(),
            })),
            rewards: apiLogs.map(log => log.cache_hit ? 1 : -0.5),
          };
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported model type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!trainingData) {
      return new Response(
        JSON.stringify({ error: 'No data available for the specified date range' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload training data to storage
    const { error: uploadError } = await supabase.storage
      .from('training-data')
      .upload(`${dataId}.json`, JSON.stringify(trainingData), {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading training data:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload training data', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Training data prepared: ${dataId}`);

    return new Response(
      JSON.stringify({
        training_data_id: dataId,
        model_type,
        record_count: Array.isArray(trainingData) ? trainingData.length : Object.keys(trainingData).length,
        date_range: { start: startDate, end: endDate },
        message: 'Training data prepared successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in prepare-training-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
