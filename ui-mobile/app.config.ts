const isDev = process.env.APP_ENV === "development";

export default {
  expo: {
    name: "TrueSpend",
    slug: "truespend",
    scheme: "truespend",
    icon: "./assets/icon.png",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.truespend.mobile",
      infoPlist: {
        UIBackgroundModes: ["remote-notification", "location", "fetch"],
        NSLocationWhenInUseUsageDescription:
          "TrueSpend uses your location to recommend the best card at nearby merchants.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "TrueSpend uses your location in the background to alert you with the best card when you arrive at a known merchant.",
        NSLocationAlwaysUsageDescription:
          "TrueSpend uses your location in the background to alert you with the best card when you arrive at a known merchant.",
        // Allow plain http://192.168.x.x for local dev. Production builds (APP_ENV!=development)
        // skip this and enforce HTTPS as iOS expects.
        ...(isDev && {
          NSAppTransportSecurity: {
            NSAllowsArbitraryLoads: true
          }
        })
      }
    },
    android: {
      package: "com.truespend.mobile",
      // Allow http://<LAN IP> traffic from the dev API + Supabase. Stripped from prod builds.
      usesCleartextTraffic: isDev,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#3D1AB8"
      },
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
        "expo-build-properties",
        {
          // Plaid SDK v11.x (native iOS pod) requires iOS 15.1+. Without this,
          // `expo prebuild --clean` resets the Podfile to iOS 13.4 and pod install
          // fails for react-native-plaid-link-sdk.
          ios: { deploymentTarget: "15.1" }
        }
      ],
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/logo-primary.png",
          backgroundColor: "#FFFFFF",
          resizeMode: "contain",
          imageWidth: 220
        }
      ],
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
      ]
      // "react-native-plaid-link-sdk" — re-add when ready to test Plaid Link.
      // v11.13.3 dist ships ESM-style imports without .js extensions, which break
      // `expo prebuild`'s Node-based plugin loader. Re-enable after upgrading the
      // SDK or applying a patch-package fix.
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
