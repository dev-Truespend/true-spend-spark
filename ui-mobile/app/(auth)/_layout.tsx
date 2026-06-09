import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthLayout() {
  const { session, isRestoring } = useAuth();

  if (!isRestoring && session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </>
  );
}
