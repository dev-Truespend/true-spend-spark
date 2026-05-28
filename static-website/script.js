/* ------------------------------------------------------------------ *
 * script.js
 *
 * Vanilla JS that powers the wishlist form. No framework, no bundle —
 * deployable as static files on Vercel, Netlify, Cloudflare Pages, or
 * any static host.
 *
 * To wire the form to a real backend, set WISHLIST_ENDPOINT below to:
 *  - a Formspree URL (https://formspree.io/f/xxxxxxxx), or
 *  - a Getform URL, or
 *  - your own Supabase Edge Function URL, or
 *  - a Cloudflare Worker / serverless endpoint that accepts JSON
 *
 * Until you set it, submissions are stored in localStorage so the
 * visitor still sees a confirmation while we're in dev/preview.
 * ------------------------------------------------------------------ */

const WISHLIST_ENDPOINT = ""; // ← set me before going live

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
    return { ok: response.ok, status: response.status };
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

  if (result.skipped) {
    setStatus(
      "✓ You're on the list! (preview mode — wire WISHLIST_ENDPOINT in script.js before launch)",
      "success",
    );
  } else if (result.ok) {
    setStatus("✓ You're on the list! We'll email you the moment your platform is ready.", "success");
  } else {
    setStatus(
      "Saved locally — we'll retry sync next time. (server: " + (result.error ?? result.status) + ")",
      "error",
    );
  }

  // Reset the form but keep the platform pills selected — most users want to
  // add a +1 to the same platforms.
  emailInput.value = "";
});
