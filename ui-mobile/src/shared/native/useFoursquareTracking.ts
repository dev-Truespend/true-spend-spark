import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { startFoursquareTracking, stopFoursquareTracking } from "@/shared/native/foursquareTracking";

// Geofencing is plan-gated per workflow 13. Tracking only starts when the
// user is signed in AND the geofencing_enabled feature flag is granted on
// their current plan. If the flag flips off mid-session (downgrade, trial
// ended), tracking stops on the next render.
export function useFoursquareTracking(): void {
  const { session } = useAuth();
  const gate = useEntitlementGate();
  const userId = session?.user?.id ?? null;
  const geofencingEnabled = gate.has("geofencing_enabled");

  useEffect(() => {
    if (userId && geofencingEnabled) {
      void startFoursquareTracking(userId);
    } else {
      void stopFoursquareTracking();
    }
  }, [userId, geofencingEnabled]);
}
