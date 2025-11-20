import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/error-response.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch user's spending summary for current month
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, category')
      .eq('user_id', user.id)
      .gte('timestamp', startOfMonth.toISOString())
      .lte('timestamp', endOfMonth.toISOString());

    if (txError) throw txError;

    // Calculate totals
    const totalSpent = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    
    // Category breakdown (top 3)
    const categoryTotals = new Map<string, number>();
    transactions?.forEach((tx) => {
      if (tx.category) {
        categoryTotals.set(
          tx.category,
          (categoryTotals.get(tx.category) || 0) + (tx.amount || 0)
        );
      }
    });

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({
        category,
        amount: amount.toFixed(2),
      }));

    // Fetch active budgets
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('category, limit_amount')
      .eq('user_id', user.id)
      .eq('active', true)
      .lte('start_date', now.toISOString())
      .or(`end_date.is.null,end_date.gte.${now.toISOString()}`);

    if (budgetError) throw budgetError;

    // Calculate budget status
    const budgetStatus = budgets?.map((budget) => {
      const spent =
        transactions
          ?.filter((tx) => tx.category === budget.category)
          .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const percentage = (spent / budget.limit_amount) * 100;

      return {
        category: budget.category,
        spent: spent.toFixed(2),
        limit: budget.limit_amount.toFixed(2),
        percentage: percentage.toFixed(1),
        status: percentage >= 100 ? 'exceeded' : percentage >= 90 ? 'warning' : 'good',
      };
    });

    // Fetch recent geofence events (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: geofenceEvents, error: geofenceError } = await supabase
      .from('geofence_events')
      .select('event_type, geofences(name)')
      .eq('user_id', user.id)
      .gte('timestamp', sevenDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5);

    if (geofenceError) throw geofenceError;

    const recentLocations = geofenceEvents?.map((event: any) => ({
      location: event.geofences?.name || 'Unknown',
      eventType: event.event_type,
    }));

    // Return widget data
    const widgetData = {
      monthlySpending: {
        total: totalSpent.toFixed(2),
        currency: 'USD',
        month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      },
      topCategories,
      budgetStatus: budgetStatus || [],
      recentLocations: recentLocations || [],
      lastUpdated: now.toISOString(),
    };

    console.log('Widget data generated successfully for user:', user.id);

    return new Response(JSON.stringify({ ok: true, data: widgetData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating widget data:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
