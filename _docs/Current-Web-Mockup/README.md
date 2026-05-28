# TrueSpend — UI Mockup

A clickable, navigable static HTML/CSS/JS mockup of the TrueSpend app, using the same brand
colors as `src/index.css` (brand-blue `218 91% 59%`, brand-purple `274 81% 56%`, brand-teal
`194 75% 37%`, plus the gradient-brand 135° blue→purple).

## How to use

Just open `index.html` in a browser. No build step, no server required.

```
open _docs/Current-Web-Mockup/index.html        # macOS
# or double-click the file in Finder
```

If you want clean URLs / live reload, serve the folder:

```
cd _docs/Current-Web-Mockup && python3 -m http.server 8000
# then open http://localhost:8000
```

## Pages

| File | Page |
|---|---|
| `index.html`        | Marketing landing — hero, features, privacy promise |
| `screens.html`      | Web screen inventory matching the mobile mockup flows |
| `features.html`     | Full feature grid |
| `pricing.html`      | Free / Pro / Family tiers |
| `about.html`        | About + stack |
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
├── screens.html        (all mobile mockup screens adapted for web)
├── features.html
├── pricing.html
├── about.html
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
- Tab switching: Settings sidebar
- Screen inventory filter: All / Phase 1 / Phase 2 / Phase 3
- Hover states on all cards & buttons
- Form submissions stay in the mockup; account entry is intentionally removed for now
