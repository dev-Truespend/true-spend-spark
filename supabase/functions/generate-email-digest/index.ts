import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigestRequest {
  userId?: string;
  period: 'day' | 'week' | 'month';
  isTest?: boolean;
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

    const { userId, period, isTest }: DigestRequest = await req.json();

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    // Fetch user's transactions for the period
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('*, merchants(*)')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (txError) throw txError;

    // Calculate summary statistics
    const totalSpent = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const transactionCount = transactions?.length || 0;
    
    const categoryBreakdown = transactions?.reduce((acc: any, tx) => {
      const cat = tx.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + tx.amount;
      return acc;
    }, {});

    const topMerchants = Object.entries(
      transactions?.reduce((acc: any, tx) => {
        if (tx.merchants) {
          const name = tx.merchants.name;
          acc[name] = (acc[name] || 0) + tx.amount;
        }
        return acc;
      }, {}) || {}
    )
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // Fetch budget status
    const { data: budgets, error: budgetError } = await supabaseClient
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (budgetError) throw budgetError;

    const budgetSummary = budgets?.map((budget: any) => {
      const spent = transactions
        ?.filter((tx: any) => tx.category === budget.category)
        .reduce((sum: any, tx: any) => sum + tx.amount, 0) || 0;
      
      return {
        category: budget.category,
        limit: budget.limit_amount,
        spent,
        percentage: (spent / budget.limit_amount) * 100,
      };
    });

    // Fetch location insights
    const { data: insights, error: insightsError } = await supabaseClient
      .from('location_insights')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('priority', { ascending: false })
      .limit(3);

    if (insightsError) throw insightsError;

    // Send digest email
    const digestData = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalSpent,
      transactionCount,
      categoryBreakdown,
      topMerchants,
      budgetSummary,
      insights: insights || [],
      averageTransaction: transactionCount > 0 ? totalSpent / transactionCount : 0,
    };

    console.log('Digest data prepared:', digestData);

    // Call send-email-notification with weekly_summary template
    const { error: emailError } = await supabaseClient.functions.invoke('send-email-notification', {
      body: {
        userId,
        template: 'weekly_summary',
        data: digestData,
      },
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      throw emailError;
    }

    // Log digest generation
    await supabaseClient
      .from('email_delivery_logs')
      .insert({
        user_id: userId,
        email_type: 'digest',
        template_name: 'weekly_summary',
        metadata: { 
          digest_period: period, 
          isTest, 
          totalSpent,
          transactionCount,
          categoryCount: Object.keys(categoryBreakdown || {}).length
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Digest generated and sent',
        summary: digestData 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate digest error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
