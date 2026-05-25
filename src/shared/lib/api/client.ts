/**
 * API Client with Validation and Rate Limiting
 * Phase 2: Security & Ingress - Layer 3 (API Gateway)
 * Phase 10: Enhanced with structured logging
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
      const startTime = performance.now();
      
      try {
        const response = await fetchWithRateLimit(url, {
          ...fetchOptions,
          headers,
        });

        const duration = Math.round(performance.now() - startTime);

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
          
          // Log API error
          supabase.functions.invoke('log-collector', {
            body: {
              level: 'error',
              message: `API request failed: ${path}`,
              component: 'ApiClient',
              metadata: {
                endpoint: path,
                method: fetchOptions.method || 'GET',
                status_code: response.status,
                duration_ms: duration,
                error_message: error.message || response.statusText,
              },
              timestamp: new Date().toISOString(),
            },
          }).catch(() => {}); // Silent failure for logging

          throw new Error(error.message || `Request failed: ${response.statusText}`);
        }

        // Log successful API request (debug level)
        if (import.meta.env.DEV) {
          supabase.functions.invoke('log-collector', {
            body: {
              level: 'debug',
              message: `API request successful: ${path}`,
              component: 'ApiClient',
              metadata: {
                endpoint: path,
                method: fetchOptions.method || 'GET',
                status_code: response.status,
                duration_ms: duration,
              },
              timestamp: new Date().toISOString(),
            },
          }).catch(() => {});
        }

        return response.json();
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        
        // Log API error
        supabase.functions.invoke('log-collector', {
          body: {
            level: 'error',
            message: `API request exception: ${path}`,
            component: 'ApiClient',
            metadata: {
              endpoint: path,
              method: fetchOptions.method || 'GET',
              duration_ms: duration,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: new Date().toISOString(),
          },
        }).catch(() => {});

        throw error;
      }
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
