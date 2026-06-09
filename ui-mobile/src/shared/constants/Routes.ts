export const Routes = {
  Splash: "/",
  SignIn: "/(auth)/login",
  Otp: "/(auth)/verify",
  Wallet: "/(app)/(tabs)",
  Insights: "/(app)/(tabs)/insights",
  Profile: "/(app)/(tabs)/profile",
  EditProfile: "/(app)/profile/edit",
  Onboarding: "/(app)/onboarding"
} as const;
