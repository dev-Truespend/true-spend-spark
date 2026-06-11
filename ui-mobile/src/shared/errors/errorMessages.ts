export const errorMessages = {
  unknown: "Something went wrong. Please try again.",
  network: "Network unavailable. Try again in a moment.",
  unauthorized: "Your session expired. Please sign in again.",
  forbidden: "You don't have access to that.",
  notFound: "We couldn't find that.",
  conflict: "That didn't go through. Please refresh and try again.",
  validation: "Some of the values you entered aren't valid.",
  server: "Our servers had a hiccup. Please try again shortly.",
  entitlement: "Upgrade your plan to use this feature.",
  // Feature-specific friendly copy — never expose raw provider/server text.
  plaid: "We couldn't connect your bank right now. Please try again in a moment.",
  billing: "We couldn't open billing right now. Please try again."
};

export type ErrorMessageKey = keyof typeof errorMessages;
