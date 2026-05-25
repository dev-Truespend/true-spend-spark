# TrueSpend — iOS & Android Traffic Flow

> **Platform:** Capacitor 7.6 wrapping the React SPA  
> **App ID:** `ai.truespend.app`  
> **Phase:** 12 (20% complete — Capacitor configured, native builds not yet done)  
> **Channels:** iOS (App Store) · Android (Play Store)

---

## 1. Mobile App Architecture

```mermaid
flowchart TD
    subgraph Native ["Native Layer (iOS / Android OS)"]
        subgraph Plugins ["Capacitor Plugins"]
            GEO["BackgroundGeolocation\n@capacitor-community/\nbackground-geolocation"]
            PUSH["PushNotifications\n@capacitor/push-notifications"]
            CAM["Camera\n@capacitor/camera"]
            BIO["BiometricAuth ❌\n(planned — Phase 12)"]
        end
        FCM["APNs (iOS) /\nFCM (Android)\nPush delivery"]
    end

    subgraph WebView ["Capacitor WebView\n(React SPA — dist/)"]
        subgraph Services ["Native Service Wrappers"]
            NGS["nativeGeofencingService.ts"]
            GPS["useNativeGPSTracking.ts"]
            PNS["pushNotificationService.ts"]
            SS["storageService.ts"]
        end

        subgraph Features ["Feature Modules"]
            Auth["features/auth/"]
            Loc["features/location/"]
            Rec["features/receipts/"]
            TX["features/transactions/"]
        end
    end

    subgraph Backend ["Supabase Backend"]
        SA["Supabase Auth"]
        EF["Edge Functions"]
        DB[("PostgreSQL")]
        ST["Storage\nbucket: receipts"]
    end

    Plugins --> Services
    Services --> Features
    Features --> Backend
    FCM -->|"OS delivers"| Native
    Native -->|"Plugin bridge"| WebView

    classDef done fill:#22c55e,color:#fff,stroke:#16a34a
    classDef inprog fill:#f59e0b,color:#fff,stroke:#d97706
    classDef notdone fill:#ef4444,color:#fff,stroke:#dc2626

    class GEO,PUSH,CAM done
    class NGS,GPS,PNS,SS done
    class BIO notdone
```

---

## 2. App Launch & Auth Check Flow

```mermaid
flowchart TD
    Launch([User taps TrueSpend icon]) --> Splash["Native splash screen\n(1.5s)"]
    Splash --> WebView["Load Capacitor WebView\ndist/ (React SPA)"]
    WebView --> Init["supabase.auth.onAuthStateChange()\nCheck existing session"]

    Init --> Session{"Session in\nlocalStorage?"}

    Session -->|Yes| Validate

    subgraph Validate ["Session Validation"]
        V1["supabase.auth.getSession()"]
        V2{"Session\nvalid & not\nexpired?"}
        V3["autoRefreshToken: true\nSilent token refresh"]
        V1 --> V2
        V2 -->|No| V3
        V3 --> V4{"Refresh\nsucceeded?"}
        V4 -->|Yes| RolesCheck
        V4 -->|No| LoginScreen
    end

    Session -->|No| LoginScreen["Show /auth\nLogin screen"]

    V2 -->|Yes| RolesCheck

    subgraph RolesCheck ["Role Resolution"]
        R1["SELECT user_roles\nWHERE user_id"]
        R2{"Role?"}
        R1 --> R2
        R2 -->|"user"| Dashboard["/dashboard"]
        R2 -->|"admin"| Admin["/admin"]
    end

    Dashboard --> PushReg["Register push notifications\n(if not already done)"]
    Dashboard --> GeoStart["Start geofence monitoring\n(if permission granted)"]

    subgraph PushReg ["pushNotificationService.ts"]
        PR1["PushNotifications.requestPermissions()"]
        PR2{"Granted?"}
        PR3["PushNotifications.register()"]
        PR4["Save FCM/APNs token\nINSERT user_devices"]
        PR1 --> PR2
        PR2 -->|Yes| PR3 --> PR4
        PR2 -->|No| Skip["Skip (no push)"]
    end
```

---

## 3. Biometric Auth Flow ❌ Phase 12 — Not Yet Built

```mermaid
sequenceDiagram
    actor U as User
    participant OS as iOS Face ID / Android Fingerprint
    participant CAP as Capacitor BiometricAuth Plugin
    participant W as React App
    participant SA as Supabase Auth

    Note over U,SA: App resumes from background\nor user returns after idle

    U->>W: App comes to foreground
    W->>W: Check: session older than 5 minutes?

    alt Biometric available
        W->>CAP: BiometricAuth.authenticate({\n  reason: "Verify it's you"\n})
        CAP->>OS: Prompt: Face ID / Fingerprint
        OS-->>U: Show biometric prompt
        U->>OS: Authenticate (face/finger)
        OS-->>CAP: Success
        CAP-->>W: { verified: true }
        W->>SA: supabase.auth.getSession()
        SA-->>W: Valid session
        W-->>U: App unlocked ✅
    else Biometric fails / not available
        W-->>U: Show PIN entry / Full login screen
    end
```

