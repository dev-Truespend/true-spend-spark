# TrueSpend — Combined Traffic Flow (All Platforms)

> **Reference document** — end-to-end view of how all three platforms  
> (Website · Browser Extension · iOS/Android) share the same backend.  
> Read the individual flow docs for per-platform detail.

---

## 1. All Platforms → Shared Backend

```mermaid
flowchart TD
    subgraph Clients ["Client Platforms"]
        WEB["🌐 Website\nReact SPA\n(truespend.org)"]
        EXT["🔌 Browser Extension\nChrome MV3\n(extension/)"]
        IOS["📱 iOS App\nCapacitor + React\n(App Store)"]
        AND["🤖 Android App\nCapacitor + React\n(Play Store)"]
    end

    subgraph Edge ["Phase 2 — Edge / CDN"]
        CF["☁️ Cloudflare\nCDN · WAF · DDoS\nRate limiting"]
    end

    subgraph Auth ["Phase 4 — Auth Layer"]
        SA["Supabase Auth\nJWT tokens\nOAuth · MFA · TOTP"]
    end

    subgraph BFF ["Phase 5 — BFF Edge Functions"]
        B1["bff-dashboard"]
        B2["bff-transactions"]
        B3["ai-categorize-transaction"]
        B4["ai-analyze-spending"]
        B5["ocr-receipt"]
        B6["mfa-verify-totp"]
        B7["plaid-* functions"]
        B8["stripe-* functions ❌"]
    end

    subgraph DB ["Phase 9 — Data Layer"]
        PG[("PostgreSQL\n127 tables · RLS")]
        RT["Realtime\nWebSocket broadcast"]
        STO["Storage\nbucket: receipts"]
    end

    subgraph Push ["Phase 8 — Notifications"]
        FCM["Firebase Cloud Messaging\n(Android)"]
        APNS["Apple Push Notification Service\n(iOS)"]
        EMAIL["Email\n(transactional)"]
    end

    subgraph ML ["Phase 14 — AI & ML"]
        HF["HuggingFace\nTransformers 3.8"]
        LLM["LLM Cascade\nClaude → Gemini → GPT-4"]
    end

    WEB -->|"HTTPS · JWT"| CF
    EXT -->|"Supabase REST · chrome.identity OAuth"| CF
    IOS -->|"HTTPS · Capacitor bridge"| CF
    AND -->|"HTTPS · Capacitor bridge"| CF

    CF --> Auth
    CF --> BFF
    Auth --> PG
    BFF --> PG
    BFF --> STO
    BFF --> ML
    PG --> RT

    RT -->|"WebSocket"| WEB
    RT -->|"polling ❌ planned"| EXT
    FCM -->|"OS push"| AND
    APNS -->|"OS push"| IOS
    EMAIL -->|"SMTP"| WEB
    EMAIL -->|"SMTP"| IOS
    EMAIL -->|"SMTP"| AND

    classDef done fill:#22c55e,color:#fff,stroke:#16a34a
    classDef inprog fill:#f59e0b,color:#fff,stroke:#d97706
    classDef notdone fill:#ef4444,color:#fff,stroke:#dc2626

    class WEB done
    class EXT inprog
    class IOS,AND inprog
    class CF,SA,PG,RT,STO done
    class B1,B2,B3,B4,B5 done
    class B7,B8 inprog
```

---

## 2. Auth — How Each Platform Authenticates

```mermaid
flowchart LR
    subgraph Web ["🌐 Website — Phase 4"]
        W1["supabase.auth.signInWithPassword\nor signInWithOAuth"]
        W2["Session in localStorage\n(autoRefreshToken: true)"]
        W3["JWT in every API call\nvia Authorization header"]
        W1 --> W2 --> W3
    end

    subgraph Ext ["🔌 Extension — Phase 11"]
        E1["chrome.identity.launchWebAuthFlow\n→ Supabase OAuth URL"]
        E2["Tokens in chrome.storage.local\n{ access_token, refresh_token,\n  expires_at }"]
        E3["authenticatedFetch()\nManual Bearer header\n+ auto-refresh if expiring < 5min"]
        E1 --> E2 --> E3
    end

    subgraph Mob ["📱 Mobile — Phase 12"]
        M1["supabase.auth.signInWithPassword\nor signInWithOAuth"]
        M2["Session in localStorage\n(Capacitor WebView)"]
        M3["BiometricAuth on resume ❌\n(Phase 12, not built yet)"]
        M4["JWT in every API call"]
        M1 --> M2 --> M3 --> M4
    end

    W3 -->|"JWT validates via\nSupabase RLS"| DB[("PostgreSQL\nRow-Level Security")]
    E3 --> DB
    M4 --> DB
```

