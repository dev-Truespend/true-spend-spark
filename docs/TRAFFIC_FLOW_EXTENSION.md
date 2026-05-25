# TrueSpend — Browser Extension Traffic Flow

> **Platform:** Chrome Extension · Manifest V3 · Service Worker  
> **Phase:** 11 (30% complete — scaffold done, capture & sync pending)  
> **Location:** `extension/`

---

## 1. Extension Architecture Overview

```mermaid
flowchart TD
    subgraph Browser ["Chrome Browser"]
        subgraph Pages ["Web Pages (any site)"]
            CS["Content Script\nmerchant-detector.ts\n(injected on every page)"]
        end

        subgraph Popup ["Extension Popup\npopup/Popup.tsx"]
            PUI["Budget display\nQuick capture form ❌\nSign in button"]
        end

        subgraph Options ["Options Page\noptions/Options.tsx"]
            OUI["Settings\nAccount connection\nPrivacy controls"]
        end

        subgraph SW ["Background Service Worker\nbackground/index.ts"]
            BAuth["auth.ts\nOAuth + token refresh"]
            BFF["feature-flags.ts\nA/B flag state"]
            BNotif["notifications.ts\nChrome notification handlers"]
            BTel["telemetry.ts\nEvent tracking"]
            BCache["Budget cache\n15-min refresh alarm"]
        end
    end

    subgraph Backend ["TrueSpend Backend (Supabase)"]
        SAT["Supabase Auth\nOAuth endpoint"]
        SBFF["BFF Edge Functions"]
        SDB[("PostgreSQL\nbudgets · transactions")]
        SR["Storage\nbucket: receipts"]
    end

    CS -->|"chrome.runtime.sendMessage\nMERCHANT_DETECTED"| SW
    Popup -->|"chrome.runtime.sendMessage"| SW
    SW -->|"chrome.storage.local"| BAuth
    SW -->|"Supabase REST API"| SDB
    BAuth -->|"chrome.identity OAuth"| SAT
    Popup -->|"supabase.from('budgets')"| SDB
    Options -.->|"planned"| SBFF

    classDef done fill:#22c55e,color:#fff,stroke:#16a34a
    classDef inprog fill:#f59e0b,color:#fff,stroke:#d97706
    classDef notdone fill:#ef4444,color:#fff,stroke:#dc2626

    class SW,BAuth done
    class CS,Popup inprog
    class Options notdone
```

---

## 2. Extension Install & First-Time Auth Flow

```mermaid
sequenceDiagram
    actor U as User
    participant CR as Chrome Runtime
    participant SW as Service Worker (background/index.ts)
    participant CI as Chrome Identity API
    participant SA as Supabase Auth
    participant CS as chrome.storage.local
    participant POP as Popup (Popup.tsx)

    U->>CR: Install extension from Chrome Web Store
    CR->>SW: chrome.runtime.onInstalled fires
    SW->>SW: Initialize feature flags
    SW->>SW: Setup chrome.alarms (15 min budget refresh)
    SW->>SW: Log install event via telemetry

    U->>POP: Click extension icon → Popup opens
    POP->>CS: chrome.storage.local.get(['session', 'privacyAccepted'])
    CS-->>POP: { session: null }

    POP-->>U: Show "Sign in to TrueSpend" button

    U->>POP: Click Sign In
    POP->>SW: chrome.runtime.sendMessage — AUTH_REQUEST
    SW->>CI: chrome.identity.launchWebAuthFlow(supabaseOAuthUrl, interactive: true)
    CI-->>U: Opens Supabase/Google OAuth in popup window
    U->>CI: Grants permission
    CI-->>SW: Callback URL with access_token + refresh_token
    SW->>SW: Parse tokens from callback URL
    SW->>CS: chrome.storage.local.set — session (access_token, refresh_token, expires_at)
    SW->>CR: chrome.runtime.sendMessage — AUTH_SUCCESS
    POP->>POP: Listen for 'TRUESPEND_AUTH_SUCCESS' postMessage
    POP->>SA: supabase.auth.setSession(session)
    POP->>POP: Re-render → Show budget dashboard
```

---

## 3. Token Refresh Flow (background/auth.ts)

