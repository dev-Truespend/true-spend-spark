import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's FCM token
    const { data: deviceData, error: deviceError } = await supabase
      .from('user_devices')
      .select('fcm_token, platform')
      .eq('user_id', userId)
      .eq('push_enabled', true)
      .maybeSingle();

    if (deviceError) {
      console.error('Device query error:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deviceData?.fcm_token) {
      console.log(`No FCM token found for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: 'No device token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to ${deviceData.platform} device`);

    // Get Firebase server key from environment
    const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!firebaseProjectId || !firebaseServerKey) {
      console.error('Firebase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Firebase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send to FCM
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: deviceData.fcm_token,
            notification: {
              title,
              body
            },
            data: data || {},
            apns: deviceData.platform === 'ios' ? {
              payload: {
                aps: {
                  'content-available': 1,
                  sound: 'default',
                }
              }
            } : undefined,
            android: deviceData.platform === 'android' ? {
              priority: 'high',
              notification: {
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            } : undefined
          }
        })
      }
    );

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('FCM error:', fcmResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: fcmResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('FCM notification sent successfully:', fcmResult);

    // Log notification
    const { error: logError } = await supabase.from('push_notification_logs').insert({
      user_id: userId,
      title,
      body,
      data: data || {},
      sent_at: new Date().toISOString()
    });

    if (logError) {
      console.error('Failed to log notification:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: fcmResult.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send push notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
