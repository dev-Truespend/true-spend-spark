import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorizationRequest {
  transactionId?: string;
  merchantName?: string;
  description?: string;
  amount?: number;
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

    const { transactionId, merchantName, description, amount }: CategorizationRequest = await req.json();

    // Use AI to categorize (Lovable AI - no API key needed)
    const prompt = `Categorize this transaction into ONE of these categories: groceries, dining, transportation, entertainment, shopping, utilities, healthcare, travel, other.

Transaction details:
- Merchant: ${merchantName || 'Unknown'}
- Description: ${description || 'N/A'}
- Amount: $${amount || 0}

Respond with ONLY the category name in lowercase, nothing else.`;

    const { data: aiResponse, error: aiError } = await supabaseClient.functions.invoke('ai-categorize-transaction', {
      body: {
        prompt,
        model: 'google/gemini-2.5-flash-lite', // Fast and cheap for simple classification
      },
    });

    if (aiError) {
      console.error('AI categorization error:', aiError);
      // Fallback to rule-based categorization
      const category = ruleBasedCategorization(merchantName || '', description || '');
      
      if (transactionId) {
        await supabaseClient
          .from('transactions')
          .update({ 
            category,
            metadata: { auto_categorized: true, method: 'rule-based' }
          })
          .eq('id', transactionId);
      }

      return new Response(
        JSON.stringify({ category, method: 'rule-based' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const category = aiResponse?.category || aiResponse?.text?.trim().toLowerCase() || 'other';
    
    // Validate category
    const validCategories = ['groceries', 'dining', 'transportation', 'entertainment', 'shopping', 'utilities', 'healthcare', 'travel', 'other'];
    const finalCategory = validCategories.includes(category) ? category : 'other';

    // Update transaction if ID provided
    if (transactionId) {
      await supabaseClient
        .from('transactions')
        .update({ 
          category: finalCategory,
          metadata: { auto_categorized: true, method: 'ai', confidence: aiResponse?.confidence || 0.8 }
        })
        .eq('id', transactionId);
    }

    return new Response(
      JSON.stringify({ 
        category: finalCategory, 
        method: 'ai',
        confidence: aiResponse?.confidence || 0.8 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Auto-categorize error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function ruleBasedCategorization(merchant: string, description: string): string {
  const text = `${merchant} ${description}`.toLowerCase();
  
  if (text.match(/grocery|supermarket|walmart|target|costco|food/)) return 'groceries';
  if (text.match(/restaurant|cafe|coffee|pizza|burger|dining/)) return 'dining';
  if (text.match(/uber|lyft|gas|fuel|parking|transit|bus|train/)) return 'transportation';
  if (text.match(/movie|netflix|spotify|game|concert|theater/)) return 'entertainment';
  if (text.match(/amazon|store|shop|mall|clothing|electronics/)) return 'shopping';
  if (text.match(/electric|water|internet|phone|utility|bill/)) return 'utilities';
  if (text.match(/hospital|doctor|pharmacy|medical|health/)) return 'healthcare';
  if (text.match(/hotel|airline|flight|travel|airbnb/)) return 'travel';
  
  return 'other';
}
