/**
 * Database Client Factory with Read/Write Routing
 * Automatically routes reads to replica and writes to primary
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export type ConnectionType = 'primary' | 'replica' | 'auto';

interface DBClientOptions {
  type?: ConnectionType;
  fallback?: boolean;
  pooling?: boolean;
}

interface ConnectionHealth {
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

class DBClientFactory {
  private replicaHealth: ConnectionHealth = {
    healthy: true,
    lastCheck: Date.now(),
    consecutiveFailures: 0,
  };
  
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly CIRCUIT_BREAKER_RESET = 60000; // 1 minute

  /**
   * Create a database client with intelligent routing
   */
  async createClient(options: DBClientOptions = {}): Promise<SupabaseClient> {
    const {
      type = 'auto',
      fallback = true,
      pooling = true,
    } = options;

    // For explicit primary requests or if replica is unhealthy
    if (type === 'primary' || (type === 'auto' && !this.replicaHealth.healthy)) {
      return this.createPrimaryClient(pooling);
    }

    // For replica requests
    if (type === 'replica') {
      if (this.shouldUseReplica() && fallback) {
        try {
          const client = await this.createReplicaClient(pooling);
          await this.healthCheck(client);
          return client;
        } catch (error) {
          console.warn('[DBClientFactory] Replica connection failed, falling back to primary:', error);
          this.markReplicaUnhealthy();
          return this.createPrimaryClient(pooling);
        }
      } else if (this.shouldUseReplica()) {
        return this.createReplicaClient(pooling);
      }
    }

    // Default to primary for auto mode
    return this.createPrimaryClient(pooling);
  }

  /**
   * Create primary database client (for writes)
   */
  private createPrimaryClient(pooling: boolean): SupabaseClient {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const poolerUrl = pooling ? (Deno.env.get('SUPABASE_POOLER_URL') || supabaseUrl) : supabaseUrl;

    return createClient(poolerUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-connection-type': 'primary',
          'x-connection-pooling': pooling.toString(),
        },
      },
    });
  }

  /**
   * Create replica database client (for reads)
   */
  private createReplicaClient(pooling: boolean): SupabaseClient {
    const replicaUrl = Deno.env.get('SUPABASE_REPLICA_URL');
    const replicaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // If no replica configured, fall back to primary
    if (!replicaUrl) {
      console.warn('[DBClientFactory] No replica URL configured, using primary');
      return this.createPrimaryClient(pooling);
    }

    const poolerUrl = pooling ? (Deno.env.get('SUPABASE_REPLICA_POOLER_URL') || replicaUrl) : replicaUrl;

    return createClient(poolerUrl, replicaKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-connection-type': 'replica',
          'x-connection-pooling': pooling.toString(),
        },
      },
    });
  }

  /**
   * Check if replica should be used
   */
  private shouldUseReplica(): boolean {
    const now = Date.now();
    
    // If replica is marked unhealthy, check if we should reset
    if (!this.replicaHealth.healthy) {
      if (now - this.replicaHealth.lastCheck > this.CIRCUIT_BREAKER_RESET) {
        console.log('[DBClientFactory] Circuit breaker reset, attempting replica reconnection');
        this.replicaHealth.healthy = true;
        this.replicaHealth.consecutiveFailures = 0;
      }
      return false;
    }

    return true;
  }

  /**
   * Perform health check on replica
   */
  private async healthCheck(client: SupabaseClient): Promise<void> {
    try {
      const start = Date.now();
      const { error } = await client.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;

      if (error) {
        throw error;
      }

      // Mark as healthy if check succeeds
      this.replicaHealth.healthy = true;
      this.replicaHealth.consecutiveFailures = 0;
      this.replicaHealth.lastCheck = Date.now();

      // Log slow replica
      if (latency > 1000) {
        console.warn(`[DBClientFactory] Replica health check slow: ${latency}ms`);
      }
    } catch (error) {
      this.markReplicaUnhealthy();
      throw error;
    }
  }

  /**
   * Mark replica as unhealthy
   */
  private markReplicaUnhealthy(): void {
    this.replicaHealth.consecutiveFailures++;
    
    if (this.replicaHealth.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.replicaHealth.healthy = false;
      console.error('[DBClientFactory] Replica marked unhealthy after consecutive failures');
    }
    
    this.replicaHealth.lastCheck = Date.now();
  }

  /**
   * Get current replica health status
   */
  getReplicaHealth(): ConnectionHealth {
    return { ...this.replicaHealth };
  }

  /**
   * Log metrics for monitoring
   */
  async logMetrics(
    client: SupabaseClient,
    queryType: 'read' | 'write',
    latencyMs: number,
    connectionType: ConnectionType
  ): Promise<void> {
    try {
      await client.from('replica_metrics').insert({
        timestamp: new Date().toISOString(),
        query_type: queryType,
        connection_type: connectionType,
        latency_ms: latencyMs,
        replica_healthy: this.replicaHealth.healthy,
      });
    } catch (error) {
      // Don't fail the request if metrics logging fails
      console.warn('[DBClientFactory] Failed to log metrics:', error);
    }
  }
}

// Export singleton instance
export const dbClientFactory = new DBClientFactory();

/**
 * Helper function to create a client with the factory
 */
export async function createDBClient(options?: DBClientOptions): Promise<SupabaseClient> {
  return dbClientFactory.createClient(options);
}
