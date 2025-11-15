import { supabase } from "@/integrations/supabase/client";

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

class BFFClient {
  private async call<T>(
    functionName: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: any
  ): Promise<T> {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      method,
    });

    if (error) {
      console.error(`BFF ${functionName} error:`, error);
      throw new Error(error.message || 'Request failed');
    }

    return data as T;
  }

  async getDashboard(): Promise<DashboardData> {
    return this.call<DashboardData>('bff-dashboard');
  }

  async processTransaction(input: TransactionInput): Promise<{
    transaction: any;
    geofence_matched: boolean;
    rules_applied: number;
  }> {
    return this.call('process-transaction', 'POST', input);
  }

  async categorizeTransaction(input: CategorizationRequest): Promise<CategorizationResult> {
    return this.call<CategorizationResult>('ai-categorize-transaction', 'POST', input);
  }
}

export const bffClient = new BFFClient();