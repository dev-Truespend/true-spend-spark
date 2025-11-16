import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

interface ResendWebhookPayload {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`📬 [${requestId}] Resend webhook received`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse webhook payload
    const payload: ResendWebhookPayload = await req.json();
    console.log(`📧 [${requestId}] Webhook type: ${payload.type}, email_id: ${payload.data.email_id}`);

    // Map Resend event types to our status values
    let status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed' = 'sent';
    let deliveredAt: string | null = null;

    switch (payload.type) {
      case 'email.sent':
        status = 'sent';
        break;
      case 'email.delivered':
        status = 'delivered';
        deliveredAt = payload.created_at;
        break;
      case 'email.bounced':
        status = 'bounced';
        break;
      case 'email.complained':
        status = 'complained';
        break;
      case 'email.delivery_delayed':
        // Keep as 'sent', just log the delay
        console.log(`⏱️ [${requestId}] Email delivery delayed: ${payload.data.email_id}`);
        status = 'sent';
        break;
      default:
        // For 'email.opened' and 'email.clicked', we don't update status
        console.log(`ℹ️ [${requestId}] Event type ${payload.type} - no status update needed`);
        return new Response(
          JSON.stringify({ success: true, message: 'Event logged, no status update' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Find the email log by resend_message_id
    const { data: existingLog, error: findError } = await supabase
      .from('email_delivery_logs')
      .select('*')
      .eq('resend_message_id', payload.data.email_id)
      .maybeSingle();

    if (findError) {
      console.error(`❌ [${requestId}] Error finding email log:`, findError);
      throw new Error('Failed to find email log');
    }

    if (!existingLog) {
      console.log(`⚠️ [${requestId}] No email log found for message_id: ${payload.data.email_id}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Email log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the email log with new status
    const updateData: any = { status };
    if (deliveredAt) {
      updateData.delivered_at = deliveredAt;
    }

    const { error: updateError } = await supabase
      .from('email_delivery_logs')
      .update(updateData)
      .eq('resend_message_id', payload.data.email_id);

    if (updateError) {
      console.error(`❌ [${requestId}] Error updating email log:`, updateError);
      throw new Error('Failed to update email log');
    }

    console.log(`✅ [${requestId}] Email log updated: ${payload.data.email_id} -> ${status}`);

    // If bounced or complained, log to security logs for monitoring
    if (status === 'bounced' || status === 'complained') {
      await supabase.from('security_logs').insert({
        user_id: existingLog.user_id,
        event_type: status === 'bounced' ? 'email_bounced' : 'email_complained',
        severity: 'warn',
        details: {
          email_id: payload.data.email_id,
          email_type: existingLog.email_type,
          recipient: existingLog.recipient_email,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, request_id: requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ [${requestId}] Webhook handler error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
