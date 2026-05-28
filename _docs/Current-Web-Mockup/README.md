# TrueSpend — UI Mockup

A clickable, navigable static HTML/CSS/JS mockup of the TrueSpend app, using the same brand
colors as `src/index.css` (brand-blue `218 91% 59%`, brand-purple `274 81% 56%`, brand-teal
`194 75% 37%`, plus the gradient-brand 135° blue→purple).

## How to use

Just open `index.html` in a browser. No build step, no server required.

```
open _docs/index.html        # macOS
# or double-click the file in Finder
```

If you want clean URLs / live reload, serve the folder:

```
cd _docs && python3 -m http.server 8000
# then open http://localhost:8000
```

## Pages

| File | Page |
|---|---|
| `index.html`        | Marketing landing — hero, features, privacy promise |
| `features.html`     | Full feature grid |
| `pricing.html`      | Free / Pro / Family tiers |
| `about.html`        | About + stack |
| `auth.html`         | Sign in / sign up split view (tabbed) |
| `dashboard.html`    | User dashboard — metric tiles, recent activity, budgets, cards, bills, explore grid |
| `transactions.html` | Filterable transaction list + Add modal |
| `budgets.html`      | Budget cards with progress bars + Create modal |
| `credit-cards.html` | Connected card grid + Plaid link modal |
| `insights.html`     | AI insights — bar chart, analysis blocks, forecast |
| `location.html`     | Geofence map placeholder + active zones + top places |
| `favorites.html`    | Favorite merchants grid |
| `settings.html`     | Tabbed settings (profile, security, notifications, billing, data) |
| `admin.html`        | Internal admin — sidebar nav, phase status, SLO, incidents |

## Files

```
_docs/
├── index.html          (marketing)
├── features.html
├── pricing.html
├── about.html
├── auth.html
├── dashboard.html      (app)
├── transactions.html
├── budgets.html
├── credit-cards.html
├── insights.html
├── location.html
├── favorites.html
├── settings.html
├── admin.html
├── css/style.css       (all styles, brand tokens at top)
├── js/app.js           (shared nav + modals + tabs)
└── README.md
```

The shared top nav and footer are injected by `js/app.js` based on whether the current page is a
marketing page or an app page. Click any link in the nav, footer, or feature card to navigate.

## What's interactive

- Top nav links (highlights the active page)
- Modals: Add transaction, New budget, Link card (Plaid), New geofence, Delete account
- Tab switching: Sign in / Sign up, Settings sidebar
- Hover states on all cards & buttons
- Form submissions navigate to the dashboard (no real auth)
