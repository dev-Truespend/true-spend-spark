# TrueSpend — Static Landing Site

A single-page, **zero-build** marketing site for TrueSpend. Deploys to Vercel
(or Netlify, Cloudflare Pages, GitHub Pages, S3 + CloudFront, etc.) in under
a minute.

Designed to match the brand of the main app 1:1 — same Inter font, same
brand-blue → brand-purple → brand-teal gradient, same shadows and curves.

---

## What's different from the main app

| Element | Main app | This static site |
|---|---|---|
| Sign-in / sign-up | `/auth` route + Supabase | **Removed entirely** |
| Primary CTA | "Get Started Free" → auth | **"Join early-access wishlist"** → Resend Audience signup |
| Top of page | (none) | **Roadmap banner** — Phase 1 iOS/Android, Phase 2 browser extension, Phase 3 web app |
| Backend | Supabase + many Edge Functions | One Vercel Serverless Function (`api/wishlist.js`) → Resend |

---

## File layout

```
static-website/
├── index.html       ← The whole site, one file
├── styles.css       ← Tiny supplement to Tailwind CDN
├── script.js        ← Wishlist form handler (vanilla JS)
├── api/
│   └── wishlist.js  ← Vercel Serverless Function → Resend Audiences
├── vercel.json      ← Routing + security headers
├── assets/          ← PNG images copied from src/assets
└── README.md        ← You are here
```

No build step. Open `index.html` in a browser and the page works
(form falls back to localStorage). Deploy to Vercel and the form becomes
fully live once you set `RESEND_API_KEY` + `RESEND_AUDIENCE_ID` env vars.

---

## Deploy in 60 seconds

### Vercel (recommended)

```bash
cd static-website
npx vercel        # first time: log in and link
npx vercel --prod # deploy
```

Or via the dashboard:
1. Push this folder to a repo (or a subfolder of a repo)
2. https://vercel.com/new → import the repo
3. Set **Root Directory** to `static-website`
4. **Framework Preset**: "Other"
5. Hit deploy. Done.

### Netlify

```bash
cd static-website
npx netlify-cli deploy --prod --dir=.
```

### Cloudflare Pages

```bash
cd static-website
npx wrangler pages deploy .
```

### Anywhere else

Upload every file in this folder to your static host's webroot. That's it.

---

## How the wishlist signup works

`index.html` → `script.js` → `POST /api/wishlist` → `api/wishlist.js`
(Vercel Serverless Function) → Resend Audiences API.

The contact lands in your Resend audience with their email + a structured
prefix in `first_name` showing which platform they want first:
`[ios,android] Early access`.

### One-time Resend setup (~3 minutes)

1. Go to **https://resend.com** and sign up (free tier covers 100 emails/day
   and 3,000 contacts — plenty for an early-access wishlist).
2. Verify your sending domain at **resend.com/domains** (skip if you'll only
   use Resend for the contact list — domain verification is only needed when
   you start *sending* broadcasts).
3. Create an audience at **resend.com/audiences** → "Add audience" → name it
   e.g. "TrueSpend wishlist" → copy the **audience ID** (a UUID).
4. Create an API key at **resend.com/api-keys** → "Create API key" → Full
   Access → copy the key (starts with `re_`).

### Tell Vercel about them

In Vercel → your project → **Settings → Environment Variables**, add:

| Key | Value | Environments |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxxxxxxxxxx` | Production, Preview |
| `RESEND_AUDIENCE_ID` | `aud_xxxxx-xxxxx-xxxxx` (the UUID) | Production, Preview |
| `ALLOWED_ORIGIN` *(optional)* | `https://truespend.org` | Production |

Click **Save**, then redeploy (Vercel → Deployments → "..." → Redeploy) so
the function picks up the new env. From then on, every form submission
silently adds the contact to your Resend audience.

### Local dev with the API

The static `npm run dev` command serves files but doesn't run the API
function. To test the form locally with a real backend, install the Vercel
CLI and use `vercel dev`:

```bash
npx vercel link            # one-time, link to your Vercel project
npx vercel env pull        # pulls your env vars into .env.local
npx vercel dev             # runs static + /api on http://localhost:3000
```

### Don't want Resend?

The function is ~120 lines and easy to swap. The relevant fetch call in
`api/wishlist.js` is the one to `https://api.resend.com/audiences/.../contacts`.
Replace with a call to:

- **Formspree** → POST `https://formspree.io/f/xxxxxxxx`
- **Supabase** → insert into a `wishlist_signups` table via supabase-js
- **Cloudflare Worker KV** → put email into a namespace
- **SendGrid Marketing Contacts** → PUT `https://api.sendgrid.com/v3/marketing/contacts`

The shape of the JSON payload from the frontend never changes; only the
function body does.

---

## Editing the design

Brand tokens live in `index.html` inside the `tailwind.config = {...}`
block. Match them to the main app's `src/index.css`:

```js
brand: {
  blue:   "hsl(218 91% 59%)",
  purple: "hsl(274 81% 56%)",
  teal:   "hsl(194 75% 37%)",
}
```

If you change brand colors in the main app, change them here too.

---

## Updating the roadmap banner

The "We're shipping in phases" announcement is the first element inside
`<body>` in `index.html`. The current visual state assumes **Phase 1 is in
progress**. When you ship Phase 1 and start Phase 2, swap the active styling
to the Phase 2 chip:

```html
<!-- Currently: -->
<span class="... bg-white/20 ...">Phase 1 · iOS &amp; Android apps</span>
<span class="... bg-white/10 ...">Phase 2 · Browser extension</span>

<!-- Update to: -->
<span class="... bg-white/10 ...">Phase 1 · ✅ Shipped</span>
<span class="... bg-white/20 ...">Phase 2 · Browser extension</span>
```

The full roadmap section near the bottom should be updated to match.

---

## Privacy / data handling

- **No third-party trackers** — no Google Analytics, no Hotjar, no Meta Pixel.
  Add them only if you have an explicit privacy/compliance need.
- **Email addresses** entered in the form go only to your configured endpoint.
- **localStorage fallback** holds a copy in the user's browser. Clear via:
  `localStorage.removeItem('truespend.wishlist.local')`.

---

## Performance

- One HTML file, ~24 KB
- Tailwind Play CDN runs entirely in the browser (no server round-trip)
- Inter font loaded with `display=swap` to avoid FOIT
- All images are lazy-loaded below the fold
- Lighthouse should report **100 Performance / 100 Accessibility / 100 SEO**
  on first load

If you want to drop the Tailwind CDN in favor of a precompiled bundle later
(saves ~70 KB JS), run `npx tailwindcss -i input.css -o tailwind.css --minify`
with a real `tailwind.config.js` and swap the `<script>` tag for a `<link>`.

---

## License

This static site reuses TrueSpend brand assets and is governed by the same
license as the main repo.
