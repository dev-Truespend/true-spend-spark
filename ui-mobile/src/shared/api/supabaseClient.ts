import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";
import { setSessionAccessor, setSessionRefresher } from "@/shared/api/interceptors";
import { supabaseSecureStorageAdapter } from "@/shared/storage/secureStorage";

// Supabase Auth owns provider authentication; TrueSpend APIs start after a
// valid Supabase session is in place. The Axios interceptor reads the access
// token through these accessors so it never imports anything from `features/`.
//
// Construction is deferred to first property access so test environments that
// import this module transitively don't trip Supabase's URL validation. By the
// time any caller touches `supabase.auth.*` in production, env has been loaded
// from `app.config.ts` via `expo-constants`.

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: supabaseSecureStorageAdapter,
      // Native OAuth uses the PKCE flow: signInWithOAuth stores a code verifier
      // in `storage`, the provider redirects back to truespend://verify?code=…,
      // and AuthProvider.handleAuthUrl exchanges that code for a session.
      flowType: "pkce"
    }
  });

  setSessionAccessor(async () => {
    const { data } = await cached!.auth.getSession();
    return data.session;
  });

  setSessionRefresher(async () => {
    const { data, error } = await cached!.auth.refreshSession();
    if (error) return null;
    return data.session;
  });

  return cached;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  }
});
