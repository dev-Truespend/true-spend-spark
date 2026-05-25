# TrueSpend — Architecture & Traffic Flow Diagrams

All diagrams are Draw.io (`.drawio`) files. They render interactively on GitHub — just click the file.

---

## Diagrams

| File | What it covers |
|---|---|
| [01-combined-architecture.drawio](./01-combined-architecture.drawio) | All 4 platforms → shared Supabase backend. Full layer stack: CDN → Auth → BFF → Data → ML |
| [02-website-flow.drawio](./02-website-flow.drawio) | Website request flows: Login+MFA, Add Transaction, Plaid bank link, Receipt OCR |
| [03-extension-flow.drawio](./03-extension-flow.drawio) | Chrome extension: OAuth, merchant detection, popup budget check, what's still missing |
| [04-mobile-flow.drawio](./04-mobile-flow.drawio) | iOS/Android: app launch, background geofencing, camera OCR, push notifications |

---

## How to View

### On GitHub
Click any `.drawio` file — GitHub renders it as an interactive diagram in the browser.

### In VS Code (recommended for editing)
Install the free [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) extension.  
Open any `.drawio` file → full visual editor appears directly in VS Code.

### In the browser
Go to [app.diagrams.net](https://app.diagrams.net) → File → Open from → GitHub → navigate to this folder.

---

## Colour Key

| Colour | Meaning |
|---|---|
| 🟢 Green | Production — fully implemented |
| 🟡 Yellow | In progress — partially implemented |
| 🔴 Red | Not started — blocker or planned |
| 🔵 Blue | User / actor node |

---

## Editing

Open in [app.diagrams.net](https://app.diagrams.net) or VS Code Draw.io extension, make changes, save — the `.drawio` XML is updated in place. Commit and push as normal.
