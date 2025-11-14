import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeofenceEvent {
  id: string;
  user_id: string;
  geofence_id: string;
  event_type: 'enter' | 'exit' | 'dwell';
  location_lat: number;
  location_lng: number;
  timestamp: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing geofence events...');

    // Get recent events that need processing
    const { data: events, error: eventsError } = await supabase
      .from('geofence_events')
      .select(`
        *,
        geofences (
          name,
          type,
          budget_limit,
          alert_threshold
        )
      `)
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (eventsError) throw eventsError;

    console.log(`Found ${events?.length || 0} recent events`);

    // Process each event
    for (const event of events || []) {
      const geofence = event.geofences;
      if (!geofence) continue;

      // 🆕 FOURSQUARE ENRICHMENT - Enrich event with place data
      if (event.event_type === 'enter' && event.location_lat && event.location_lng) {
        try {
          console.log('🏪 Enriching geofence event with Foursquare data...');
          
          const enrichResponse = await fetch(`${supabaseUrl}/functions/v1/foursquare-enrich-geofence`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              geofence_event_id: event.id,
              lat: event.location_lat,
              lng: event.location_lng,
              user_id: event.user_id,
            }),
          });

          if (enrichResponse.ok) {
            const enrichResult = await enrichResponse.json();
            console.log('✅ Geofence enriched:', enrichResult.place?.name || 'No place found');
          } else {
            console.error('⚠️ Enrichment failed:', await enrichResponse.text());
          }
        } catch (enrichError) {
          console.error('⚠️ Enrichment error:', enrichError);
          // Continue processing even if enrichment fails
        }
      }

      // Log metric for event
      await supabase.from('geofence_metrics').insert({
        user_id: event.user_id,
        geofence_id: event.geofence_id,
        metric_name: 'geofence_event',
        metric_type: 'event_count',
        value: 1,
        unit: 'count',
        metadata: {
          event_type: event.event_type,
          location: [event.location_lat, event.location_lng],
        },
      });

      // Check budget if it's a spending zone
      if (geofence.type === 'spending' && geofence.budget_limit) {
        const { data: spending, error: spendingError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', event.user_id)
          .eq('geofence_id', event.geofence_id)
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (!spendingError && spending) {
          const totalSpending = spending.reduce((sum, t) => sum + Number(t.amount), 0);
          const budgetUsage = totalSpending / Number(geofence.budget_limit);

          // Record budget metric
          await supabase.from('geofence_metrics').insert({
            user_id: event.user_id,
            geofence_id: event.geofence_id,
            metric_name: 'budget_usage',
            metric_type: 'percentage',
            value: budgetUsage * 100,
            unit: 'percent',
            metadata: {
              total_spending: totalSpending,
              budget_limit: geofence.budget_limit,
            },
          });

          // Alert if threshold exceeded
          if (budgetUsage >= Number(geofence.alert_threshold)) {
            console.log(
              `ALERT: User ${event.user_id} exceeded ${(budgetUsage * 100).toFixed(1)}% of budget in ${geofence.name}`
            );
            
            // Log alert metric
            await supabase.from('geofence_metrics').insert({
              user_id: event.user_id,
              geofence_id: event.geofence_id,
              metric_name: 'budget_alert',
              metric_type: 'alert',
              value: budgetUsage * 100,
              unit: 'percent',
              metadata: {
                geofence_name: geofence.name,
                alert_threshold: geofence.alert_threshold,
              },
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: events?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing geofence events:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
