import { supabase } from "@/integrations/supabase/client";
import { measureAsync } from '@/lib/performance/performanceMonitor';

export interface DashboardData {
  transactions: any[];
  budgets: any[];
  alerts: any[];
  geofences: any[];
  patterns: any[];
  summary: {
    totalSpent: number;
    avgTransaction: number;
    transactionCount: number;
    activeBudgets: number;
    alertCount: number;
  };
  meta: {
    responseTime: string;
    cached: boolean;
  };
}

export interface TransactionInput {
  amount: number;
  category: string;
  description?: string;
  merchant_id?: string;
  location_lat?: number;
  location_lng?: number;
  timestamp?: string;
  idempotency_key?: string;
}

export interface CategorizationRequest {
  description: string;
  merchant_name?: string;
  amount?: number;
  location_type?: string;
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  merchant_normalized?: string;
  original_description: string;
}

export interface BFFError {
  code: string;
  message: string;
  correlationId?: string;
  details?: any;
}

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class BFFClient {
  private async call<T>(
    functionName: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any
  ): Promise<T> {
    return measureAsync(`bff-${functionName}`, async () => {
      const correlationId = generateCorrelationId();
      const requestId = crypto.randomUUID();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const requestPromise = supabase.functions.invoke(functionName, {
        body,
        method,
        headers: {
          'x-request-id': requestId,
          'x-correlation-id': correlationId,
        },
      });

      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (error) {
        const bffError: BFFError = {
          code: error.status?.toString() || 'UNKNOWN_ERROR',
          message: error.message || 'Request failed',
          correlationId,
          details: error,
        };
        throw new Error(bffError.message);
      }

      if (data && !data.ok && data.error) {
        throw new Error(data.error.message);
      }

      return data as T;
    });
  }

  async getDashboard(): Promise<DashboardData> {
    return this.call<DashboardData>('bff-dashboard');
  }

  async processTransaction(input: TransactionInput): Promise<{
    transaction: any;
    geofence_matched: boolean;
    rules_applied: number;
  }> {
    if (!input.idempotency_key) {
      input.idempotency_key = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    return this.call('process-transaction', 'POST', input);
  }

  async categorizeTransaction(input: CategorizationRequest): Promise<CategorizationResult> {
    return this.call<CategorizationResult>('ai-categorize-transaction', 'POST', input);
  }
}

export const bffClient = new BFFClient();