---

## 4. Background Geofencing Flow (nativeGeofencingService.ts)

```mermaid
sequenceDiagram
    participant OS as iOS/Android OS
    participant BGG as BackgroundGeolocation Plugin
    participant NGS as nativeGeofencingService.ts
    participant DB as Supabase (geofences table)
    participant PNS as pushNotificationService.ts
    participant U as User (anywhere)

    Note over NGS,DB: App startup — startMonitoring(userId)

    NGS->>DB: SELECT geofences\nWHERE user_id AND is_active = true
    DB-->>NGS: [{ id, name, lat, lng, radius_meters }]
    NGS->>NGS: Store in activeGeofences Map

    NGS->>BGG: BackgroundGeolocation.addWatcher({\n  backgroundTitle: "Location Tracking Active",\n  backgroundMessage: "TrueSpend is tracking...",\n  distanceFilter: 25\n})

    Note over OS,NGS: Every 25 metres moved (or less)

    OS->>BGG: GPS position update
    BGG->>NGS: { latitude, longitude, accuracy }

    NGS->>NGS: For each geofence:\nHaversine distance(lat,lng, geo.lat, geo.lng)

    alt distance ≤ radius_meters (entering zone)
        NGS->>NGS: Add to insideGeofences Set
        NGS->>NGS: Fire GeofenceEvent:\n{ type: 'enter', geofenceId, name }
        NGS->>PNS: Trigger deal notification
        PNS->>U: 📍 "You're near {merchant}!\nCheck your budget."
    else distance > radius_meters (leaving zone)
        NGS->>NGS: Remove from insideGeofences Set
        NGS->>NGS: Fire GeofenceEvent: { type: 'exit' }
    end
```

---

## 5. Push Notification Flow (pushNotificationService.ts)

```mermaid
flowchart TD
    subgraph Register ["App Start — Register Device (Phase 12)"]
        R1["PushNotifications.requestPermissions()"]
        R2{"Permission\ngranted?"}
        R3["PushNotifications.register()"]
        R4["Listen: 'registration' event\n→ device token received"]
        R5["UPSERT user_devices\n{ user_id, fcm_token,\nplatform: 'ios'|'android',\npush_enabled: true }"]
        R1 --> R2
        R2 -->|No| NoPush["No push notifications"]
        R2 -->|Yes| R3 --> R4 --> R5
    end

    Register --> Listen

    subgraph Listen ["Notification Listeners"]
        L1["pushNotificationReceived\n(app in foreground)"]
        L2["pushNotificationActionPerformed\n(user tapped notification)"]
    end

    subgraph Triggers ["Backend Notification Triggers"]
        T1["Budget alert\n(spending > limit)"]
        T2["Geofence entry\n(near merchant)"]
        T3["Anomaly detected\n(unusual transaction)"]
        T4["Weekly AI insights ready"]
    end

    subgraph Navigate ["Tap → Deep Link Navigation"]
        N1{"data.type?"}
        N2["/budgets"]
        N3["/location-history"]
        N4["/transactions"]
        N5["/insights"]
        N1 -->|"budget_alert"| N2
        N1 -->|"geofence_enter"| N3
        N1 -->|"anomaly"| N4
        N1 -->|"insights"| N5
    end

    Triggers -->|"via Supabase Edge Fn\n→ FCM/APNs"| Listen
    L2 --> Navigate
```

---

## 6. Receipt Capture — Mobile Camera Flow

```mermaid
flowchart TD
    U([User taps Receipt Capture]) --> Cam

    subgraph Cam ["Camera Capture (useCamera.tsx)"]
        C1["useCamera() hook"]
        C2{"Platform?"}
        C3["Capacitor Camera.getPhoto({\n  quality: 90,\n  allowEditing: true,\n  resultType: DataUrl\n})"]
        C4["Web: file input / drag-drop\n(ReceiptUpload component)"]
        C1 --> C2
        C2 -->|Native| C3
        C2 -->|Web| C4
    end

    Cam --> Prep

    subgraph Prep ["Image Preparation (Phase 1)"]
        P1["prepareImageForOCR(file)\nResize to max 2000px\nCompress quality 85%"]
        P2["analyzeOCRQuality()\nScore: contrast, blur, lighting"]
        P3["OCRQualityIndicator\nShows user quality score"]
        P1 --> P2 --> P3
    end

    Prep --> Geo["getCurrentPosition()\nCapture lat/lng for receipt"]

    Geo --> Upload

    subgraph Upload ["Upload to Supabase Storage (Phase 1)"]
        U1["getUserPath(userId, filename)\n→ {userId}/{timestamp}_{file}"]
        U2["supabase.storage\n.from('receipts').upload()"]
        U3["Progress bar updates\nonProgress callback"]
        U1 --> U2 --> U3
    end

    Upload --> OCR

    subgraph OCR ["OCR Edge Function (Phase 5)"]
        O1["invoke('ocr-receipt',\n{ filePath, userId })"]
        O2["Google Vision API\nDOCUMENT_TEXT_DETECTION"]
        O3["Parse fields:\nmerchant · amount · items\ntax · date · time"]
        O1 --> O2 --> O3
    end

    OCR --> Result{"OCR\nresult?"}
    Result -->|"Fields extracted"| Fill["Pre-fill transaction form\nUser taps to confirm"]
    Result -->|"Low quality / failed"| Manual["Toast: 'Enter details manually'\nBlank form"]

    Fill --> Save["→ Add Transaction Flow\n(via bff-transactions)"]
```

