// Authentication flow using Chrome Identity API and Supabase

export async function handleAuth() {
  try {
    console.log('[Auth] Starting OAuth flow');

    // Get redirect URL for extension
    const redirectURL = chrome.identity.getRedirectURL();
    console.log('[Auth] Redirect URL:', redirectURL);

    // Build Supabase OAuth URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const authUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
    
    authUrl.searchParams.set('provider', 'google');
    authUrl.searchParams.set('redirect_to', redirectURL);
    authUrl.searchParams.set('response_type', 'token');

    console.log('[Auth] Launching auth flow');

    // Launch OAuth flow
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        (callbackUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (callbackUrl) {
            resolve(callbackUrl);
          } else {
            reject(new Error('No callback URL received'));
          }
        }
      );
    });

    console.log('[Auth] OAuth callback received');

    // Parse tokens from callback URL
    const params = new URL(responseUrl).hash.substring(1);
    const urlParams = new URLSearchParams(params);
    
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');

    if (!accessToken) {
      throw new Error('No access token in callback');
    }

    // Store session
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn ? parseInt(expiresIn) : 3600,
      expires_at: Date.now() + (expiresIn ? parseInt(expiresIn) * 1000 : 3600000),
    };

    await chrome.storage.local.set({ session });
    console.log('[Auth] Session stored successfully');

    // Notify popup to refresh
    chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' });

    return { success: true };
  } catch (error) {
    console.error('[Auth] Authentication failed:', error);
    throw error;
  }
}

// Check if session is expired and refresh if needed
export async function refreshSessionIfNeeded() {
  try {
    const result = await chrome.storage.local.get('session');
    const session = result.session;

    if (!session) {
      return null;
    }

    // Check if token is expired or will expire in next 5 minutes
    if (session.expires_at && session.expires_at - Date.now() < 5 * 60 * 1000) {
      console.log('[Auth] Token expiring soon, refreshing...');

      if (!session.refresh_token) {
        console.log('[Auth] No refresh token, need to re-authenticate');
        return null;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            refresh_token: session.refresh_token,
          }),
        }
      );

      if (!response.ok) {
        console.error('[Auth] Token refresh failed');
        return null;
      }

      const data = await response.json();
      
      const newSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      await chrome.storage.local.set({ session: newSession });
      console.log('[Auth] Token refreshed successfully');

      return newSession;
    }

    return session;
  } catch (error) {
    console.error('[Auth] Session refresh failed:', error);
    return null;
  }
}
