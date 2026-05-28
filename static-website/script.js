/* ------------------------------------------------------------------ *
 * script.js
 *
 * Vanilla JS that powers the wishlist form. No framework, no bundle —
 * deployable as static files on Vercel.
 *
 * Backend: posts to /api/wishlist, a Vercel Serverless Function in
 * api/wishlist.js that adds the contact to a Resend Audience. Configure
 * RESEND_API_KEY and RESEND_AUDIENCE_ID in Vercel → Project Settings →
 * Environment Variables. See README.md for full setup.
 *
 * If the endpoint is unreachable (running locally without `vercel dev`,
 * or env vars not set), submissions fall back to localStorage so the
 * visitor still gets a confirmation.
 * ------------------------------------------------------------------ */

// Same-origin POST — works on Vercel, on `vercel dev`, on any host where
// /api/wishlist is mounted. Set this to a full URL if you ever host the
// static files and the API on different domains.
const WISHLIST_ENDPOINT = "/api/wishlist";

const STORAGE_KEY = "truespend.wishlist.local";

document.getElementById("copyrightYear").textContent = String(new Date().getFullYear());

const form = document.getElementById("wishlistForm");
const emailInput = document.getElementById("wishlistEmail");
const messageEl = document.getElementById("wishlistMessage");
const submitButton = form?.querySelector('button[type="submit"]');
const idleLabel = submitButton?.querySelector('[data-state="idle"]');
const loadingLabel = submitButton?.querySelector('[data-state="loading"]');

function setStatus(text, tone) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = "mt-4 min-h-[1.5em] text-sm " + (
    tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "error"   ? "text-red-600 dark:text-red-400" :
                         "text-muted-foreground"
  );
}

function setLoading(loading) {
  if (!submitButton || !idleLabel || !loadingLabel) return;
  submitButton.disabled = loading;
  idleLabel.classList.toggle("hidden", loading);
  loadingLabel.classList.toggle("hidden", !loading);
}

function isValidEmail(value) {
  // Pragmatic regex — good enough for client-side. Real validation happens server-side.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function saveLocally(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    existing.push({ ...payload, savedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
}

async function postToBackend(payload) {
  if (!WISHLIST_ENDPOINT) return { ok: false, skipped: true };
  try {
    const response = await fetch(WISHLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      message: data?.message ?? null,
      alreadyMember: Boolean(data?.already_member),
      error: response.ok ? null : data?.error ?? `HTTP ${response.status}`,
    };
  } catch (error) {
    return { ok: false, error: error?.message ?? "Network error" };
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = (emailInput?.value ?? "").trim();
  if (!isValidEmail(email)) {
    setStatus("That doesn't look like a valid email — give it another shot.", "error");
    emailInput?.focus();
    return;
  }

  const platforms = Array.from(
    form.querySelectorAll('input[name="platforms"]:checked'),
  ).map((node) => node.value);

  const payload = {
    email,
    platforms,
    referrer: document.referrer || null,
    landing_path: window.location.pathname,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  setLoading(true);
  setStatus("Saving your spot…");

  const result = await postToBackend(payload);
  saveLocally(payload); // always keep a local trace for analytics fallback

  setLoading(false);

  if (result.ok && result.alreadyMember) {
    setStatus("✓ You're already on the list — we've got you covered.", "success");
  } else if (result.ok) {
    setStatus(
      "✓ You're on the list! We'll email you the moment your platform is ready.",
      "success",
    );
  } else if (result.skipped) {
    // No endpoint configured at all (script edited locally to disable backend)
    setStatus("✓ You're on the list! (local mode — no backend configured)", "success");
  } else if (result.status === 503) {
    // Backend exists but env vars not set on Vercel
    setStatus(
      "Saved locally — backend isn't wired yet. (Admin: set RESEND_API_KEY in Vercel.)",
      "error",
    );
  } else {
    setStatus(
      "Saved locally — we'll retry sync next time. (" + (result.error ?? "network error") + ")",
      "error",
    );
  }

  // Reset the email input but keep the platform pills selected — most users
  // want to add a +1 to the same platforms.
  emailInput.value = "";
});
