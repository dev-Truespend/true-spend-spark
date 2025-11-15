import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    const { period = 'month' } = await req.json().catch(() => ({}));

    // Check cache first
    const cacheKey = `ai_spending_analysis_${period}`;
    const { data: cached } = await supabase
      .from('spending_patterns')
      .select('*')
      .eq('user_id', user.id)
      .eq('pattern_type', 'monthly')
      .gte('expires_at', new Date().toISOString())
      .order('cached_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ ...cached.data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transactions for analysis period
    const daysAgo = period === 'month' ? 30 : period === 'week' ? 7 : 90;
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString());

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({
          insights: ['No transaction data available for analysis.'],
          patterns: [],
          recommendations: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data summary for AI
    const categoryTotals: Record<string, number> = {};
    transactions.forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount);
    });

    const dataContext = `
Period: Last ${daysAgo} days
Total transactions: ${transactions.length}
Total spent: $${transactions.reduce((sum, tx) => sum + Number(tx.amount), 0).toFixed(2)}
Average transaction: $${(transactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / transactions.length).toFixed(2)}

Category breakdown:
${Object.entries(categoryTotals)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)} (${Math.round((amt / transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)) * 100)}%)`)
  .join('\n')}
`;

    const systemPrompt = `You are a financial analysis AI. Analyze spending data and provide insights in JSON format:
{
  "insights": ["3-5 key observations about spending patterns"],
  "patterns": ["2-3 recurring patterns or trends"],
  "recommendations": ["3-4 actionable recommendations"],
  "topCategories": [{"category": "name", "spent": number, "percentage": number}]
}

Be concise, data-driven, and actionable. Focus on unusual changes, opportunities to save, and spending trends.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataContext },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    let result;
    try {
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    // Cache the results
    const periodStart = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    await supabase.from('spending_patterns').insert({
      user_id: user.id,
      pattern_type: 'monthly',
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      data: result,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(
      JSON.stringify({ ...result, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI spending analysis error:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});