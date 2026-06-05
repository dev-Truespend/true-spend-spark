import { View } from "react-native";
import { Redirect, Slot } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { TrialBanner } from "@/features/billing/components/TrialBanner";

export default function AppLayout() {
  const { session, isRestoring } = useAuth();

  if (isRestoring) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TrialBanner />
      <Slot />
    </View>
  );
}