---

## 3. Transaction Data — All Entry Points

Every transaction ultimately flows to the same `transactions` table via the BFF.

```mermaid
flowchart TD
    subgraph Entry ["Transaction Entry Points"]
        WM["🌐 Web: Manual form\n/transactions page"]
        WO["🌐 Web: Receipt OCR\ndrag-drop or camera"]
        WP["🌐 Web: Plaid auto-sync\n⚠️ webhook not built"]
        EM["🔌 Extension: Quick capture ❌\n(Week 47)"]
        MC["📱 Mobile: Camera capture\nCapacitor Camera plugin"]
        MG["📱 Mobile: Geofence trigger\nQuick-add on entry"]
    end

    WM --> BFF
    WO --> BFF
    WP -.->|"planned"| BFF
    EM -.->|"planned"| BFF
    MC --> BFF
    MG --> BFF

    subgraph BFF ["bff-transactions Edge Function (Phase 5)"]
        B1["Validate input\n(Zod schema)"]
        B2["Haversine geofence match\nvs user's active geofences"]
        B3["INSERT transactions\n{ user_id, amount, merchant,\ncategory, lat, lng, geofence_id }"]
        B4["invoke ai-categorize-transaction\nClaude → Gemini → GPT-4"]
        B5["UPDATE ai_category\non transaction"]
        B6["Check budget thresholds\n→ trigger alerts"]
        B1 --> B2 --> B3 --> B4 --> B5 --> B6
    end

    subgraph Broadcast ["Real-time Broadcast (Phase 8)"]
        RT["Supabase Realtime\npostgres_changes event"]
        WEB["🌐 Web: New row in table"]
        PUSH_IOS["📱 iOS: Push notification"]
        PUSH_AND["🤖 Android: Push notification"]
        EMAIL["📧 Email: Budget alert"]
        RT --> WEB
        RT --> PUSH_IOS
        RT --> PUSH_AND
        RT --> EMAIL
    end

    BFF --> Broadcast
```

---

## 4. Geofencing — All Platform Touch Points

```mermaid
flowchart TD
    subgraph Create ["Create Geofence (Web — Phase 3)"]
        C1["User draws zone on Leaflet map\n(MapGeofenceCreator.tsx)"]
        C2["Set name, radius, linked budget"]
        C3["INSERT geofences\n{ user_id, name, lat, lng,\n  radius_meters, budget_id }"]
        C1 --> C2 --> C3
    end

    subgraph WebCheck ["Web — Browser Check (Phase 3)"]
        W1["User opens /transactions"]
        W2["navigator.geolocation.getCurrentPosition()"]
        W3["Haversine check vs geofences"]
        W4["Tag transaction: geofence_id"]
        W1 --> W2 --> W3 --> W4
    end

    subgraph MobCheck ["Mobile — Background Check (Phase 12)"]
        M1["BackgroundGeolocation\n25m distance filter\ncontinuous OS updates"]
        M2["nativeGeofencingService\nHaversine check"]
        M3["GeofenceEvent:\n{ enter | exit }"]
        M4["Push notification\n'Near {merchant}'"]
        M5["Quick-capture UI\nopens in app"]
        M1 --> M2 --> M3 --> M4 --> M5
    end

    subgraph ExtCheck ["Extension — Merchant Match (Phase 11)"]
        E1["Content script detects\nmerchant on checkout page"]
        E2["Match merchant name\nvs user's geofences"]
        E3["Badge: show budget remaining ❌\n(planned Week 47)"]
        E1 --> E2 --> E3
    end

    C3 --> DB[("geofences table")]
    DB --> WebCheck
    DB --> MobCheck
    DB --> ExtCheck
```

---

## 5. Push Notification — Backend to Device

```mermaid
sequenceDiagram
    participant EF as Edge Function (any trigger)
    participant DB as PostgreSQL
    participant UD as user_devices table
    participant FCM as Firebase / APNs
    participant IOS as iOS Device
    participant AND as Android Device

    Note over EF,DB: Trigger: budget_alert / geofence_enter / anomaly

    EF->>DB: SELECT user_devices WHERE user_id AND push_enabled = true
    DB-->>EF: fcm_token, platform per device

    loop For each device token
        EF->>FCM: POST messages:send (token, title, body, type, route)
        FCM->>IOS: APNs delivery (iOS)
        FCM->>AND: FCM delivery (Android)
    end

    IOS-->>IOS: OS shows notification
    AND-->>AND: OS shows notification

    Note over IOS,AND: User taps notification

    IOS->>IOS: pushNotificationActionPerformed\ndata.type → navigate to route
    AND->>AND: pushNotificationActionPerformed\ndata.type → navigate to route
```

