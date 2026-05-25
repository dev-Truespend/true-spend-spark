// Authenticated API client for extension
// Handles token management and automatic re-auth on 401

import { logger } from './logger';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function authenticatedFetch(
  url: string, 
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Get session from chrome.storage
      const result = await chrome.storage.local.get('session');
      const session = result.session;

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'x-client-info': 'truespend-extension/1.0.0',
        ...fetchOptions.headers,
      };

      logger.apiRequest(url, fetchOptions.method || 'GET');

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      logger.apiResponse(url, response.status);

      if (response.status === 401) {
        // Token expired - trigger re-auth
        logger.warn('Session expired, triggering re-auth');
        chrome.runtime.sendMessage({ type: 'AUTH_EXPIRED' });
        throw new Error('Session expired');
      }

      // Success - return response
      if (response.ok) {
        return response;
      }

      // Server error - retry
      if (response.status >= 500 && attempt < retries) {
        logger.warn(`Server error ${response.status}, retry ${attempt}/${retries}`);
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      // Client error - don't retry
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Network error - retry if attempts remaining
      if (attempt < retries && (error instanceof TypeError || error.message === 'Failed to fetch')) {
        logger.warn(`Network error, retry ${attempt}/${retries}`, 'API', error);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      // All retries exhausted or non-retryable error
      logger.error(`Request failed after ${attempt} attempts`, 'API', lastError);
      throw lastError;
    }
  }

  throw lastError || new Error('Request failed');
}

// Helper for GET requests
export async function get<T = any>(url: string): Promise<T> {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Helper for POST requests
export async function post<T = any>(url: string, data: any): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Helper for Supabase REST API calls
export async function supabaseQuery<T = any>(
  table: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  const url = `${SUPABASE_URL}/rest/v1/${table}?${searchParams}`;

  const result = await chrome.storage.local.get('session');
  const session = result.session;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.status}`);
  }

  return response.json();
}
