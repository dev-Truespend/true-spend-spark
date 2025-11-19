// Authenticated API client for extension
// Handles token management and automatic re-auth on 401

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
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
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired - trigger re-auth
      console.log('[API Client] Session expired, triggering re-auth');
      chrome.runtime.sendMessage({ type: 'AUTH_EXPIRED' });
      throw new Error('Session expired');
    }

    return response;
  } catch (error) {
    console.error('[API Client] Request failed:', error);
    throw error;
  }
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

  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}?${searchParams}`;
  
  const result = await chrome.storage.local.get('session');
  const session = result.session;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.status}`);
  }

  return response.json();
}