---

## 6. Complete User Journey — New User to Active

```mermaid
flowchart TD
    Start([New user hears about TrueSpend]) --> Visit

    subgraph Visit ["Phase 1–2 — First Visit"]
        V1["Visits truespend.org\nCloudflare CDN serves React SPA"]
        V2["Browses marketing pages\n/features · /pricing · /about"]
        V3["Clicks 'Get Started'"]
        V1 --> V2 --> V3
    end

    Visit --> SignUp

    subgraph SignUp ["Phase 4 — Registration"]
        S1["Fills signup form\nemail + password + consent"]
        S2["supabase.auth.signUp()"]
        S3["Verification email sent"]
        S4["User clicks verify link"]
        S5["Account confirmed ✅"]
        S1 --> S2 --> S3 --> S4 --> S5
    end

    SignUp --> MFA

    subgraph MFA ["Phase 4 — MFA Setup (optional)"]
        M1["Settings → Enable MFA"]
        M2["Scan QR → TOTP app"]
        M3["Verify 6-digit code"]
        M4["Generate 10 backup codes"]
        M1 --> M2 --> M3 --> M4
    end

    MFA --> Link

    subgraph Link ["Phase 6 — Bank Link (Plaid)"]
        L1["Click 'Link Bank Account'"]
        L2["Plaid Link modal opens"]
        L3["Select bank, enter credentials"]
        L4["Token exchange → cards saved"]
        L5["Transactions sync ⚠️ pending"]
        L1 --> L2 --> L3 --> L4 --> L5
    end

    Link --> Budget

    subgraph Budget ["Phase 3 — Create Budget"]
        B1["Set monthly limit per category\n(Food, Transport, etc.)"]
        B2["Draw geofence on map\n(optional: link to merchant area)"]
        B3["Budget active ✅"]
        B1 --> B2 --> B3
    end

    Budget --> Daily

    subgraph Daily ["Daily Usage — All Platforms"]
        D1["🌐 Web: Add expenses manually\nor upload receipt"]
        D2["🔌 Extension: Capture\non Amazon / Walmart ❌"]
        D3["📱 Mobile: Walk into zone\n→ push notification\n→ quick capture"]
        D4["AI categorises automatically"]
        D5["Budget progress updates"]
        D1 --> D4
        D2 -.-> D4
        D3 --> D4
        D4 --> D5
    end

    Daily --> Insights

    subgraph Insights ["Phase 5–7 — Weekly AI Insights"]
        I1["ai-analyze-spending runs\n(weekly or on-demand)"]
        I2["Patterns: where you spend most"]
        I3["Recommendations: save $X\nby avoiding Z"]
        I4["Email digest sent"]
        I5["Insights page shows charts"]
        I1 --> I2 --> I3 --> I4
        I1 --> I5
    end

    Insights --> Subscribe

    subgraph Subscribe ["Phase 6 — Stripe Billing ❌"]
        SB1["Free: 3 cards, basic features"]
        SB2["Pro: Stripe checkout → paid"]
        SB3["Pro features unlock:\nML insights, unlimited cards,\nextended history"]
        SB1 --> SB2 --> SB3
    end
```

---

## 7. Phase × Platform Matrix

> Which phase built which capability, and which platforms it affects.

| Phase | What Was Built | Web | Extension | Mobile |
|---|---|:---:|:---:|:---:|
| **Phase 1** | Offline storage, camera, error boundary, base routing | ✅ | — | ✅ |
| **Phase 2** | Cloudflare CDN, WAF, rate limiter, BFF client | ✅ | ✅ | ✅ |
| **Phase 3** | Geofencing, budget alerts, Leaflet map, Haversine match | ✅ | — | ✅ |
| **Phase 4** | Auth, MFA, TOTP, session activity, password reset | ✅ | ✅ | ✅ |
| **Phase 5** | BFF edge functions, AI categorise, OCR, email | ✅ | ✅ | ✅ |
| **Phase 6** | Plaid link UI + exchange, Stripe ❌ | ✅ | — | — |
| **Phase 7** | Heatmap, native GPS, deal alerts, location insights | ✅ | — | ✅ |
| **Phase 8** | Feature flags, A/B test, anomaly detection, realtime | ✅ | 🟡 | ✅ |
| **Phase 9** | Audit logs, data masking, backup, cross-region DR | ✅ | ✅ | ✅ |
| **Phase 10** | SLO, incidents, performance, observability dashboards | ✅ | — | — |
| **Phase 11** | Chrome extension (service worker, popup, merchant detector ✅, capture ❌) | — | 🟡 55% | — |
| **Phase 12** | Capacitor iOS/Android native folders exist, on-device builds unverified | — | — | 🟡 35% |
| **Phase 13** | Redis cache, read replica, GraphQL ❌ | ✅ | ✅ | ✅ |
| **Phase 14** | HuggingFace ML infra, model registry, training pipeline | ✅ | — | — |
| **Phase 15** | Advanced ML (ranking, forecast, RL, collab filter) ❌ | ❌ | — | — |
| **Phase 16** | Cost optimisation (Bloom filters, ARIMA, Gorilla) ❌ | ❌ | ❌ | — |

