import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Contextual Deal Notification Trigger
 * - Monitors geofence entries
 * - Checks for nearby merchant deals
 * - Sends push notifications with savings potential
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { geofence_id, lat, lng } = await req.json();

    if (!geofence_id || !lat || !lng) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Deal Notification] User ${user.id} entered geofence ${geofence_id}`);

    // Get nearby merchants with active deals
    const { data: recommendations, error: recError } = await supabase
      .from('merchant_recommendations')
      .select(`
        *,
        merchants (
          id,
          name,
          category,
          rating,
          lat,
          lng
        )
      `)
      .eq('user_id', user.id)
      .eq('geofence_id', geofence_id)
      .in('deal_type', ['discount', 'cashback', 'loyalty', 'first_time'])
      .is('viewed', null)
      .gt('expires_at', new Date().toISOString())
      .order('potential_savings', { ascending: false })
      .limit(3);

    if (recError) throw recError;

    if (!recommendations || recommendations.length === 0) {
      console.log('[Deal Notification] No active deals found');
      return new Response(JSON.stringify({ 
        notifications_sent: 0,
        message: 'No active deals in this area',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', user.id)
      .single();

    // Check quiet hours
    if (prefs?.quiet_hours_enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = (prefs.quiet_hours_start || '22:00').split(':').map(Number);
      const [endHour, endMin] = (prefs.quiet_hours_end || '08:00').split(':').map(Number);
      const quietStart = startHour * 60 + startMin;
      const quietEnd = endHour * 60 + endMin;

      const inQuietHours = quietStart <= quietEnd
        ? currentTime >= quietStart && currentTime <= quietEnd
        : currentTime >= quietStart || currentTime <= quietEnd;

      if (inQuietHours) {
        console.log('[Deal Notification] User in quiet hours, skipping notification');
        return new Response(JSON.stringify({ 
          notifications_sent: 0,
          message: 'User in quiet hours',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Send push notifications for top deals
    const notifications = [];
    for (const rec of recommendations.slice(0, 2)) { // Max 2 notifications
      const merchant = rec.merchants as any;
      const savings = rec.potential_savings || 0;
      
      const notificationBody = {
        user_id: user.id,
        title: `💰 ${rec.deal_type === 'discount' ? 'Discount' : 'Deal'} Alert!`,
        body: `Save ${savings > 0 ? `$${savings.toFixed(0)}` : 'money'} at ${merchant?.name || 'nearby merchant'}. ${rec.deal_description || ''}`,
        category: 'deal_alert',
        data: {
          type: 'merchant_deal',
          merchant_id: merchant?.id,
          recommendation_id: rec.id,
          geofence_id: geofence_id,
          deal_type: rec.deal_type,
          potential_savings: savings,
        },
      };

      notifications.push(notificationBody);

      // Queue notification
      await supabase.from('notification_queue').insert({
        ...notificationBody,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      });

      // Mark recommendation as viewed
      await supabase
        .from('merchant_recommendations')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', rec.id);
    }

    console.log(`✅ Queued ${notifications.length} deal notifications`);

    return new Response(JSON.stringify({ 
      notifications_sent: notifications.length,
      deals_found: recommendations.length,
      notifications,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Deal Notification] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
