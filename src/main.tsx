import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "@/shared/lib/observability/globalErrorHandlers";

// Capture async errors (event handlers, setTimeout callbacks, unhandled
// promise rejections) that bypass React's ErrorBoundary, and ship them
// to the log-collector Edge Function.
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