---

## 8. Data Ownership & Privacy — All Platforms

```mermaid
flowchart LR
    subgraph User ["User Data"]
        U1["transactions\nbudgets · geofences\nmerchants · profiles"]
        U2["receipts\n(Supabase Storage)"]
        U3["device tokens\n(push notifications)"]
        U4["plaid_accounts\n(encrypted access tokens)"]
    end

    subgraph RLS ["Row-Level Security (Phase 2)"]
        R1["Every table: RLS enabled\nuser can only see their own rows\nEVEN if they know another user_id"]
        R2["Admin role: can read all\n(for support & analytics)"]
        R3["Audit logs: append-only\nNo user can delete their own logs"]
    end

    subgraph Vault ["Secrets Vault (Phase 2)"]
        V1["Plaid access_token: encrypted\nin Supabase Vault"]
        V2["Stripe secret: in Vault ❌"]
        V3["API keys: never in .env\nnever in git history"]
    end

    User --> RLS
    User --> Vault

    subgraph GDPR ["Compliance"]
        G1["Data export: /settings\n→ useDataExport hook"]
        G2["Account deletion:\ndeletes all user rows\n+ storage files"]
        G3["Consent recorded:\nuser_consents table\n(signup timestamp)"]
        G4["AI recommendation policy:\n/legal/ai-recommendations"]
    end
```

---

## 9. Error Handling — Across All Platforms

```mermaid
flowchart TD
    subgraph Errors ["Error Categories"]
        E1["🔴 Auth errors\n(invalid creds, locked, MFA fail)"]
        E2["🟠 Network errors\n(offline, timeout, 5xx)"]
        E3["🟡 Data errors\n(validation, RLS rejection)"]
        E4["⚪ Expected errors\n(OCR fail, location unavailable)"]
    end

    subgraph Web ["🌐 Web Handling"]
        W1["Toast notifications (Sonner)"]
        W2["ErrorBoundary wraps all routes"]
        W3["Correlation ID in every BFF request\nfor tracing"]
        W4["performanceMonitor.mark()\non critical paths"]
    end

    subgraph Ext ["🔌 Extension Handling"]
        X1["authenticatedFetch retry\n(3 attempts, exponential backoff)"]
        X2["401 → AUTH_EXPIRED message\n→ show sign-in button"]
        X3["Offline badge on popup"]
    end

    subgraph Mob ["📱 Mobile Handling"]
        M1["Same ErrorBoundary\n(React in WebView)"]
        M2["Offline queue\n→ sync on reconnect"]
        M3["Push notification errors\nlogged to Supabase"]
    end

    Errors --> Web
    Errors --> Ext
    Errors --> Mob

    subgraph Future ["Planned — Phase 10"]
        F1["Sentry integration ❌\n(P0 launch blocker)"]
        F2["Error rates feed into SLO ❌"]
    end
```

---

## Document Index

| Document | What it covers |
|---|---|
| [TRAFFIC_FLOW_WEBSITE.md](./TRAFFIC_FLOW_WEBSITE.md) | System architecture, auth, transactions, OCR, Plaid, Stripe, geofence alerts, AI insights — web only |
| [TRAFFIC_FLOW_EXTENSION.md](./TRAFFIC_FLOW_EXTENSION.md) | Extension install, OAuth, merchant detection, budget popup, expense capture, API retry logic |
| [TRAFFIC_FLOW_MOBILE.md](./TRAFFIC_FLOW_MOBILE.md) | App launch, biometric auth, background geofencing, push notifications, camera OCR, offline sync |
| **TRAFFIC_FLOW_COMBINED.md** | **This file — all platforms converging on shared backend, phase matrix, full user journey** |
| [MILESTONE_TRACKER.md](./MILESTONE_TRACKER.md) | Phase-by-phase weekly milestones, status, blockers, and launch checklist |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture — 19 layers, database schema, RLS, edge functions |
| [API.md](./API.md) | Edge function request/response schemas, error codes, auth headers |
