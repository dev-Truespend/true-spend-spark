import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedisInfoResponse {
  result: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Redis INFO command via Upstash REST API
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!redisUrl || !redisToken) {
      return new Response(
        JSON.stringify({ error: 'Redis not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Redis INFO stats
    const infoResponse = await fetch(`${redisUrl}/INFO`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    });

    const infoData: RedisInfoResponse = await infoResponse.json();
    const infoText = infoData.result;

    // Parse Redis INFO output
    const parseInfo = (text: string): Record<string, string> => {
      const lines = text.split('\n');
      const info: Record<string, string> = {};
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          info[key.trim()] = value.trim();
        }
      }
      
      return info;
    };

    const info = parseInfo(infoText);

    // Calculate metrics
    const keyspaceHits = parseInt(info.keyspace_hits || '0');
    const keyspaceMisses = parseInt(info.keyspace_misses || '0');
    const totalRequests = keyspaceHits + keyspaceMisses;
    const hitRate = totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0;

    // Memory usage in MB
    const usedMemory = parseInt(info.used_memory || '0');
    const memoryUsageMB = usedMemory / (1024 * 1024);

    // Calculate quota (Upstash free tier is 256MB)
    const maxMemoryMB = 256;
    const quotaRemaining = ((maxMemoryMB - memoryUsageMB) / maxMemoryMB) * 100;

    // Estimate average latency (simplified - actual would require tracking)
    const avgLatency = 2.5; // Redis typically < 5ms for Upstash

    const metrics = {
      hitRate,
      totalRequests,
      memoryUsage: memoryUsageMB,
      avgLatency,
      quotaRemaining: Math.max(0, quotaRemaining),
      raw: {
        keyspaceHits,
        keyspaceMisses,
        usedMemory,
        connectedClients: parseInt(info.connected_clients || '0'),
        totalCommandsProcessed: parseInt(info.total_commands_processed || '0'),
      },
    };

    console.log('Redis metrics:', metrics);

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Redis metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
