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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[location-insights-ai] Processing request for user: ${user.id}`);

    // Fetch geofence events for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error: eventsError } = await supabaseClient
      .from('geofence_events')
      .select('*, geofences(name, type, budget_limit, alert_threshold)')
      .eq('user_id', user.id)
      .gte('timestamp', thirtyDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (eventsError) {
      console.error('[location-insights-ai] Error fetching events:', eventsError);
      throw eventsError;
    }

    // Noise reduction: Count triggers per geofence per day
    const triggerCounts = events?.reduce((acc: any, event: any) => {
      if (event.event_type === 'entry') {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        const key = `${event.geofence_id}_${date}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});

    // Filter out noisy geofences (>10 triggers/day)
    const noisyGeofences = Object.entries(triggerCounts || {})
      .filter(([_, count]) => (count as number) > 10)
      .map(([key, _]) => key.split('_')[0]);

    console.log(`[location-insights-ai] Found ${noisyGeofences.length} noisy geofences`);

    // Fetch transactions linked to geofences
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('*, geofences(name, type, budget_limit)')
      .eq('user_id', user.id)
      .gte('timestamp', thirtyDaysAgo)
      .not('geofence_id', 'is', null);

    if (txError) {
      console.error('[location-insights-ai] Error fetching transactions:', txError);
      throw txError;
    }

    // Fetch geofence metrics for telemetry feedback
    const { data: metrics, error: metricsError } = await supabaseClient
      .from('geofence_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', thirtyDaysAgo)
      .in('metric_type', ['location_accuracy', 'ai_insight_quality'])
      .order('timestamp', { ascending: false })
      .limit(100);

    if (metricsError) {
      console.error('[location-insights-ai] Error fetching metrics:', metricsError);
    }

    // Prepare context for AI analysis
    const spendingByGeofence = transactions?.reduce((acc: any, tx: any) => {
      const gid = tx.geofence_id;
      if (!acc[gid]) {
        acc[gid] = {
          name: tx.geofences?.name || 'Unknown',
          type: tx.geofences?.type || 'unknown',
          budget_limit: tx.geofences?.budget_limit,
          total_spent: 0,
          transaction_count: 0,
          categories: {},
        };
      }
      acc[gid].total_spent += parseFloat(tx.amount);
      acc[gid].transaction_count += 1;
      acc[gid].categories[tx.category] = (acc[gid].categories[tx.category] || 0) + parseFloat(tx.amount);
      return acc;
    }, {});

    const eventPatterns = events?.reduce((acc: any, event: any) => {
      const gid = event.geofence_id;
      if (!acc[gid]) {
        acc[gid] = { entry_count: 0, exit_count: 0, dwell_time_estimate: 0 };
      }
      if (event.event_type === 'entry') acc[gid].entry_count += 1;
      if (event.event_type === 'exit') acc[gid].exit_count += 1;
      return acc;
    }, {});

    // Calculate average accuracy from metrics
    const avgAccuracy = metrics?.reduce((sum, m) => {
      if (m.metric_type === 'location_accuracy') return sum + m.value;
      return sum;
    }, 0) / (metrics?.filter(m => m.metric_type === 'location_accuracy').length || 1);

    const systemPrompt = `You are an AI financial advisor analyzing location-based spending patterns. 

Context:
- User's geofence events and transactions over the last 30 days
- Telemetry feedback: Average location accuracy is ${avgAccuracy.toFixed(1)}%
- Noisy geofences (>10 triggers/day) are filtered out for better insights

Your task:
1. Identify spending patterns and anomalies at specific locations
2. Provide actionable budget recommendations based on location behavior
3. Detect savings opportunities (e.g., frequent visits to expensive places)
4. Consider the telemetry feedback - if accuracy is low, recommend recalibrating geofences

Output format: JSON array of insights with:
- title: Clear, actionable title (max 60 chars)
- description: Detailed explanation (max 200 chars)
- insight_type: 'savings_opportunity' | 'spending_alert' | 'budget_recommendation' | 'pattern_detected'
- priority: 'low' | 'medium' | 'high'
- confidence_score: 0-100 (consider telemetry accuracy)
- geofence_id: relevant geofence ID (if applicable)
- metadata: additional context as JSON object

Generate 3-5 insights. Be specific and actionable.`;

    const userPrompt = `Analyze this location spending data:

Spending by Location:
${JSON.stringify(spendingByGeofence, null, 2)}

Visit Patterns:
${JSON.stringify(eventPatterns, null, 2)}

Location Accuracy: ${avgAccuracy.toFixed(1)}%
Noisy Geofences (excluded): ${noisyGeofences.length}

Generate insights.`;

    // Call Claude directly through Anthropic. This legacy compatibility endpoint
    // remains until location insights are fully routed through ai-agent.
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const model = Deno.env.get('ANTHROPIC_MODEL_FAST') || 'claude-haiku-4-5-20251001';
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    console.log('[location-insights-ai] Calling AI model...');

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[location-insights-ai] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.content?.find((part: { type: string }) => part.type === 'text')?.text;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    const parsedInsights = JSON.parse(content);
    const insights = Array.isArray(parsedInsights) ? parsedInsights : parsedInsights.insights || [];

    console.log(`[location-insights-ai] Generated ${insights.length} insights`);

    // Store insights in database
    const insightsToInsert = insights.map((insight: any) => ({
      user_id: user.id,
      geofence_id: insight.geofence_id || null,
      title: insight.title,
      description: insight.description,
      insight_type: insight.insight_type,
      priority: insight.priority,
      confidence_score: insight.confidence_score,
      metadata: insight.metadata || {},
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));

    const { data: insertedInsights, error: insertError } = await supabaseClient
      .from('location_insights')
      .insert(insightsToInsert)
      .select();

    if (insertError) {
      console.error('[location-insights-ai] Error inserting insights:', insertError);
      throw insertError;
    }

    // Record AI quality metric for feedback loop
    await supabaseClient
      .from('geofence_metrics')
      .insert({
        user_id: user.id,
        metric_name: 'ai_insights_generated',
        metric_type: 'ai_insight_quality',
        value: insights.length,
        unit: 'count',
        metadata: {
          avg_confidence: insights.reduce((sum: number, i: any) => sum + i.confidence_score, 0) / insights.length,
          location_accuracy: avgAccuracy,
          noisy_geofences_filtered: noisyGeofences.length,
        },
      });

    console.log(`[location-insights-ai] Successfully stored ${insertedInsights.length} insights`);

    return new Response(JSON.stringify({
      success: true,
      insights: insertedInsights,
      stats: {
        events_analyzed: events?.length || 0,
        transactions_analyzed: transactions?.length || 0,
        location_accuracy: avgAccuracy,
        noisy_geofences_filtered: noisyGeofences.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[location-insights-ai] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
