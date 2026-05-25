# TrueSpend — Website Traffic Flow

> **Platform:** React 18 SPA · Supabase backend · Cloudflare CDN  
> **Reference commit:** main (post PR #24)  
> **Phases covered:** 1–10, 13–14

---

## 1. System Architecture — Request Layers

Every browser request passes through this 9-layer stack before touching the database.

```mermaid
flowchart TD
    Browser["🌐 Browser\nReact SPA (Vite)"]

    subgraph CDN ["Phase 2 — CDN & Security"]
        CF["Cloudflare CDN\nCache + WAF + DDoS"]
        RL["Rate Limiter\nPer-user & Per-IP"]
    end

    subgraph BFF ["Phase 5 — BFF Layer (Edge Functions)"]
        B1["bff-dashboard"]
        B2["bff-transactions"]
        B3["ai-categorize-transaction"]
        B4["ai-analyze-spending"]
        B5["ocr-receipt"]
    end

    subgraph Auth ["Phase 4 — Auth Services"]
        A1["check-login-attempts"]
        A2["mfa-verify-totp"]
        A3["check-mfa-status"]
        A4["send-verification-email"]
        A5["request-password-reset"]
    end

    subgraph Payments ["Phase 6 — Payments (Coming)"]
        P1["plaid-create-link-token"]
        P2["plaid-exchange-token"]
        P3["plaid-webhook ⚠️"]
        P4["stripe-checkout ❌"]
        P5["stripe-webhook ❌"]
    end

    subgraph DB ["Supabase — Phase 1, 9"]
        PG[("PostgreSQL\n127 tables · RLS")]
        ST["Storage\nbucket: receipts"]
        RT["Realtime\nWS subscriptions"]
    end

    subgraph ML ["Phase 14 — ML"]
        HF["HuggingFace\nTransformers"]
        LLM["LLM Fallback\nClaude → Gemini → GPT-4"]
    end

    Browser -->|"HTTPS"| CF
    CF --> RL
    RL -->|"Auth'd requests"| BFF
    RL -->|"Auth requests"| Auth
    RL -->|"Payment requests"| Payments
    BFF --> PG
    BFF --> ST
    BFF --> ML
    Auth --> PG
    Payments --> PG
    PG --> RT
    RT -->|"WebSocket"| Browser

    classDef done fill:#22c55e,color:#fff,stroke:#16a34a
    classDef inprog fill:#f59e0b,color:#fff,stroke:#d97706
    classDef notdone fill:#ef4444,color:#fff,stroke:#dc2626
    classDef neutral fill:#6b7280,color:#fff,stroke:#4b5563

    class CDN,Auth done
    class BFF,ML inprog
    class Payments inprog
    class DB done
```

---

## 2. New User Registration & Email Verification

```mermaid
sequenceDiagram
    actor U as User
    participant W as React App
    participant CF as Cloudflare
    participant SA as Supabase Auth
    participant EF as Edge Function
    participant DB as PostgreSQL

    U->>W: Visits /auth, clicks Sign Up
    W->>SA: supabase.auth.signUp({ email, password })
    SA-->>W: { user, session }
    W->>DB: INSERT user_consents (terms accepted, timestamp)
    W->>EF: invoke('send-verification-email')
    EF-->>U: Verification email sent

    Note over U,W: User clicks link in email
    U->>W: Opens /verify-email?token=...
    W->>SA: supabase.auth.verifyOtp({ token, type:'email' })
    SA-->>W: Session confirmed
    W->>DB: SELECT user_roles WHERE user_id = userId
    W->>W: getLandingRouteForUser() → /dashboard
    W-->>U: Redirect to dashboard
```

---

## 3. Login — Full Auth Flow with MFA

```mermaid
flowchart TD
    Start([User opens /auth]) --> CheckURL{URL has\nOAuth params?}

    CheckURL -->|Yes| OAuthFlow
    CheckURL -->|No| LoginForm

    subgraph OAuthFlow ["OAuth Callback Path"]
        OA1["Poll supabase.auth.getSession()\nevery 500ms · max 8s"]
        OA2{"Session\nreceived?"}
        OA3["Timeout toast:\nTaking longer than expected"]
        OA1 --> OA2
        OA2 -->|No, retry| OA1
        OA2 -->|Yes| GetRoles
        OA2 -->|8s elapsed| OA3
    end

    subgraph LoginForm ["Email / Password Path (Phase 4)"]
        L1["User enters email + password"]
        L2["invoke('check-login-attempts')\nRate limit check"]
        L3{"Account\nlocked?"}
        L4["invoke('check-auth-provider')\nGoogle vs email account?"]
        L5["invoke('check-mfa-status')"]
        L6{"MFA\nenabled?"}
        L7["supabase.auth.signInWithPassword()"]
        L8["Show MFA code input"]
        L9["invoke('mfa-verify-totp') OR\ninvoke('mfa-verify-backup-code')"]
        L10{"Verified?"}
        L11["invoke('record-login-attempt') audit log"]

        L1 --> L2
        L2 --> L3
        L3 -->|Yes| LockError["Show: locked + remaining time"]
        L3 -->|No| L4
        L4 --> L5
        L5 --> L6
        L6 -->|Yes| L7
        L7 --> L8
        L8 --> L9
        L9 --> L10
        L10 -->|No| MFAError["invoke('increment-login-failures')\nShow error"]
        L10 -->|Yes| L11
        L6 -->|No| L7Direct["supabase.auth.signInWithPassword()"]
        L7Direct --> L11
        L11 --> GetRoles
    end

    subgraph GetRoles ["Post-Auth Routing (Phase 4)"]
        GetRoles["SELECT user_roles WHERE user_id"]
        CheckRole{"Role?"}
        ToDash["/dashboard"]
        ToAdmin["/admin"]
        GetRoles --> CheckRole
        CheckRole -->|user| ToDash
        CheckRole -->|admin/developer| ToAdmin
    end

    subgraph GooglePath ["Google OAuth Path (Phase 4)"]
        G1["supabase.auth.signInWithOAuth\nprovider: 'google'"]
        G2["Redirect to Google consent"]
        G3["Callback to /auth with code"]
        G4["invoke('audit-google-login')"]
        G1 --> G2 --> G3 --> G4 --> GetRoles
    end
```

---

## 4. Session Activity & Auto-Logout

```mermaid
flowchart LR
    A([User logs in]) --> B["Start activity timers\nuseSessionActivity hook"]
    B --> C["Events tracked:\nmousedown · keydown\nscroll · touchstart"]
    C --> D{"Activity within\n9 minutes?"}
    D -->|Yes| E["resetActivity()\nRestart timers"]
    E --> D
    D -->|No at 9min| F["Show ContinueSessionDialog\n⚠️ Logging out in 60s"]
    F --> G{"User clicks\nContinue?"}
    G -->|Yes| E
    G -->|No, or 10min elapsed| H["signOut()\nsupabase.auth.signOut()"]
    H --> I["Clear localStorage\nPrefix: truespend_"]
    I --> J["/auth redirect"]
```

---

## 5. Add Transaction — Full Data Flow

```mermaid
sequenceDiagram
    actor U as User
    participant W as React (Transactions page)
    participant GPS as Geolocation API
    participant BFF as bff-transactions Edge Fn
    participant AI as ai-categorize Edge Fn
    participant LLM as Claude/Gemini/GPT-4
    participant DB as PostgreSQL

    U->>W: Fill transaction form (amount, merchant, category)
    W->>GPS: navigator.geolocation.getCurrentPosition()
    GPS-->>W: latitude, longitude

    W->>W: Haversine distance check against active geofences

    W->>BFF: bffClient.processTransaction(amount, merchant, location, geofence_id)

    BFF->>DB: INSERT transactions (user_id, amount, merchant, category, lat, lng)

    BFF->>AI: invoke ai-categorize-transaction (merchant, amount, description)
    AI->>LLM: Prompt to Claude API
    LLM-->>AI: category, confidence, tags

    Note over AI,LLM: Fallback chain — Claude fails → Gemini → GPT-4

    AI-->>BFF: Suggested category
    BFF->>DB: UPDATE transactions SET ai_category

    DB-->>W: Realtime subscription fires\nnew transaction row
    W-->>U: Transaction appears in list
```

---

## 6. Receipt OCR Flow

```mermaid
flowchart TD
    U([User drops image or\ntakes photo]) --> V{"File valid?\n< 5MB\nJPG/PNG/PDF"}
    V -->|No| Err1["Toast: Invalid file"]
    V -->|Yes| Prep

    subgraph Prep ["Phase 1 — Prepare Image"]
        P1["prepareImageForOCR(file)\nResize + compress + quality check"]
        P2["analyzeOCRQuality()\nOCRQualityIndicator score"]
        P1 --> P2
    end

    Prep --> Geo["navigator.geolocation\nCapture current lat/lng"]

    Geo --> Upload

    subgraph Upload ["Phase 1 — Storage Upload"]
        U1["getUserPath(userId, fileName)\n{userId}/{timestamp}_{file}"]
        U2["supabase.storage\n.from('receipts').upload(path, file)"]
        U3["Progress callback → UI progress bar"]
        U1 --> U2 --> U3
    end

    Upload --> OCR

    subgraph OCR ["Phase 5 — OCR Edge Function"]
        O1["invoke('ocr-receipt'\n{ filePath, userId })"]
        O2["Google Vision API\nDocument text detection"]
        O3["Parse: merchant · amount\nitems · tax · timestamp"]
        O1 --> O2 --> O3
    end

    OCR --> Done{"OCR\nsucceeded?"}
    Done -->|Yes| CB["onReceiptExtracted({\nmerchant, amount, items,\ntax, timestamp, location })"]
    Done -->|No| Manual["Toast: OCR failed\nEnter manually"]

    CB --> Form["Pre-fill transaction form\nUser reviews + confirms"]
    Form --> TxFlow["→ Add Transaction Flow (diagram 5)"]
```

---

## 7. Plaid Bank Link Flow ⚠️ Partially Implemented

```mermaid
sequenceDiagram
    actor U as User
    participant W as React (Credit Cards page)
    participant EF as Supabase Edge Functions
    participant PL as Plaid API
    participant DB as PostgreSQL
    participant WH as webhook-plaid

    U->>W: Click "Link Bank Account"
    W->>EF: invoke plaid-create-link-token (user_id)
    EF->>PL: POST /link/token/create
    PL-->>EF: link_token
    EF-->>W: link_token

    W->>W: usePlaidLink opens Plaid Link modal

    U->>W: Select bank, enter credentials
    W-->>PL: Plaid handles authentication
    PL-->>W: onSuccess(publicToken, metadata)

    W->>EF: invoke plaid-exchange-token (publicToken, metadata)
    EF->>PL: POST /item/public_token/exchange
    PL-->>EF: access_token, item_id
    EF->>DB: INSERT plaid_items + credit_cards (user_id, item_id)
    EF-->>W: cards_added, transactions_synced

    W->>W: queryClient.invalidateQueries credit-cards + transactions
    W-->>U: Cards appear in list ✅

    Note over WH,DB: SYNC_UPDATES_AVAILABLE is implemented ✅
    PL-->>WH: Webhook SYNC_UPDATES_AVAILABLE (new transactions)
    WH->>PL: POST /transactions/sync (cursor-based pagination)
    PL-->>WH: added[], modified[], removed[], next_cursor
    WH->>DB: UPSERT transactions (added + modified) ✅
    WH->>DB: Soft-delete TRANSACTIONS_REMOVED ❌ missing
    WH->>DB: UPDATE on PENDING→POSTED ❌ missing
    Note over WH,DB: JWT signature verification also incomplete ⚠️
```

---

## 8. Stripe Subscription Flow ❌ Not Yet Implemented

```mermaid
flowchart TD
    U([User clicks Upgrade]) --> CS

    subgraph CS ["stripe-checkout-session ❌ Phase 6"]
        CS1["invoke('stripe-create-checkout-session'\n{ priceId, userId })"]
        CS2["Stripe: Create checkout session"]
        CS3["Redirect to Stripe hosted page"]
        CS1 --> CS2 --> CS3
    end

    CS --> Pay["User enters card\non Stripe page"]
    Pay --> Return["Return to /settings?success=true"]
    Return --> WH

    subgraph WH ["stripe-webhook ❌ Phase 6"]
        W1["POST /stripe-webhook\nVerify signature"]
        W2{"Event type?"}
        W3["customer.subscription.created\n→ INSERT subscriptions"]
        W4["customer.subscription.updated\n→ UPDATE status"]
        W5["invoice.payment_failed\n→ Send alert email"]
        W1 --> W2
        W2 --> W3
        W2 --> W4
        W2 --> W5
    end

    WH --> Gate["ProtectedRoute\nsubscription check ❌\n(not yet wired)"]
    Gate --> Pro["🔓 Pro features unlocked"]

    subgraph Portal ["stripe-portal-session ❌"]
        PO1["invoke('stripe-create-portal-session')"]
        PO2["Redirect to Stripe billing portal"]
        PO3["User manages plan/invoices"]
        PO1 --> PO2 --> PO3
    end
```

---

## 9. Budget + Geofence Alert Flow

```mermaid
flowchart TD
    TX([New transaction saved]) --> GF

    subgraph GF ["Phase 3 — Geofence Matching"]
        GF1["SELECT geofences WHERE user_id\n(active only)"]
        GF2["Haversine distance:\nd = 2R·arcsin(√(sin²Δlat/2 +\ncos·sin²Δlng/2))"]
        GF3{"d ≤ radius_meters?"}
        GF4["Tag transaction: geofence_id"]
        GF1 --> GF2 --> GF3
        GF3 -->|Yes| GF4
        GF3 -->|No| NoZone["No geofence tag"]
    end

    GF4 --> BudgetCheck

    subgraph BudgetCheck ["Phase 3 — Budget Check"]
        B1["SELECT budgets WHERE\ncategory = tx.category AND\ngeofence_id = tx.geofence_id"]
        B2["SUM transactions this period"]
        B3{"spent ≥ limit?"}
        B4["INSERT budget_alerts\n{ user_id, budget_id, amount }"]
        B1 --> B2 --> B3
        B3 -->|Yes| B4
        B3 -->|No| OK["Within budget ✅"]
    end

    B4 --> Notify

    subgraph Notify ["Phase 8 — Notifications"]
        N1["Realtime broadcast\nto subscribed client"]
        N2["Email: budget alert\n(Phase 5 email service)"]
        N3["Push notification\n→ mobile/PWA"]
        B4 --> N1
        B4 --> N2
        B4 --> N3
    end
```

---

## 10. AI Spending Insights Flow

```mermaid
sequenceDiagram
    participant TRG as Trigger (weekly cron / user request)
    participant EF as ai-analyze-spending Edge Fn
    participant DB as PostgreSQL
    participant LLM as LLM (Claude → Gemini → GPT-4)
    participant EM as Email Service
    participant W as React App

    TRG->>EF: invoke ai-analyze-spending (userId, period: weekly)
    EF->>DB: SELECT transactions — last 30 days, grouped by category
    DB-->>EF: Transaction aggregates
    EF->>DB: SELECT budgets, geofences
    DB-->>EF: Budget limits + zones

    EF->>LLM: Prompt: Analyze spend by category vs budgets
    LLM-->>EF: insights[], anomalies[], recommendations[]

    EF->>DB: INSERT ai_insights (user_id, insights, generated_at)

    EF->>EM: Send weekly summary email (top insight + spend breakdown)

    W->>DB: SELECT ai_insights WHERE user_id (Insights page loads)
    DB-->>W: Latest insights
    W-->>W: Render LocationInsightsPanel + charts
```

---

## Phase Map — Website

| Phase | Component | Status | URL / Location |
|---|---|---|---|
| Phase 1 | Offline storage, camera, error boundary | ✅ | `src/features/sync/`, `src/features/receipts/` |
| Phase 2 | Rate limiter, BFF client, CSP reporter | ✅ | `src/shared/lib/api/`, Cloudflare |
| Phase 3 | Geofencing, budget alerts, map creator | ✅ | `src/features/location/` |
| Phase 4 | Auth, MFA, session activity, password reset | ✅ | `src/features/auth/` |
| Phase 5 | BFF edge functions, AI categorise, email | 🟡 75% | `supabase/functions/` — `bff-transactions` missing |
| Phase 6 | Plaid sync ✅ partial · Stripe billing ❌ 0% | 🟡 50% | `src/features/credit-cards/`, `src/integrations/stripe/` (stub) |
| Phase 7 | Heatmap, GPS, deal alerts, location insights | ✅ | `src/features/location/` |
| Phase 8 | Feature flags, A/B test, anomaly detection, realtime | ✅ | `src/features/ml/`, `src/features/notifications/` |
| Phase 9 | Audit logs, data masking, backup | ✅ | Supabase policies + Edge Fns |
| Phase 10 | SLO tracking, incidents, performance monitor | 🟡 95% | `src/features/observability/`, `src/pages/internal/` |
| Phase 13 | Redis cache, read replica, BFF caching | 🟡 40% | `src/features/location/components/CacheLayerMetrics` |
| Phase 14 | HuggingFace model infra, training pipelines | 🟡 80% | `src/features/ml/` |
