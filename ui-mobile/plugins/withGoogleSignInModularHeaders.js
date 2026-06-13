const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// GoogleSignIn 9.x (required for native Google sign-in's nonce method) pulls in AppCheckCore, a Swift
// pod that depends on the Obj-C pods GoogleUtilities + RecaptchaInterop. Those don't define modules, so
// under static-library linking CocoaPods fails: "Swift pods cannot yet be integrated as static
// libraries". The fix is `:modular_headers => true` for those Obj-C deps so they generate module maps.
//
// expo-build-properties `ios.extraPods` would normally do this, but Expo SDK 51's Podfile template
// doesn't read `apple.extraPods` (52+ only) — so inject the pod lines into the Podfile directly.
// On Expo 52+ this plugin can be dropped in favour of extraPods.
const MODULAR_HEADER_PODS = ["GoogleUtilities", "RecaptchaInterop"];
const ANCHOR = "use_expo_modules!";

module.exports = function withGoogleSignInModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      const contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(":modular_headers => true")) return cfg; // idempotent
      const podLines = MODULAR_HEADER_PODS.map(
        (name) => `  pod '${name}', :modular_headers => true`
      ).join("\n");
      fs.writeFileSync(podfilePath, contents.replace(ANCHOR, `${ANCHOR}\n${podLines}`));
      return cfg;
    }
  ]);
};
