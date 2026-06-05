import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export function useAuthGuard(redirectTo: string = "/(auth)/login") {
  const { session, isRestoring } = useAuth();
  useEffect(() => {
    if (!isRestoring && !session) {
      router.replace(redirectTo);
    }
  }, [session, isRestoring, redirectTo]);
}

export function useUnauthGuard(redirectTo: string = "/(app)/(tabs)") {
  const { session, isRestoring } = useAuth();
  useEffect(() => {
    if (!isRestoring && session) {
      router.replace(redirectTo);
    }
  }, [session, isRestoring, redirectTo]);
}
