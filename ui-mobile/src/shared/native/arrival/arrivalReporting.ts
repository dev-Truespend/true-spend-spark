import { env } from "@/shared/config/env";
import { supabase } from "@/shared/api/supabaseClient";

// Shared background poster for the custom arrival paths (location task + native geofence task, 10a/item 8).
// No React/auth context runs in the background, so the Supabase session is read directly (it auto-refreshes)
// and the device JWT is sent raw. The server derives userId from the token and ignores any body identity.

export async function readBackgroundSession(): Promise<{ accessToken: string; userId: string } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    const userId = data.session?.user?.id ?? null;
    if (!accessToken || !userId) return null;
    return { accessToken, userId };
  } catch {
    return null;
  }
}

export async function postGeoEvent(accessToken: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${env.apiBaseUrl}/api/v1/geo/arrival`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
  } catch {
    // Best-effort: a dropped event just means no nudge / no session close this stop. The eventId is
    // stable per stop, so a later retry/foreground report dedups instead of double-acting.
  }
}
