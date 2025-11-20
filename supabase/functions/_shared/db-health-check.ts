/**
 * Database Health Check Utilities
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  timestamp: number;
  error?: string;
}

/**
 * Perform a health check on a database connection
 */
export async function checkDatabaseHealth(client: SupabaseClient): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const { error } = await client.from('profiles').select('id').limit(1);
    const latencyMs = Date.now() - start;

    if (error) {
      return {
        healthy: false,
        latencyMs,
        timestamp: Date.now(),
        error: error.message,
      };
    }

    return {
      healthy: true,
      latencyMs,
      timestamp: Date.now(),
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    return {
      healthy: false,
      latencyMs,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check replica lag
 */
export async function checkReplicaLag(
  primaryClient: SupabaseClient,
  replicaClient: SupabaseClient
): Promise<number | null> {
  try {
    // Query both for a recent timestamp
    const { data: primaryData } = await primaryClient
      .from('system_metrics')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const { data: replicaData } = await replicaClient
      .from('system_metrics')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!primaryData || !replicaData) {
      return null;
    }

    const primaryTime = new Date(primaryData.timestamp).getTime();
    const replicaTime = new Date(replicaData.timestamp).getTime();
    
    return Math.abs(primaryTime - replicaTime);
  } catch (error) {
    console.error('[HealthCheck] Failed to check replica lag:', error);
    return null;
  }
}
