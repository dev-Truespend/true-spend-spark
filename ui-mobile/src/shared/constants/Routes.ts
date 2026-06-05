export const Routes = {
  Splash: "/",
  SignIn: "/(auth)/login",
  Otp: "/(auth)/verify",
  Home: "/(app)/(tabs)",
  Cards: "/(app)/(tabs)/cards",
  Insights: "/(app)/(tabs)/insights",
  Profile: "/(app)/(tabs)/profile",
  EditProfile: "/(app)/profile/edit",
  Onboarding: "/(app)/onboarding"
} as const;
