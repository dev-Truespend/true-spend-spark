export default {
  expo: {
    name: "TrueSpend",
    slug: "truespend",
    scheme: "truespend",
    ios: {
      bundleIdentifier: "com.truespend.mobile",
      infoPlist: {
        UIBackgroundModes: ["remote-notification", "location", "fetch"],
        NSLocationWhenInUseUsageDescription:
          "TrueSpend uses your location to recommend the best card at nearby merchants.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "TrueSpend uses your location in the background to alert you with the best card when you arrive at a known merchant.",
        NSLocationAlwaysUsageDescription:
          "TrueSpend uses your location in the background to alert you with the best card when you arrive at a known merchant."
      }
    },
    android: {
      package: "com.truespend.mobile",
      permissions: [
        "NOTIFICATIONS",
        "POST_NOTIFICATIONS",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    plugins: [
      [
        "expo-notifications",
        {
          color: "#3B82F6"
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "TrueSpend uses your location in the background to alert you with the best card when you arrive at a known merchant.",
          locationWhenInUsePermission:
            "TrueSpend uses your location to recommend the best card at nearby merchants.",
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: true
        }
      ],
      "react-native-plaid-link-sdk"
    ],
    notification: {
      iosDisplayInForeground: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:5000",
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      foursquareApiKey: process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY ?? "",
      plaidRedirectUri: process.env.EXPO_PUBLIC_PLAID_REDIRECT_URI ?? "",
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? ""
      }
    }
  }
};
