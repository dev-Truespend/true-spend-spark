import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { startFoursquareTracking, stopFoursquareTracking } from "@/shared/native/foursquareTracking";

export function useFoursquareTracking(): void {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (userId) {
      void startFoursquareTracking(userId);
    } else {
      void stopFoursquareTracking();
    }
  }, [userId]);
}
