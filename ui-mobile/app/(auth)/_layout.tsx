import { Redirect, Slot } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthLayout() {
  const { session, isRestoring } = useAuth();

  if (!isRestoring && session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Slot />;
}
