import { createContext, useContext } from "react";

// True when the shared authenticated chrome (trial banner / sync / bell / back
// button) has already consumed the top safe area for the current route.
//
// We can't signal this by overriding `SafeAreaInsetsContext` (top: 0) because
// react-navigation re-provides the full native insets to every scene, which
// sits *below* our override in the tree — so `Screen` would re-apply the top
// inset and double-pad (the visible empty band under the chrome). This is our
// own context, which navigation does not touch, so it survives to the screen.
//
// Set by AuthenticatedChrome in app/(app)/_layout.tsx; read by Screen.tsx.
export const ChromeInsetContext = createContext(false);

export const useChromeActive = () => useContext(ChromeInsetContext);
