const isDev = process.env.APP_ENV === "development";

export default {
  expo: {
    name: "TrueSpend",
    slug: "truespend",
    owner: "truespend",
    scheme: "truespend",
    icon: "./assets/icon.png",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.truespend.mobile",
      // Enables the native "Sign in with Apple" sheet (expo-apple-authentication).
      usesAppleSignIn: true,
      // Export-compliance: sets ITSAppUsesNonExemptEncryption=false in Info.plist so App Store
      // Connect stops asking the encryption question on every TestFlight build. Valid because the
      // app only uses standard/exempt encryption (HTTPS/TLS, Supabase, SHA-256 nonces). If we ever
      // add proprietary/non-standard crypto, flip this and file the export documentation instead.
      config: {
        usesNonExemptEncryption: false
      },
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
      // react-native-maps on Android renders Google Maps and needs an API key.
      // Set GOOGLE_MAPS_ANDROID_API_KEY in the build env. iOS uses Apple Maps
      // (PROVIDER_DEFAULT) and needs no key.
      ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY && {
        config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } }
      }),
      permissions: [
        "NOTIFICATIONS",
        "POST_NOTIFICATIONS",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        // Required for the geo-arrival background location foreground-service (10a, Android 14+).
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
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
      // Adds `:modular_headers => true` for GoogleSignIn 9.x's non-modular Obj-C deps so static
      // linking works. Must run after expo-build-properties so the Podfile already exists.
      "./plugins/withGoogleSignInModularHeaders",
      "expo-font",
      [
        "expo-splash-screen",
        {
          // Brand icon on the deep-indigo launch background (matches the start of
          // gradients.launch), so the native launch screen flows seamlessly into
          // the animated JS SplashScreen — no white flash on cold start.
          // NOTE: changing this requires `npx expo prebuild` + a native rebuild.
          image: "./assets/icon.png",
          backgroundColor: "#2A0F66",
          resizeMode: "contain",
          imageWidth: 160
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
      ],
      "expo-apple-authentication",
      [
        // Native Google sign-in. iosUrlScheme is the REVERSED iOS client ID
        // (com.googleusercontent.apps.XXXXXX) from Google Cloud — set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
        // in the build env. Requires a native rebuild after changing.
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
            "com.googleusercontent.apps.596743529668-217kaknr4vmq29497d45ma8a56fl7195"
        }
      ],
      [
        // Crash + error reporting (Sentry). Uploads dSYMs + Hermes source maps at EAS build time so JS
        // and native crashes arrive symbolicated, with the screen + breadcrumbs. Reads SENTRY_AUTH_TOKEN
        // from the build env (set it as an EAS secret); org/project are passed here.
        "@sentry/react-native/expo",
        {
          organization: "truespend",
          project: "truespend-mobile"
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
      // Sentry DSN is a public client key (ships in the binary) — safe to default here, like the Google
      // client IDs below. appEnv is captured at config-eval time so the runtime can tag the Sentry
      // environment (APP_ENV is not an EXPO_PUBLIC_ var, so it isn't otherwise inlined into the bundle).
      sentryDsn:
        process.env.EXPO_PUBLIC_SENTRY_DSN ??
        "https://2e942b37b09311955fec818a5871317e@o4511570587877376.ingest.us.sentry.io/4511570605834240",
      appEnv: process.env.APP_ENV ?? "development",
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      foursquareApiKey: process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY ?? "",
      geoProvider: process.env.EXPO_PUBLIC_GEO_PROVIDER ?? "auto",
      foursquareMovementKey: process.env.EXPO_PUBLIC_FOURSQUARE_MOVEMENT_KEY ?? "",
      plaidRedirectUri: process.env.EXPO_PUBLIC_PLAID_REDIRECT_URI ?? "",
      // Google OAuth client IDs are public (they ship in the binary) — safe to default here, like the
      // EAS projectId above. Override via env for other Google projects. Web ID must match Supabase's
      // Google provider config.
      googleWebClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
        "596743529668-51pgs30coqiacumiiemh5flb847e7839.apps.googleusercontent.com",
      googleIosClientId:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
        "596743529668-217kaknr4vmq29497d45ma8a56fl7195.apps.googleusercontent.com",
      eas: {
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
          "6ceb2b60-2dec-4de4-9d83-f9b46c032775"
      }
    }
  }
};
