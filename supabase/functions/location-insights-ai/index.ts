import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeofenceEvent {
  id: string;
  user_id: string;
  geofence_id: string;
  event_type: string;
  location_lat: number;
  location_lng: number;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent geofence events (last 24 hours)
    const { data: recentEvents, error: eventsError } = await supabaseClient
      .from('geofence_events')
      .select('*, geofences(*)')
      .eq('user_id', user.id)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (eventsError) throw eventsError;

    // Noise reduction: Skip if >10 triggers in last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTriggersCount = recentEvents?.filter(e => 
      new Date(e.timestamp) > hourAgo
    ).length || 0;

    if (recentTriggersCount > 10) {
      console.log(`Noise reduction: ${recentTriggersCount} triggers in last hour for user ${user.id}`);
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: 'noise_reduction',
        trigger_count: recentTriggersCount 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch spending patterns for analysis
    const { data: patterns, error: patternsError } = await supabaseClient
      .from('spending_patterns')
      .select('*')
      .eq('user_id', user.id)
      .order('pattern_strength', { ascending: false })
      .limit(10);

    if (patternsError) throw patternsError;

    // Fetch recent transactions for context
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('*, geofences(name, type)')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (txError) throw txError;

    // Call Lovable AI for pattern analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiPrompt = `Analyze this user's location-based spending data and provide personalized insights:

Recent Events: ${JSON.stringify(recentEvents?.slice(0, 5))}
Spending Patterns: ${JSON.stringify(patterns)}
Recent Transactions: ${JSON.stringify(transactions?.slice(0, 20))}

Provide 1-3 actionable insights in this JSON format:
{
  "insights": [
    {
      "type": "spending_pattern" | "budget_recommendation" | "anomaly_detection" | "optimization",
      "confidence": 0.0-1.0,
      "recommendation": "Brief, actionable recommendation",
      "reasoning": "Why this matters",
      "geofence_id": "uuid or null"
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a financial insights AI. Provide concise, actionable recommendations.' },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI gateway error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    const insights = JSON.parse(aiContent).insights;

    // Store insights in database
    const insightsToInsert = insights.map((insight: any) => ({
      user_id: user.id,
      geofence_id: insight.geofence_id || null,
      insight_type: insight.type,
      confidence_score: insight.confidence,
      recommendation: insight.recommendation,
      metadata: { reasoning: insight.reasoning },
    }));

    const { error: insertError } = await supabaseClient
      .from('location_insights')
      .insert(insightsToInsert);

    if (insertError) throw insertError;

    // Record telemetry metrics
    await supabaseClient.from('geofence_metrics').insert({
      user_id: user.id,
      metric_type: 'ai_insights',
      metric_name: 'insights_generated',
      value: insights.length,
      metadata: { model: 'gemini-2.5-flash', noise_reduced: recentTriggersCount > 10 },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      insights_generated: insights.length,
      insights 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in location-insights-ai:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
