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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent transactions for statistical analysis
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (txError) throw txError;

    if (!transactions || transactions.length < 10) {
      return new Response(
        JSON.stringify({
          anomalies: [],
          message: 'Insufficient transaction data for anomaly detection',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate statistics
    const amounts = transactions.map(t => Number(t.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const anomaliesDetected = [];

    // Detect anomalies for each transaction
    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      const zScore = Math.abs((amount - mean) / stdDev);
      const detections = [];

      // Unusual amount (Z-score > 3)
      if (zScore > 3) {
        detections.push({
          type: 'unusual_amount',
          confidence: Math.min(zScore / 5, 1),
          details: `Amount $${amount} is ${zScore.toFixed(2)} standard deviations from average`,
        });
      }

      // Unusual time (3am-6am)
      const hour = new Date(transaction.timestamp).getHours();
      if (hour >= 3 && hour < 6) {
        detections.push({
          type: 'unusual_time',
          confidence: 0.7,
          details: `Transaction at ${hour}:00 is outside normal hours`,
        });
      }

      // Duplicate transactions (same amount, merchant, within 5 minutes)
      const duplicates = transactions.filter(t => 
        t.id !== transaction.id &&
        Math.abs(Number(t.amount) - amount) < 0.01 &&
        t.merchant_id === transaction.merchant_id &&
        Math.abs(new Date(t.timestamp).getTime() - new Date(transaction.timestamp).getTime()) < 300000
      );

      if (duplicates.length > 0) {
        detections.push({
          type: 'potential_duplicate',
          confidence: 0.9,
          details: `Similar transaction found within 5 minutes`,
        });
      }

      // If anomalies detected, insert into database
      if (detections.length > 0) {
        const highestConfidence = Math.max(...detections.map(d => d.confidence));
        
        // Check if anomaly already exists
        const { data: existing } = await supabase
          .from('anomaly_detections')
          .select('id')
          .eq('transaction_id', transaction.id)
          .eq('status', 'pending')
          .single();

        if (!existing) {
          const { data: anomaly, error: anomalyError } = await supabase
            .from('anomaly_detections')
            .insert({
              user_id: user.id,
              transaction_id: transaction.id,
              anomaly_type: detections.map(d => d.type).join(', '),
              confidence_score: highestConfidence,
              severity: highestConfidence > 0.8 ? 'high' : highestConfidence > 0.5 ? 'medium' : 'low',
              details: { detections },
              detected_at: new Date().toISOString(),
              status: 'pending',
            })
            .select()
            .single();

          if (!anomalyError && anomaly) {
            anomaliesDetected.push(anomaly);
          }
        }
      }
    }

    console.log(`Detected ${anomaliesDetected.length} anomalies for user ${user.id}`);

    return new Response(
      JSON.stringify({
        anomalies: anomaliesDetected,
        stats: {
          mean: mean.toFixed(2),
          stdDev: stdDev.toFixed(2),
          transactionsAnalyzed: transactions.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
