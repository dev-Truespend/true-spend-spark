import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "@/shared/lib/observability/globalErrorHandlers";

// Capture async errors (event handlers, setTimeout callbacks, unhandled
// promise rejections) that bypass React's ErrorBoundary, and ship them
// to the log-collector Edge Function.
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD && import.meta.env.VITE_PWA_ENABLED === "true") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[PWA] Service worker registration failed:", error);
    });
  });
}
