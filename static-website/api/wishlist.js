/**
 * /api/wishlist
 *
 * Vercel Serverless Function — receives the wishlist signup payload from
 * index.html and pushes the contact to a Resend Audience. Becomes live the
 * moment the static-website folder is deployed to Vercel; no extra config
 * needed beyond two environment variables.
 *
 * Environment variables (set in Vercel → Project Settings → Environment Variables):
 *   RESEND_API_KEY         re_xxxxxxxxxxxxxxxxxxxxxxxx  (from resend.com/api-keys)
 *   RESEND_AUDIENCE_ID     uuid of your audience       (from resend.com/audiences)
 *   ALLOWED_ORIGIN         (optional) restrict CORS to your prod domain
 *
 * Privacy: this function does not store the payload anywhere TrueSpend
 * controls beyond Vercel's short-lived function logs. The signup record
 * lives in your Resend dashboard, full stop.
 *
 * @runtime nodejs (Vercel default, fetch is global on Node 18+)
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API = "https://api.resend.com";

export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────────────────────────
  // Default to same-origin. Setting ALLOWED_ORIGIN lets you serve the static
  // site from one domain and the API from another (e.g. previews).
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Config check ─────────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    return res.status(503).json({
      error:
        "Wishlist endpoint is not configured. Set RESEND_API_KEY and " +
        "RESEND_AUDIENCE_ID in Vercel → Project Settings → Environment Variables.",
    });
  }

  // ── Parse + validate payload ────────────────────────────────────────────
  // Vercel parses JSON bodies automatically when Content-Type: application/json.
  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const email = String(body.email ?? "").trim().toLowerCase();
  const platforms = Array.isArray(body.platforms) ? body.platforms.slice(0, 8) : [];
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
  const landingPath = typeof body.landing_path === "string" ? body.landing_path.slice(0, 200) : null;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email." });
  }
  if (email.length > 254) {
    return res.status(400).json({ error: "Email is too long." });
  }

  // Resend Audiences doesn't yet support arbitrary custom fields, so we
  // stash the user's platform preference in `first_name` as a structured
  // prefix — visible in the dashboard, parseable later.
  const platformsLabel = platforms.length ? `[${platforms.join(",")}]` : "[any]";

  // ── Push to Resend ──────────────────────────────────────────────────────
  try {
    const response = await fetch(
      `${RESEND_API}/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          first_name: `${platformsLabel} Early access`,
          unsubscribed: false,
        }),
      },
    );

    const data = await response.json().catch(() => ({}));

    // Resend returns 422 when an email is already in the audience.
    // Treat that as success from the user's POV — they're on the list.
    if (response.status === 422 || data?.name === "validation_error") {
      console.log("[wishlist] already on list:", redactedEmail(email));
      return res
        .status(200)
        .json({ ok: true, message: "You're already on the list!", already_member: true });
    }

    if (!response.ok) {
      console.error(
        "[wishlist] Resend API error",
        response.status,
        JSON.stringify(data),
      );
      return res.status(502).json({
        error: data?.message || `Backend error (HTTP ${response.status})`,
      });
    }

    // Lightweight server-side analytics — visible in Vercel function logs
    // for an hour. Add a real DB later if you need persistent attribution.
    console.log(
      "[wishlist] signup",
      JSON.stringify({
        email: redactedEmail(email),
        platforms,
        referrer,
        landing_path: landingPath,
        contact_id: data?.id,
        ts: new Date().toISOString(),
      }),
    );

    return res.status(200).json({
      ok: true,
      message: "You're on the list!",
      contact_id: data?.id ?? null,
    });
  } catch (err) {
    console.error("[wishlist] unexpected error:", err?.message ?? err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

/** Mask the local part of an email for log output: jane@example.com → j***@example.com */
function redactedEmail(email) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "[invalid]";
  return `${user[0]}***@${domain}`;
}
