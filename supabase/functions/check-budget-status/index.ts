import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getExtensionCorsHeaders, handleExtensionCors, logExtensionRequest } from "../_shared/extension-cors.ts";
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from "../_shared/rate-limit-middleware.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleExtensionCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getExtensionCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit (100 requests per 15 minutes)
    const rateLimitResult = await checkRateLimit(user.id, 'check-budget-status');

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Log request for monitoring
    logExtensionRequest(req, user.id);

    const { merchant, price } = await req.json();
    
    console.log('[Budget Check] User:', user.id, 'Merchant:', merchant, 'Price:', price);

    // Parse price if provided
    let priceAmount = 0;
    if (price && price !== 'unknown') {
      const priceMatch = price.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        priceAmount = parseFloat(priceMatch[0].replace(',', ''));
      }
    }

    // Get user's active budgets
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (budgetsError) {
      console.error('[Budget Check] Error fetching budgets:', budgetsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch budgets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alerts = [];
    let budgetStatus = null;

    // Check each budget
    if (budgets && budgets.length > 0) {
      for (const budget of budgets) {
        // Calculate spent amount for this budget period
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category', budget.category)
          .gte('timestamp', budget.start_date)
          .lte('timestamp', budget.end_date || new Date().toISOString());

        const spent = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
        const percentage = (spent / budget.limit_amount) * 100;

        // Check if threshold crossed with this potential purchase
        const projectedSpent = spent + priceAmount;
        const projectedPercentage = (projectedSpent / budget.limit_amount) * 100;

        // Alert if crossing 90% or 100% threshold
        if (percentage < 90 && projectedPercentage >= 90) {
          alerts.push({
            category: budget.category,
            spent: projectedSpent,
            limit: budget.limit_amount,
            percentage: projectedPercentage,
          });
        } else if (percentage < 100 && projectedPercentage >= 100) {
          alerts.push({
            category: budget.category,
            spent: projectedSpent,
            limit: budget.limit_amount,
            percentage: projectedPercentage,
          });
        }

        // Set budget status for first matching budget
        if (!budgetStatus) {
          budgetStatus = {
            category: budget.category,
            remaining: budget.limit_amount - spent,
          };
        }
      }
    }

    return new Response(JSON.stringify({ 
      ok: true,
      alerts,
      budgetStatus,
      priceDetected: priceAmount > 0,
    }), {
      headers: { 
        ...corsHeaders, 
        ...rateLimitHeaders(rateLimitResult),
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('[Budget Check] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