---

## 7. Background GPS & Geofence Check Cycle

```mermaid
flowchart LR
    A(["App running\n(foreground or background)"]) --> B

    subgraph B ["BackgroundGeolocation Plugin"]
        B1["OS position update\nevery 25m movement\nor ~30s if stationary"]
        B2["{ latitude, longitude,\n  accuracy, timestamp }"]
        B1 --> B2
    end

    B --> C

    subgraph C ["useNativeGPSTracking.ts"]
        C1["For each activeGeofence\nin local Map:"]
        C2["calculateDistance()\nHaversine formula"]
        C3{"dist ≤ radius?"}
        C4["Update insideGeofences Set"]
        C5["Fire: onGeofenceEvent\n{ enter | exit }"]
        C1 --> C2 --> C3
        C3 -->|Changed| C4 --> C5
        C3 -->|No change| Skip["No action"]
    end

    C --> D

    subgraph D ["On Geofence Enter"]
        D1["Push notification\n'Near {merchant}!'"]
        D2["Update location-history\nin Supabase"]
        D3["Trigger deal alert\nif budget > 80% used"]
    end
```

---

## 8. Offline → Online Sync Flow (storageService.ts)

```mermaid
flowchart TD
    A([Network goes offline]) --> B["NetworkMonitor detects\n'offline' event"]
    B --> C["Queue writes locally\nIndexedDB / localStorage"]

    C --> D([Network comes back\n'online' event])
    D --> E["Drain offline queue"]

    subgraph E ["Offline Queue Processing"]
        E1["For each pending write:"]
        E2["supabase.storage.upload()\nor supabase.from().insert()"]
        E3{"Success?"}
        E4["Remove from queue ✅"]
        E5["Re-queue\n(retry next cycle)"]
        E1 --> E2 --> E3
        E3 -->|Yes| E4
        E3 -->|No| E5
    end

    E --> F["supabase Realtime reconnects\nMissed events re-fetched"]
    F --> G["UI refreshes with\nsynced data"]
```

---

## Phase 12 — Weekly Milestone Status

| Week | Milestone | Status |
|---|---|---|
| Week 48 | Capacitor iOS 7.6.5 configured | ✅ Done |
| Week 48 | Capacitor Android 7.6.5 configured | ✅ Done |
| Week 48 | BackgroundGeolocation plugin wired | ✅ Done |
| Week 48 | PushNotifications plugin wired | ✅ Done |
| Week 48 | capacitor.config.ts (appId, server, plugins) | ✅ Done |
| **Week 48** | **iOS: Xcode build passes on device** | ❌ |
| **Week 48** | **Android: Gradle build passes on device** | ❌ |
| **Week 48** | **Native splash screen + app icons (all resolutions)** | ❌ |
| **Week 48** | **Deep-link handling (OAuth callback, email verify)** | ❌ |
| **Week 49** | **Biometric auth (Face ID / Fingerprint)** | ❌ |
| **Week 49** | **iOS: TestFlight internal distribution** | ❌ |
| **Week 49** | **Android: Play Console internal track** | ❌ |
| **Week 49** | **App Store metadata + screenshots** | ❌ |
| **Week 49** | **Play Store listing (privacy policy URL required)** | ❌ |

---

## iOS vs Android Differences

| Feature | iOS | Android |
|---|---|---|
| Push | APNs | Firebase Cloud Messaging |
| Auth prompt | Face ID / Touch ID | Fingerprint / Face Unlock |
| Background geo | Core Location | Fused Location Provider |
| Build tool | Xcode 15+ | Android Studio / Gradle |
| Distribution | App Store / TestFlight | Play Store / Internal Track |
| Storage sandbox | App Container | App-specific storage |
| Deeplink scheme | `truespend://` | Intent filter |
| Min OS | iOS 16+ | Android 7+ (API 24) |
