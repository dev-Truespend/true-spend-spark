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

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', threeMonthsAgo.toISOString())
      .order('timestamp', { ascending: false });

    if (txError) throw txError;

    // Calculate spending by category
    const categorySpending = transactions?.reduce((acc: any, tx) => {
      const cat = tx.category || 'other';
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0, transactions: [] };
      }
      acc[cat].total += tx.amount;
      acc[cat].count += 1;
      acc[cat].transactions.push(tx);
      return acc;
    }, {});

    // Get existing budgets
    const { data: existingBudgets, error: budgetError } = await supabaseClient
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    if (budgetError) throw budgetError;

    const recommendations = [];

    // Generate recommendations for each category with spending
    for (const [category, spending] of Object.entries(categorySpending || {})) {
      const { total, count } = spending as any;
      const avgMonthly = total / 3; // 3 months average
      
      const existingBudget = existingBudgets?.find(b => b.category === category);
      
      if (!existingBudget) {
        // Recommend creating a budget
        const recommendedAmount = Math.ceil(avgMonthly * 1.1); // 10% buffer
        recommendations.push({
          type: 'create_budget',
          category,
          current_spending: avgMonthly,
          recommended_limit: recommendedAmount,
          reason: `Based on your average monthly spending of $${avgMonthly.toFixed(2)}, we recommend setting a budget of $${recommendedAmount.toFixed(2)} with a 10% buffer.`,
          confidence: 0.85,
          potential_savings: avgMonthly * 0.1,
        });
      } else {
        // Check if budget needs adjustment
        const currentLimit = existingBudget.limit_amount;
        const utilizationRate = avgMonthly / currentLimit;
        
        if (utilizationRate > 0.95) {
          // Consistently over budget
          recommendations.push({
            type: 'increase_budget',
            category,
            current_limit: currentLimit,
            current_spending: avgMonthly,
            recommended_limit: Math.ceil(avgMonthly * 1.15),
            reason: `You're consistently spending ${(utilizationRate * 100).toFixed(0)}% of your budget. Consider increasing it to avoid stress.`,
            confidence: 0.9,
          });
        } else if (utilizationRate < 0.6) {
          // Under budget - opportunity to reduce
          recommendations.push({
            type: 'reduce_budget',
            category,
            current_limit: currentLimit,
            current_spending: avgMonthly,
            recommended_limit: Math.ceil(avgMonthly * 1.2),
            reason: `You're only using ${(utilizationRate * 100).toFixed(0)}% of your budget. You could reduce it and reallocate funds.`,
            confidence: 0.8,
            potential_savings: currentLimit - (avgMonthly * 1.2),
          });
        }
      }
    }

    // Identify high-variation categories (opportunity for optimization)
    for (const [category, spending] of Object.entries(categorySpending || {})) {
      const { transactions: txs } = spending as any;
      const amounts = txs.map((t: any) => t.amount);
      const mean = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;
      
      if (coefficientOfVariation > 0.5) {
        recommendations.push({
          type: 'high_variation_warning',
          category,
          variation: coefficientOfVariation,
          reason: `Your ${category} spending varies significantly. Consider tracking this category more closely to identify savings opportunities.`,
          confidence: 0.75,
        });
      }
    }

    // Save recommendations to database
    for (const rec of recommendations) {
      await supabaseClient
        .from('location_recommendations')
        .insert({
          user_id: user.id,
          recommendation_type: 'budget_adjustment',
          rationale: rec.reason,
          current_value: rec.current_spending || rec.current_limit,
          recommended_value: rec.recommended_limit,
          potential_savings: rec.potential_savings || 0,
          data_points_analyzed: transactions?.length || 0,
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations,
        analyzed_transactions: transactions?.length || 0,
        analyzed_period_months: 3,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate recommendations error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
