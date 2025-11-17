import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing scheduled emails...');

    // Get emails scheduled for now or earlier
    const { data: scheduledEmails, error: fetchError } = await supabaseClient
      .from('email_delivery_logs')
      .select('*')
      .eq('send_status', 'scheduled')
      .lte('scheduled_send_time', new Date().toISOString())
      .order('scheduled_send_time', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching scheduled emails:', fetchError);
      throw fetchError;
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log('No scheduled emails to process');
      return new Response(
        JSON.stringify({ message: 'No emails to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${scheduledEmails.length} scheduled emails`);

    let processed = 0;
    let failed = 0;

    for (const email of scheduledEmails) {
      try {
        // Invoke send-email-notification without scheduledFor to send immediately
        const { data, error } = await supabaseClient.functions.invoke('send-email-notification', {
          body: {
            userId: email.user_id,
            template: email.template_name,
            data: email.metadata || {},
            category: email.email_type
          }
        });

        if (error) {
          console.error(`Failed to send email ${email.id}:`, error);
          
          // Mark as failed
          await supabaseClient
            .from('email_delivery_logs')
            .update({
              send_status: 'failed',
              error_message: error.message
            })
            .eq('id', email.id);

          failed++;
        } else {
          console.log(`Successfully sent email ${email.id}`);
          
          // Mark as sent
          await supabaseClient
            .from('email_delivery_logs')
            .update({
              send_status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', email.id);

          processed++;
        }
      } catch (error) {
        console.error(`Exception processing email ${email.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabaseClient
          .from('email_delivery_logs')
          .update({
            send_status: 'failed',
            error_message: errorMessage
          })
          .eq('id', email.id);

        failed++;
      }
    }

    console.log(`Processed ${processed} emails successfully, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Scheduled emails processed',
        processed,
        failed,
        total: scheduledEmails.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-scheduled-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
