import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Cache Gateway
 * Provides a REST API for cache operations (GET, SET, DELETE, INVALIDATE)
 * Uses Upstash Redis as L1 cache
 */

interface RedisCommand {
  command: string;
  args: (string | number | string[])[];
}

async function executeRedis<T>(commands: RedisCommand[]): Promise<T[]> {
  const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!redisUrl || !redisToken) {
    throw new Error('Redis credentials not configured');
  }

  const response = await fetch(`${redisUrl}/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands.map(cmd => [cmd.command, ...cmd.args])),
  });

  if (!response.ok) {
    throw new Error(`Redis error: ${response.statusText}`);
  }

  const results = await response.json();
  return results.map((r: any) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const operation = url.searchParams.get('op');
    const key = url.searchParams.get('key');

    if (!operation) {
      return new Response(JSON.stringify({ error: 'Missing operation parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (operation) {
      case 'get': {
        if (!key) {
          return new Response(JSON.stringify({ error: 'Missing key' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const [value] = await executeRedis<string>([
          { command: 'GET', args: [key] }
        ]);

        return new Response(JSON.stringify({
          key,
          value: value ? JSON.parse(value) : null,
          cached: !!value,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'set': {
        const body = await req.json();
        const { key, value, ttl } = body;

        if (!key || value === undefined) {
          return new Response(JSON.stringify({ error: 'Missing key or value' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const commands: RedisCommand[] = [
          { command: 'SET', args: [key, JSON.stringify(value)] }
        ];

        if (ttl) {
          commands.push({ command: 'EXPIRE', args: [key, ttl] });
        }

        await executeRedis(commands);

        return new Response(JSON.stringify({ success: true, key }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'del': {
        if (!key) {
          return new Response(JSON.stringify({ error: 'Missing key' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const [deleted] = await executeRedis<number>([
          { command: 'DEL', args: [key] }
        ]);

        return new Response(JSON.stringify({ success: true, deleted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'invalidate': {
        const pattern = url.searchParams.get('pattern');
        if (!pattern) {
          return new Response(JSON.stringify({ error: 'Missing pattern' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const [keys] = await executeRedis<string[]>([
          { command: 'KEYS', args: [pattern] }
        ]);

        if (keys && keys.length > 0) {
          await executeRedis(keys.map(k => ({ command: 'DEL', args: [k] })));
        }

        return new Response(JSON.stringify({
          success: true,
          invalidated: keys?.length || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Cache gateway error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