```mermaid
flowchart TD
    Trigger(["Any API call\nor alarm fires"]) --> Check

    subgraph Check ["Session Health Check"]
        C1["chrome.storage.local.get('session')"]
        C2{"Session\nexists?"}
        C3{"expires_at - now\n< 5 minutes?"}
        C1 --> C2
        C2 -->|No| NoSession["Return null\n→ Re-auth needed"]
        C2 -->|Yes| C3
    end

    C3 -->|No| UseToken["Use existing access_token ✅"]

    C3 -->|Yes| Refresh

    subgraph Refresh ["Token Refresh"]
        R1["POST supabase/auth/v1/token\n{ grant_type: 'refresh_token',\n  refresh_token }"]
        R2{"Success?"}
        R3["Update chrome.storage.local\nwith new tokens + expires_at"]
        R4["Return new access_token"]
        R5["Return null\n→ Force re-auth"]
        R1 --> R2
        R2 -->|Yes| R3 --> R4
        R2 -->|No| R5
    end
```

---

## 4. Merchant Detection Flow (content/merchant-detector.ts)

```mermaid
flowchart TD
    PL([Page loads in browser]) --> Inject["Chrome injects content script\non every page"]

    Inject --> Detect

    subgraph Detect ["Merchant Detection Logic"]
        D1["Check hostname against\n15 known merchants:\nAmazon · Walmart · Target\nBest Buy · eBay · Etsy\nHome Depot · Lowe's · Wayfair\nMacy's · Nordstrom · Kohl's\nCostco · Sam's Club · Newegg"]
        D2{"Known\nmerchant?"}
        D1 --> D2
        D2 -->|No| Exit["Exit: not tracked"]
        D2 -->|Yes| Price
    end

    subgraph Price ["Price Extraction"]
        P1["Try CSS selectors:\n.price · .product-price\n#priceblock_ourprice\n.a-price-whole (Amazon)\nitemprop=price"]
        P2["Try data-price attribute"]
        P3["Regex fallback:\n/\\$?[\\d,]+\\.?\\d*/"]
        P4["price = 'unknown' if all fail"]
        P1 --> P2 --> P3 --> P4
    end

    Price --> Send["chrome.runtime.sendMessage({\n  type: 'MERCHANT_DETECTED',\n  data: {\n    merchant,\n    price,\n    url,\n    timestamp\n  }\n})"]

    Send --> SW["Service Worker receives\nhandleMerchantDetection()"]

    SW --> Cache["chrome.storage.local\nappend to 'merchantDetections'\n(keep last 100)"]

    Cache --> Badge["Update extension badge\n(show merchant name) ❌ planned"]

    subgraph Observer ["Dynamic Page Updates"]
        OB["MutationObserver\nwatches DOM changes"]
        DB["Debounce: 1000ms\n(prevents rapid re-fires)"]
        OB --> DB --> Detect
    end
```

---

## 5. Budget Check via Popup

```mermaid
sequenceDiagram
    actor U as User
    participant POP as Popup.tsx
    participant CS as chrome.storage.local
    participant SA as Supabase Client
    participant DB as PostgreSQL

    U->>POP: Clicks extension icon

    POP->>CS: get(['session', 'privacyAccepted'])
    CS-->>POP: { session: { access_token, ... } }

    POP->>SA: supabase.auth.setSession(session)
    SA-->>POP: Session restored ✅

    POP->>DB: supabase.from('budgets')\n.select('*, transactions(amount)')\n.limit(5)
    DB-->>POP: Top 5 budgets with spent amounts

    POP-->>U: Render budget cards:\n[Category] $spent / $limit\nProgress bar

    Note over POP,DB: ⚠️ Progress currently\nhardcoded to 0 — real query needed

    U->>POP: Network goes offline
    POP->>POP: window.addEventListener('offline')\nShow offline indicator badge
```

---

## 6. Expense Capture via Popup ❌ Week 47 — Not Yet Built

