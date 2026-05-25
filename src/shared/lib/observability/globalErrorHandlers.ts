/**
 * Install global window-level error handlers that ship to log-collector.
 *
 * React's ErrorBoundary only catches render-phase errors inside the React
 * tree. Anything else — `await` chains in event handlers, third-party
 * library callbacks, `setTimeout`, fetch abort errors — bubbles to
 * `window.onerror` or `unhandledrejection`. Without this hook those
 * errors are silently lost.
 *
 * Install once at app bootstrap (App.tsx). Safe to call multiple times;
 * subsequent calls are no-ops thanks to the `installed` guard.
 */

let installed = false;

interface LogPayload {
  level:       "error" | "critical";
  component:   string;
  message:     string;
  stack_trace?: string;
  request_id:  string;
  user_agent:  string;
  metadata:    Record<string, unknown>;
}

function shipToLogCollector(payload: LogPayload): void {
  const url    = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !apikey) return; // dev env without supabase set up

  // Fire-and-forget — logging must never break the app.
  // `keepalive: true` ensures the request finishes even if the user
  // navigates away (e.g. error happened during unload).
  fetch(`${url}/functions/v1/log-collector`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey,
      "x-request-id": payload.request_id,
    },
    body:      JSON.stringify(payload),
    keepalive: true,
  }).catch(() => { /* swallow */ });
}

/**
 * Some errors are noise we don't want to flood the log-collector with.
 * Returns true if the error should be DROPPED.
 */
function isIgnorable(message: string): boolean {
  if (!message) return true;

  // ResizeObserver loop limit exceeded — benign browser warning fired
  // by chart libs etc. Not actionable.
  if (message.includes("ResizeObserver loop")) return true;

  // Common cancellation patterns
  if (/AbortError/i.test(message)) return true;
  if (/cancell?ed/i.test(message) && /load|request/i.test(message)) return true;

  // Browser extension noise
  if (/Non-Error promise rejection captured/.test(message)) return true;

  return false;
}

export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    const message = event.message ?? "Unknown error";
    if (isIgnorable(message)) return;

    shipToLogCollector({
      level:       "error",
      component:   "window.onerror",
      message,
      stack_trace: event.error?.stack,
      request_id:  crypto.randomUUID(),
      user_agent:  navigator.userAgent,
      metadata: {
        filename: event.filename,
        lineno:   event.lineno,
        colno:    event.colno,
        route:    window.location.pathname,
      },
    });
  });

  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const reason  = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";

      if (isIgnorable(message)) return;

      shipToLogCollector({
        level:       "error",
        component:   "unhandledrejection",
        message,
        stack_trace: reason instanceof Error ? reason.stack : undefined,
        request_id:  crypto.randomUUID(),
        user_agent:  navigator.userAgent,
        metadata: {
          route:        window.location.pathname,
          reason_type:  reason?.constructor?.name ?? typeof reason,
        },
      });
    }
  );
}
