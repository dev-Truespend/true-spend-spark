import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/providers/AuthProvider";
import { getRouteForBootstrap } from "@/features/auth/mappers/authRoute.mapper";

export default function AuthLayout() {
  const { session, bootstrap, isRestoring } = useAuth();

  if (!isRestoring && session) {
    if (!bootstrap) return null;
    return <Redirect href={getRouteForBootstrap(bootstrap)} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </>
  );
}