```mermaid
flowchart TD
    U([User on merchant page]) --> Badge["Popup badge shows\nmerchant name + detected price"]
    Badge --> Open["User clicks extension icon"]
    Open --> Form

    subgraph Form ["Quick Capture Form ❌"]
        F1["Pre-fill: merchant, amount\n(from merchant-detector cache)"]
        F2["User adjusts if needed:\namount · category · note"]
        F3["Submit button"]
        F1 --> F2 --> F3
    end

    subgraph Submit ["API Submit ❌"]
        S1["authenticatedFetch()\nGET access_token from chrome.storage"]
        S2["POST supabase/functions/v1/\nbff-transactions\n{ merchant, amount, category, url }"]
        S3{"Success?"}
        S4["Show: Expense saved! ✅"]
        S5["Retry (max 3, backoff 1s)\nThen: show error"]
        S1 --> S2 --> S3
        S3 -->|Yes| S4
        S3 -->|No 5xx| S5
        S3 -->|401| ReAuth["Send AUTH_EXPIRED\nShow sign-in button"]
    end

    Form --> Submit
    S4 --> Sync["Service worker invalidates\nbudget cache → refresh"]
```

---

## 7. Background Budget Cache Refresh

```mermaid
flowchart LR
    A(["chrome.alarms.create\n'refreshBudgetCache'\nperiodInMinutes: 15"]) --> B

    subgraph B ["chrome.alarms.onAlarm handler"]
        B1["Get session from chrome.storage"]
        B2{"Session\nvalid?"}
        B3["refreshBudgetCache()"]
        B4["GET supabase REST:\n/rest/v1/budgets\n?select=*&is_active=eq.true"]
        B5["chrome.storage.local.set({\n  cachedBudgets,\n  lastCacheRefresh: Date.now()\n})"]
        B1 --> B2
        B2 -->|No| Skip["Skip (user logged out)"]
        B2 -->|Yes| B3 --> B4 --> B5
    end

    B5 --> Available["Budgets available\ninstantly when popup opens"]
```

---

## 8. API Client Retry Logic (extension/shared/api-client.ts)

```mermaid
flowchart TD
    Call(["authenticatedFetch(url, options)"]) --> Token

    subgraph Token ["Get Token"]
        T1["chrome.storage.local.get('session')"]
        T2["Add headers:\nAuthorization: Bearer {token}\nx-client-info: truespend-extension/1.0.0"]
        T1 --> T2
    end

    Token --> Fetch["fetch(url, options)"]

    Fetch --> Status{"HTTP Status?"}

    Status -->|"2xx"| Done["Return response.json() ✅"]
    Status -->|"401"| Auth401["Send chrome.runtime.sendMessage\n{ type: 'AUTH_EXPIRED' }\nThrow immediately"]
    Status -->|"4xx (not 401)"| Err4["Throw immediately\n(client error, don't retry)"]
    Status -->|"5xx or network error"| Retry

    subgraph Retry ["Retry Logic (max 3)"]
        R1{"attempts\n< maxRetries (3)?"}
        R2["Wait: 1000ms × attempt\n(1s · 2s · 3s)"]
        R3["Retry fetch()"]
        R4["Throw lastError\n(all retries exhausted)"]
        R1 -->|Yes| R2 --> R3 --> Status
        R1 -->|No| R4
    end
```

---

## Phase 11 — Weekly Milestone Status

| Week | Milestone | Status |
|---|---|---|
| Week 46 | Manifest V3 scaffold + service worker | ✅ Done |
| Week 46 | background/auth.ts — OAuth + token refresh | ✅ Done |
| Week 46 | background/feature-flags.ts | ✅ Done |
| Week 46 | background/telemetry.ts | ✅ Done |
| Week 46 | background/notifications.ts | ✅ Done |
| Week 46 | extension/shared/api-client.ts (retry logic) | ✅ Done |
| Week 46 | extension/shared/storage.ts | ✅ Done |
| Week 46 | Popup scaffold + budget display | ✅ Done |
| Week 46 | Options page scaffold | ✅ Done |
| Week 47 | Merchant detector content script (15 merchants, MutationObserver) | ✅ Done |
| **Week 47** | **Popup: budget spending real calculation (currently $0 hardcoded)** | ❌ |
| **Week 47** | **Popup: one-click expense capture form** | ❌ |
| **Week 47** | **Options: account connect (OAuth flow)** | ❌ |
| **Week 47** | **Production extension build pipeline (Vite config)** | ❌ |
| **Week 47** | **Chrome Web Store listing** | ❌ |
