import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

// Import email templates
import { BudgetAlertEmail } from '../_shared/email-templates/budget-alert.tsx';
import { TransactionNotificationEmail } from '../_shared/email-templates/transaction-notification.tsx';
import { WeeklySummaryEmail } from '../_shared/email-templates/weekly-summary.tsx';
import { GeofenceAlertEmail } from '../_shared/email-templates/geofence-alert.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  userId: string;
  template: 'budget_alert' | 'transaction_notification' | 'weekly_summary' | 'geofence_alert';
  data: Record<string, any>;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check feature flag
    const { data: featureFlag } = await supabaseClient
      .from('feature_flags')
      .select('enabled')
      .eq('flag_name', 'EMAIL_TEMPLATES_ENABLED')
      .single();

    if (!featureFlag?.enabled) {
      console.log('Email templates not enabled, skipping');
      return new Response(
        JSON.stringify({ message: 'Email templates not enabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, template, data, category }: EmailRequest = await req.json();

    // Get user profile and notification preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, first_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    // Check notification preferences
    const { data: prefs } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if email notifications are enabled
    if (prefs && !prefs.email_enabled) {
      console.log('Email notifications disabled for user');
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check specific category preferences
    const categoryEnabled = checkCategoryEnabled(template, prefs);
    if (!categoryEnabled) {
      console.log(`Email for template ${template} disabled in preferences`);
      return new Response(
        JSON.stringify({ message: 'Email category disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check quiet hours
    if (prefs?.quiet_hours_enabled && isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      console.log('User is in quiet hours, skipping email');
      return new Response(
        JSON.stringify({ message: 'In quiet hours' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Render email template
    const html = await renderEmail(template, {
      firstName: profile.first_name || 'there',
      ...data,
    });

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') || 'TrueSpend <notifications@truespend.org>',
      to: [profile.email],
      subject: getEmailSubject(template, data),
      html,
    });

    if (emailError) {
      throw emailError;
    }

    // Log email delivery
    await supabaseClient.from('email_delivery_logs').insert({
      user_id: userId,
      recipient_email: profile.email,
      email_type: template,
      template_name: template,
      template_version: '1.0',
      resend_message_id: emailData?.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailData?.id,
        template,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function checkCategoryEnabled(template: string, prefs: any): boolean {
  if (!prefs) return true; // Default to enabled if no preferences

  const categoryMap: Record<string, string> = {
    budget_alert: 'email_budget_alerts',
    transaction_notification: 'email_transaction_alerts',
    weekly_summary: 'email_weekly_summary',
    geofence_alert: 'email_geofence_entry',
  };

  const prefKey = categoryMap[template];
  return prefKey ? (prefs[prefKey] !== false) : true;
}

function isInQuietHours(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes < endMinutes) {
    return currentTime >= startMinutes && currentTime <= endMinutes;
  } else {
    return currentTime >= startMinutes || currentTime <= endMinutes;
  }
}

async function renderEmail(template: string, data: any): Promise<string> {
  switch (template) {
    case 'budget_alert':
      return await renderAsync(React.createElement(BudgetAlertEmail, data));
    case 'transaction_notification':
      return await renderAsync(React.createElement(TransactionNotificationEmail, data));
    case 'weekly_summary':
      return await renderAsync(React.createElement(WeeklySummaryEmail, data));
    case 'geofence_alert':
      return await renderAsync(React.createElement(GeofenceAlertEmail, data));
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

function getEmailSubject(template: string, data: any): string {
  switch (template) {
    case 'budget_alert':
      return `Budget Alert: ${data.percentage}% of ${data.budgetName}`;
    case 'transaction_notification':
      return `New transaction: $${data.amount.toFixed(2)} at ${data.merchantName}`;
    case 'weekly_summary':
      return `Your Weekly Spending Summary: $${data.totalSpent.toFixed(2)}`;
    case 'geofence_alert':
      return `You ${data.eventType === 'entry' ? 'entered' : 'left'} ${data.geofenceName}`;
    default:
      return 'TrueSpend Notification';
  }
}
