import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Beta distribution sampling using inverse CDF approximation
function betaSample(alpha: number, beta: number): number {
  // Use rejection sampling for Beta distribution
  const gamma1 = gammaRandom(alpha);
  const gamma2 = gammaRandom(beta);
  return gamma1 / (gamma1 + gamma2);
}

// Gamma distribution using Marsaglia and Tsang method
function gammaRandom(shape: number): number {
  if (shape < 1) {
    return gammaRandom(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  
  while (true) {
    let x, v;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = Math.random();
    
    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v;
    }
    
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

// Box-Muller transform for normal distribution
function normalRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { categories, totalBudget, periodStart, periodEnd } = await req.json();

    if (!categories || !totalBudget || !periodStart || !periodEnd) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch historical spending data for each category
    const categoryStats = await Promise.all(
      categories.map(async (category: string) => {
        const { data: history } = await supabase
          .from('budget_optimization_history')
          .select('allocated_amount, actual_spent, alpha_param, beta_param')
          .eq('user_id', user.id)
          .eq('category', category)
          .order('created_at', { ascending: false })
          .limit(1);

        if (history && history.length > 0) {
          return {
            category,
            alpha: history[0].alpha_param,
            beta: history[0].beta_param,
          };
        }

        // Initialize with uniform prior (1,1)
        return { category, alpha: 1, beta: 1 };
      })
    );

    // Thompson Sampling: sample from each Beta distribution
    const samples = categoryStats.map(stat => ({
      category: stat.category,
      sample: betaSample(stat.alpha, stat.beta),
      alpha: stat.alpha,
      beta: stat.beta,
    }));

    // Allocate budget proportionally to samples
    const totalSample = samples.reduce((sum, s) => sum + s.sample, 0);
    const allocations = samples.map(s => ({
      category: s.category,
      allocated_amount: (s.sample / totalSample) * totalBudget,
      confidence_score: s.sample,
      alpha_param: s.alpha,
      beta_param: s.beta,
    }));

    // Save allocations to database
    await Promise.all(
      allocations.map(allocation =>
        supabase.from('budget_optimization_history').insert({
          user_id: user.id,
          category: allocation.category,
          period_start: periodStart,
          period_end: periodEnd,
          allocated_amount: allocation.allocated_amount,
          confidence_score: allocation.confidence_score,
          alpha_param: allocation.alpha_param,
          beta_param: allocation.beta_param,
        })
      )
    );

    console.log(`Thompson Sampling completed for user ${user.id}: ${allocations.length} categories optimized`);

    return new Response(
      JSON.stringify({ 
        success: true,
        allocations,
        message: 'Budget optimized using Thompson Sampling'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Thompson Sampling error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
