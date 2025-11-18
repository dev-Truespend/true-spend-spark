import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const foursquareApiKey = Deno.env.get('FOURSQUARE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📋 Syncing Foursquare categories...');

    // Fetch all categories from Foursquare API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://api.foursquare.com/v3/places/categories', {
        headers: {
          'Authorization': foursquareApiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Foursquare API Error:', response.status, errorText);
        
        await supabase.from('foursquare_api_logs').insert({
          endpoint: '/categories',
          response_status: response.status,
          response_time_ms: Date.now() - startTime,
          cache_hit: false,
          error_message: errorText,
        });

        return new Response(
          JSON.stringify({ error: 'Foursquare API error', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const categories = data.categories || [];

      console.log(`✅ Fetched ${categories.length} categories from Foursquare`);

      let syncedCount = 0;
      let errorCount = 0;

      // Flatten nested categories and insert them
      const flattenCategories = (cats: any[], parentId: number | null = null, level: number = 1) => {
        const flattened: any[] = [];
        
        for (const cat of cats) {
          flattened.push({
            category_id: cat.id,
            category_name: cat.name,
            icon_prefix: cat.icon?.prefix,
            icon_suffix: cat.icon?.suffix,
            parent_category_id: parentId,
            level,
            metadata: cat,
          });

          if (cat.categories && cat.categories.length > 0) {
            flattened.push(...flattenCategories(cat.categories, cat.id, level + 1));
          }
        }

        return flattened;
      };

      const flattenedCategories = flattenCategories(categories);

      // Upsert all categories
      for (const category of flattenedCategories) {
        const { error } = await supabase
          .from('foursquare_categories')
          .upsert(category, { onConflict: 'category_id' });

        if (error) {
          console.error('Error upserting category:', category.category_name, error);
          errorCount++;
        } else {
          syncedCount++;
        }
      }

      console.log(`✅ Synced ${syncedCount} categories (${errorCount} errors)`);

      // Log sync
      await supabase.from('foursquare_api_logs').insert({
        endpoint: '/categories',
        response_status: 200,
        response_time_ms: Date.now() - startTime,
        cache_hit: false,
        metadata: {
          synced_count: syncedCount,
          error_count: errorCount,
          total_categories: flattenedCategories.length,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          synced: syncedCount,
          errors: errorCount,
          total: flattenedCategories.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Foursquare API timeout after 8 seconds');
        
        await supabase.from('foursquare_api_logs').insert({
          endpoint: '/categories',
          response_status: 408,
          response_time_ms: 8000,
          cache_hit: false,
          error_message: 'Request timeout',
        });

        return new Response(
          JSON.stringify({ error: 'Foursquare API timeout', details: 'Request took longer than 8 seconds' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('Error in foursquare-sync-categories:', error);
    
    await supabase.from('foursquare_api_logs').insert({
      endpoint: '/categories',
      response_status: 500,
      response_time_ms: Date.now() - startTime,
      cache_hit: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
