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
| Primary CTA | "Get Started Free" → auth | **"Join early-access wishlist"** → email capture |
| Top of page | (none) | **Roadmap banner** — Phase 1 iOS/Android, Phase 2 browser extension, Phase 3 web app |
| Backend | Supabase + Edge Functions | None — pure static, optional form POST |

---

## File layout

```
static-website/
├── index.html       ← The whole site, one file
├── styles.css       ← Tiny supplement to Tailwind CDN
├── script.js        ← Wishlist form handler (vanilla JS)
├── vercel.json      ← Vercel routing + security headers
├── assets/          ← PNG images copied from src/assets
└── README.md        ← You are here
```

No `package.json`, no build step, no Node. Open `index.html` in a browser
and it works.

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

## Wire the wishlist form to a real backend

Right now form submissions are saved to `localStorage` so visitors get a
confirmation. To actually receive emails, edit `script.js`:

```js
const WISHLIST_ENDPOINT = "https://formspree.io/f/xxxxxxxx"; // or your endpoint
```

Any of these work — the form POSTs JSON with `{ email, platforms, referrer,
landing_path, user_agent, timestamp }`:

| Service | Setup time | Free tier |
|---|---|---|
| **[Formspree](https://formspree.io)** | 2 min | 50 submissions/month |
| **[Getform](https://getform.io)** | 2 min | 50 submissions/month |
| **[Resend Audiences](https://resend.com)** | 5 min | 100 emails/day |
| **Supabase Edge Function** | 10 min | 500k invocations/month |
| **Cloudflare Worker → Workers KV** | 10 min | 100k req/day |

### Supabase example (matches the main app stack)

Create a `wishlist_signups` table:

```sql
create table public.wishlist_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  platforms   text[],
  referrer    text,
  landing_path text,
  user_agent  text,
  created_at  timestamptz default now()
);
alter table public.wishlist_signups enable row level security;
-- only the service role can read; anyone can insert
create policy "anyone can join" on public.wishlist_signups
  for insert with check (true);
```

Create an Edge Function `wishlist-signup` that accepts the JSON payload and
inserts into the table. Set `WISHLIST_ENDPOINT` in `script.js` to its URL.

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
