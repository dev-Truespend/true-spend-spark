import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Firebase OAuth 2.0 token caching
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

// iOS APNS Configuration
const IOS_APNS_KEY = Deno.env.get('IOS_APNS_KEY');
const IOS_APNS_KEY_ID = Deno.env.get('IOS_APNS_KEY_ID');
const IOS_APNS_TEAM_ID = Deno.env.get('IOS_APNS_TEAM_ID');
const APNS_HOST = 'https://api.push.apple.com'; // Production

// APNS JWT token caching
let cachedApnsToken: string | null = null;
let apnsTokenExpiresAt = 0;

/**
 * Generate OAuth 2.0 access token from Firebase Service Account JSON
 * Uses JWT assertion flow as per Google OAuth 2.0 spec
 */
async function getFirebaseAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedAccessToken && tokenExpiresAt > now + 300) {
    console.log('Using cached Firebase access token');
    return cachedAccessToken;
  }

  console.log('Generating new Firebase access token');
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not configured');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const jwtPayload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${unsignedToken}.${encodedSignature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get Firebase access token: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in || 3600);
  
  if (!cachedAccessToken) {
    throw new Error('Failed to obtain access token');
  }
  
  return cachedAccessToken;
}

// Generate iOS APNS JWT token
async function getApnsToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedApnsToken && apnsTokenExpiresAt > now + 300) {
    console.log('Using cached APNS token');
    return cachedApnsToken;
  }

  console.log('Generating new APNS token');
  
  if (!IOS_APNS_KEY || !IOS_APNS_KEY_ID || !IOS_APNS_TEAM_ID) {
    throw new Error('iOS APNS credentials not configured');
  }

  const header = {
    alg: 'ES256',
    kid: IOS_APNS_KEY_ID,
  };

  const payload = {
    iss: IOS_APNS_TEAM_ID,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Parse PKCS#8 private key
  const pemContents = IOS_APNS_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  cachedApnsToken = `${unsignedToken}.${encodedSignature}`;
  apnsTokenExpiresAt = now + 3000; // APNS tokens are valid for ~1 hour
  
  return cachedApnsToken;
}

/**
 * Mark FCM token as expired in database
 */
async function markTokenAsExpired(supabase: any, userId: string) {
  const { error } = await supabase
    .from('user_devices')
    .update({ 
      token_expired: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to mark token as expired:', error);
  }
}

/**
 * Update token last verified timestamp
 */
async function updateTokenVerified(supabase: any, userId: string) {
  const { error } = await supabase
    .from('user_devices')
    .update({ 
      token_last_verified: new Date().toISOString(),
      token_expired: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update token verification:', error);
  }
}

/**
 * Log notification delivery status
 */
async function logNotificationDelivery(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  category: string | undefined,
  data: any,
  platform: string,
  success: boolean,
  fcmMessageId?: string,
  errorCode?: string,
  errorMessage?: string
) {
  const { error } = await supabase
    .from('notification_delivery_status')
    .insert({
      user_id: userId,
      notification_id: fcmMessageId,
      title,
      body,
      category,
      data: data || {},
      platform,
      sent_at: new Date().toISOString(),
      fcm_message_id: fcmMessageId,
      error_code: errorCode,
      error_message: errorMessage,
    });

  if (error) {
    console.error('Failed to log notification delivery:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data, category } = await req.json();

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

    // Get user's FCM token and preferences
    const { data: deviceData, error: deviceError } = await supabase
      .from('user_devices')
      .select('fcm_token, platform, notification_preferences, badge_count, token_expired')
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

    // Check if token is marked as expired
    if (deviceData.token_expired) {
      console.log(`Token marked as expired for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: 'Device token expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check notification preferences for category
    const prefs = deviceData.notification_preferences || {};
    const categoryPref = category ? prefs[category] : null;
    
    if (categoryPref && !categoryPref.enabled) {
      console.log(`User disabled ${category} notifications`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'User preferences' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to ${deviceData.platform} device`);

    // Get Firebase OAuth 2.0 access token
    const accessToken = await getFirebaseAccessToken();
    const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'oauth-setup-476417';

    // Prepare platform-specific notification payload
    const message: any = {
      token: deviceData.fcm_token,
      notification: {
        title,
        body
      },
      data: data || {},
    };

    // iOS-specific configuration
    if (deviceData.platform === 'ios') {
      message.apns = {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            alert: { title, body },
            sound: categoryPref?.sound ? 'default' : undefined,
            badge: deviceData.badge_count + 1,
            'content-available': 1,
            category: category || 'default'
          }
        }
      };
    }

    // Android-specific configuration
    if (deviceData.platform === 'android') {
      message.android = {
        priority: 'high',
        ttl: '86400s', // 24 hours
        notification: {
          channelId: category || 'default',
          sound: categoryPref?.sound ? 'default' : undefined,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          icon: 'notification_icon',
          color: '#FF5722'
        }
      };
    }

    // Send to FCM using OAuth 2.0 token
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      }
    );

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('FCM error:', fcmResult);

      // Handle specific FCM error codes
      const errorCode = fcmResult.error?.code;
      const errorMessage = fcmResult.error?.message;

      // Mark token as expired for invalid/not found errors
      if (errorCode === 'INVALID_ARGUMENT' || errorCode === 'NOT_FOUND' || 
          errorMessage?.includes('not a valid FCM registration token')) {
        console.log(`Marking token as expired for user: ${userId}`);
        await markTokenAsExpired(supabase, userId);
      }

      // Log failed delivery
      await logNotificationDelivery(
        supabase, userId, title, body, category, data,
        deviceData.platform, false, undefined, errorCode, errorMessage
      );

      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: fcmResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('FCM notification sent successfully:', fcmResult);

    // Update token as verified and log successful delivery
    await Promise.all([
      updateTokenVerified(supabase, userId),
      logNotificationDelivery(
        supabase, userId, title, body, category, data,
        deviceData.platform, true, fcmResult.name
      )
    ]);

    // Update badge count for iOS
    if (deviceData.platform === 'ios') {
      await supabase
        .from('user_devices')
        .update({ badge_count: deviceData.badge_count + 1 })
        .eq('user_id', userId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: fcmResult.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send push notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
