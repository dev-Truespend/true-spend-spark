import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import {
  startArrivalTracking,
  stopArrivalTracking
} from "@/shared/native/arrival/arrivalDetectionClient";
import { registerSelectedArrivalClient } from "@/shared/native/arrival/selectArrivalProvider";

// Provider-neutral geo-arrival detection (10a). Generalizes the former useFoursquareTracking: the
// selector registers exactly one client (foursquare | custom) once at bootstrap, then tracking starts
// only when the user is signed in AND geofencing_enabled is granted (workflow 13). If the flag flips
// off mid-session (downgrade, trial ended), tracking stops on the next render.
export function useArrivalDetection(): void {
  const { session } = useAuth();
  const gate = useEntitlementGate();
  const userId = session?.user?.id ?? null;
  const geofencingEnabled = gate.has("geofencing_enabled");

  useEffect(() => {
    registerSelectedArrivalClient();
  }, []);

  useEffect(() => {
    if (userId && geofencingEnabled) {
      void startArrivalTracking(userId);
    } else {
      void stopArrivalTracking();
    }
  }, [userId, geofencingEnabled]);
}
