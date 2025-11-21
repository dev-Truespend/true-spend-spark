import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

async function generateEmbedding(text: string, hfToken: string): Promise<number[]> {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HuggingFace API error: ${error}`);
  }

  const embedding = await response.json();
  return embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    
    if (!hfToken) {
      throw new Error('HuggingFace token not configured');
    }

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

    const { query, limit = 10, threshold = 0.5 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query, hfToken);

    // Store search history
    await supabase.from('semantic_search_history').insert({
      user_id: user.id,
      query_text: query,
      query_embedding: JSON.stringify(queryEmbedding),
    });

    // Perform vector similarity search using pgvector
    // Note: Using cosine distance (1 - cosine_similarity) for ordering
    const { data: results, error: searchError } = await supabase.rpc('search_transactions_semantic', {
      query_embedding: queryEmbedding,
      match_threshold: 1 - threshold, // Convert similarity to distance
      match_count: limit,
      p_user_id: user.id,
    });

    if (searchError) {
      // Fallback: if RPC doesn't exist, do a simpler text search
      console.warn('Semantic search RPC not found, falling back to text search');
      
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .or(`merchant_name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (fallbackError) throw fallbackError;

      return new Response(
        JSON.stringify({
          success: true,
          results: fallbackResults,
          count: fallbackResults?.length || 0,
          method: 'text_search',
          message: 'Semantic search unavailable, used text search fallback',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate average similarity
    const avgSimilarity = results && results.length > 0
      ? results.reduce((sum: number, r: any) => sum + (1 - r.distance), 0) / results.length
      : 0;

    // Update search history with results
    await supabase
      .from('semantic_search_history')
      .update({
        results_count: results?.length || 0,
        avg_similarity: avgSimilarity,
      })
      .eq('user_id', user.id)
      .eq('query_text', query)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`Semantic search completed for user ${user.id}: ${results?.length || 0} results, avg similarity: ${avgSimilarity.toFixed(3)}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        count: results?.length || 0,
        avg_similarity: avgSimilarity,
        method: 'semantic_search',
        message: 'Semantic search completed using HuggingFace embeddings',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Semantic search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
