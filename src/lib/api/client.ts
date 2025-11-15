/**
 * API Client with Validation and Rate Limiting
 * Phase 2: Security & Ingress - Layer 3 (API Gateway)
 */

import { supabase } from '@/integrations/supabase/client';
import {
  fetchWithRateLimit,
  retryWithBackoff,
  saveRateLimitState,
  parseRateLimitHeaders,
} from './rateLimiter';

export interface ApiOptions extends RequestInit {
  retry?: boolean;
  maxRetries?: number;
  endpoint?: string;
}

/**
 * Enhanced API client with rate limiting and retry logic
 */
export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
  }

  /**
   * Make an authenticated request with rate limiting
   */
  async request<T>(
    path: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const {
      retry = true,
      maxRetries = 3,
      endpoint = path,
      ...fetchOptions
    } = options;

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(fetchOptions.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    headers.set('X-Client-Version', '3.1.1');

    const url = `${this.baseUrl}/functions/v1/${path}`;

    const makeRequest = async () => {
      const response = await fetchWithRateLimit(url, {
        ...fetchOptions,
        headers,
      });

      // Update rate limit state
      const rateLimitInfo = parseRateLimitHeaders(response);
      if (rateLimitInfo) {
        saveRateLimitState({
          isRateLimited: rateLimitInfo.remaining === 0,
          rateLimitInfo,
          retryAfter: rateLimitInfo.retryAfter || null,
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed: ${response.statusText}`);
      }

      return response.json();
    };

    if (retry) {
      return retryWithBackoff(makeRequest, maxRetries);
    }

    return makeRequest();
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, data: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
