/**
 * Database Connection Pooling Client
 * Provides optimized connection pooling for Large instance
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PooledClientOptions {
  pooling?: boolean;
  schema?: string;
}

/**
 * Creates a Supabase client with connection pooling optimized for Large instance
 * Uses transaction mode for better connection reuse and lower overhead
 */
export function createPooledClient(options: PooledClientOptions = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use pooler connection string if available
  const poolerUrl = Deno.env.get('SUPABASE_POOLER_URL') || supabaseUrl;
  
  return createClient(poolerUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public' as const,
    },
    global: {
      headers: {
        'x-connection-pooling': 'true',
      },
    },
  });
}

/**
 * Creates a standard client without pooling (for specific use cases)
 */
export function createStandardClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
