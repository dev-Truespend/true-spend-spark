# MVP Architecture

This MVP keeps infrastructure cost controlled while using managed auth, storage, messaging, secrets, and observability from the start.

## iOS MVP Diagram

```mermaid
flowchart TB
  %% ===== Client tier =====
  subgraph Device[iOS Device]
    direction TB
    IOS[Expo iOS App]
    subgraph DeviceSvcs[Device Services - on-device only]
      direction TB
      Location[Core Location]
      AppleMapKit[Apple MapKit / MKLocalSearch]
      LocalCache[Merchant Cache]
    end
    IOS --> DeviceSvcs
  end

  Auth[Supabase Auth]

  %% ===== Edge tier =====
  AzureGateway[Azure Gateway - public]

  %% ===== Compute tier =====
  subgraph ACA[Azure Container Apps Environment]
    direction TB
    subgraph Internal[Internal-only containers]
      direction TB
      API[.NET API - validates Supabase JWT]
      Consumer[Event Consumer]
      CatalogJob[Catalog Job - scheduled]
    end
  end

  %% ===== Messaging tier =====
  subgraph SB[Azure Service Bus]
    direction TB
    Topic[Topics + Subscriptions]
    DLQ[Dead-letter Queue]
  end

  %% ===== Data tier =====
  subgraph SupabaseData[Supabase Data]
    direction TB
    DB[(Postgres)]
    Storage[Storage]
  end

  %% ===== External services =====
  subgraph Ext[External Services - egress]
    direction TB
    RewardsCC[RewardsCC API]
    Plaid[Plaid - card metadata and transactions]
    Stripe[Stripe - billing & subscriptions]
    AzureOpenAI[Azure OpenAI - insights]
    APNs[APNs]
  end

  %% ===== Cross-cutting infrastructure =====
  subgraph Infra[Cross-cutting Infrastructure]
    direction TB
    Redis[Azure Cache for Redis]
    KeyVault[Azure Key Vault]
    Obs[Log Analytics / App Insights]
  end

  %% ===== Auth =====
  IOS <-->|sign-in / JWT| Auth

  %% ===== Primary request path =====
  IOS -->|Bearer JWT| AzureGateway
  AzureGateway -->|forwards JWT| API

  %% ===== API outbound =====
  API --> DB
  API --> Storage
  API --> Topic
  API --> Plaid
  API --> Stripe
  API --> AzureOpenAI
  API --> APNs

  %% ===== Stripe inbound webhooks =====
  Stripe -->|webhook events| AzureGateway

  %% ===== Async path =====
  Topic --> Consumer
  Topic -. on max retries .-> DLQ
  Consumer --> DB
  Consumer --> APNs
  Consumer --> AzureOpenAI

  %% ===== APNs device flow =====
  IOS <-->|register, receive device token| APNs
  IOS -->|POST device token| API
  APNs -->|push delivery| IOS

  %% ===== Scheduled catalog sync =====
  CatalogJob --> RewardsCC
  CatalogJob --> DB
  CatalogJob --> Topic

  %% ===== Cross-cutting (dotted - infrastructure dependencies) =====
  API -. rate limits / short-lived cache .-> Redis
  API -.-> KeyVault
  API -.-> Obs
  Consumer -. idempotency keys / short-lived cache .-> Redis
  Consumer -.-> KeyVault
  Consumer -.-> Obs
  CatalogJob -.-> KeyVault
  CatalogJob -.-> Obs
  AzureGateway -.-> Obs
```

## iOS MVP Choices

- Use Expo for the iOS app shell.
- Use Core Location for foreground location, stop detection, and optional background permission flows.
- Use Apple MapKit / MKLocalSearch for nearby merchant lookup to avoid Google Places cost on iOS.
- Keep a small on-device merchant cache for recent places and duplicate suppression.
- Keep Apple MapKit / MKLocalSearch-derived place data on-device only; do not persist MapKit-derived merchant results to Supabase or server-side caches.
- Use Supabase Auth for sign-in and JWT issuance.
- Send the Supabase JWT from the iOS app to the backend in the `Authorization` header.
- Use Azure Gateway as the public entry point for inbound iOS traffic.
- Keep the .NET API, event consumer, and catalog job internal-only inside the Container Apps environment.
- Use Azure Gateway for routing, request shaping, and gateway policies.
- Validate Supabase JWTs in the .NET API using Supabase JWKS.
- Use a separate .NET API container for business APIs.
- Send push notifications through APNs.
- Register APNs push tokens via `POST /api/v1/devices` after sign-in and on every cold start; store them in Supabase Postgres keyed by token.
- Remove APNs tokens on user sign-out (`DELETE /api/v1/devices/:token`) and when APNs returns `BadDeviceToken` or `Unregistered`.
- Publish async events from the API to Azure Service Bus topics with subscriptions.
- Use Service Bus dead-letter queues for failed messages that exceed retry limits.
- Use a separate event consumer container for queued/background work.
- Have the event consumer subscribe to both API-published events and Catalog Job-published events so catalog changes can trigger cache invalidation and notifications.
- Run all background work as **.NET Worker Service** containers in Azure Container Apps: the event consumer pulls from Service Bus, and the scheduled jobs (catalog refresh, Plaid sync, notification dispatch, AI insight generation, reminder firing, weekly summary, outbox dispatcher) fire from a cron-style scheduler inside the worker.
- The scheduler library is **TBD** — Hangfire is a candidate (Postgres-backed state, retries, dashboard) but alternatives like Quartz.NET, Coravel, native `IHostedService` timers, or Azure Container Apps Jobs will be evaluated before commit. See [job-architecture.md § Hosting Model](../low-level-design/Service/job-architecture.md#hosting-model).
- Use Supabase for auth, Postgres storage, and file storage.
- Use Azure Cache for Redis for rate limits, short-lived cache, and distributed coordination when needed.
- Use Azure Key Vault for Plaid, RewardsCC, Stripe, Azure OpenAI, Supabase service-role, APNs, and other service secrets.
- Use Log Analytics / Application Insights for gateway, API, consumer, and catalog job telemetry.
- Use RewardsCC as the card/reward provider, subject to its caching and storage terms.
- Use Plaid optionally for account/card metadata and linked transaction import, not liabilities.
- Use Stripe for paid plan billing, the 7-day free trial, subscription lifecycle, payment-method management, and webhook-driven entitlement updates.
- Create the Stripe customer from the .NET API on first paid action; expose `/api/v1/billing/checkout` and `/api/v1/billing/portal` that return Stripe-hosted URLs the iOS app opens via in-app browser.
- Validate Stripe webhook signatures at Azure Gateway/API, persist entitlement state in Postgres, and publish a `subscription.changed` event to Service Bus for downstream consumers.
- Note: on iOS, Apple's App Store rules generally require Apple In-App Purchase for digital subscriptions consumed in-app. Confirm the Stripe-only flow against the current App Store Review Guidelines (reader-app exception, external-link entitlement, or web-only checkout) before shipping.
- Use Azure OpenAI for reward-optimization AI insights surfaced in the Insights tab and for personalized nudges.
- Generate AI insights asynchronously: the API enqueues an `insights.generate` event, the Event Consumer calls Azure OpenAI, persists the result in Postgres, and pushes via APNs when complete.
- Gate Azure OpenAI calls behind the per-user "Personalized AI insights" privacy toggle and behind the user's plan entitlement.

## Android MVP Diagram

```mermaid
flowchart TB
  %% ===== Client tier =====
  subgraph Device[Android Device]
    direction TB
    Android[Expo Android App]
    subgraph DeviceSvcs[Device Services]
      direction TB
      Location[Android Location Services]
      GooglePlaces[Google Places API]
      LocalCache[Merchant Cache]
    end
    Android --> DeviceSvcs
  end

  Auth[Supabase Auth]

  %% ===== Edge tier =====
  AzureGateway[Azure Gateway - public]

  %% ===== Compute tier =====
  subgraph ACA[Azure Container Apps Environment]
    direction TB
    subgraph Internal[Internal-only containers]
      direction TB
      API[.NET API - validates Supabase JWT]
      Consumer[Event Consumer]
      CatalogJob[Catalog Job - scheduled]
    end
  end

  %% ===== Messaging tier =====
  subgraph SB[Azure Service Bus]
    direction TB
    Topic[Topics + Subscriptions]
    DLQ[Dead-letter Queue]
  end

  %% ===== Data tier =====
  subgraph SupabaseData[Supabase Data]
    direction TB
    DB[(Postgres)]
    Storage[Storage]
  end

  %% ===== External services =====
  subgraph Ext[External Services - egress]
    direction TB
    RewardsCC[RewardsCC API]
    Plaid[Plaid - card metadata and transactions]
    Stripe[Stripe - billing & subscriptions]
    AzureOpenAI[Azure OpenAI - insights]
    FCM[FCM]
  end

  %% ===== Cross-cutting infrastructure =====
  subgraph Infra[Cross-cutting Infrastructure]
    direction TB
    Redis[Azure Cache for Redis]
    KeyVault[Azure Key Vault]
    Obs[Log Analytics / App Insights]
  end

  %% ===== Auth =====
  Android <-->|sign-in / JWT| Auth

  %% ===== Primary request path =====
  Android -->|Bearer JWT| AzureGateway
  AzureGateway -->|forwards JWT| API

  %% ===== API outbound =====
  API --> DB
  API --> Storage
  API --> Topic
  API --> Plaid
  API --> Stripe
  API --> AzureOpenAI
  API --> FCM

  %% ===== Stripe inbound webhooks =====
  Stripe -->|webhook events| AzureGateway

  %% ===== Async path =====
  Topic --> Consumer
  Topic -. on max retries .-> DLQ
  Consumer --> DB
  Consumer --> FCM
  Consumer --> AzureOpenAI

  %% ===== FCM device flow =====
  Android <-->|register, receive device token| FCM
  Android -->|POST device token| API
  FCM -->|push delivery| Android

  %% ===== Scheduled catalog sync =====
  CatalogJob --> RewardsCC
  CatalogJob --> DB
  CatalogJob --> Topic

  %% ===== Cross-cutting (dotted - infrastructure dependencies) =====
  API -. rate limits / short-lived cache .-> Redis
  API -.-> KeyVault
  API -.-> Obs
  Consumer -. idempotency keys / short-lived cache .-> Redis
  Consumer -.-> KeyVault
  Consumer -.-> Obs
  CatalogJob -.-> KeyVault
  CatalogJob -.-> Obs
  AzureGateway -.-> Obs
```

## Android MVP Choices

- Use Expo for the Android app shell.
- Use Android Location Services for foreground location, stop detection, and optional background permission flows.
- Use Google Places for nearby merchant lookup on Android.
- Keep a small on-device merchant cache to reduce Google Places calls and duplicate suggestions.
- Persist Google Places-derived data only as allowed by Google Maps Platform terms; prefer storing internal merchant/category mappings and provider IDs instead of raw place payloads.
- Add backend quotas for Android place lookups to control Google Places spend.
- Use Supabase Auth for sign-in and JWT issuance.
- Send the Supabase JWT from the Android app to the backend in the `Authorization` header.
- Use Azure Gateway as the public entry point for inbound Android traffic.
- Keep the .NET API, event consumer, and catalog job internal-only inside the Container Apps environment.
- Use Azure Gateway for routing, request shaping, and gateway policies.
- Validate Supabase JWTs in the .NET API using Supabase JWKS.
- Use a separate .NET API container for business APIs.
- Send push notifications through FCM.
- Register FCM push tokens via `POST /api/v1/devices` after sign-in and on every cold start; store them in Supabase Postgres keyed by token.
- Remove FCM tokens on user sign-out (`DELETE /api/v1/devices/:token`) and when FCM reports an invalid or unregistered token.
- Publish async events from the API to Azure Service Bus topics with subscriptions.
- Use Service Bus dead-letter queues for failed messages that exceed retry limits.
- Use a separate event consumer container for queued/background work.
- Have the event consumer subscribe to both API-published events and Catalog Job-published events so catalog changes can trigger cache invalidation and notifications.
- Run all background work as **.NET Worker Service** containers in Azure Container Apps: the event consumer pulls from Service Bus, and the scheduled jobs (catalog refresh, Plaid sync, notification dispatch, AI insight generation, reminder firing, weekly summary, outbox dispatcher) fire from a cron-style scheduler inside the worker.
- The scheduler library is **TBD** — Hangfire is a candidate (Postgres-backed state, retries, dashboard) but alternatives like Quartz.NET, Coravel, native `IHostedService` timers, or Azure Container Apps Jobs will be evaluated before commit. See [job-architecture.md § Hosting Model](../low-level-design/Service/job-architecture.md#hosting-model).
- Use Supabase for auth, Postgres storage, and file storage.
- Use Azure Cache for Redis for rate limits, short-lived cache, and distributed coordination when needed.
- Use Azure Key Vault for Plaid, RewardsCC, Stripe, Azure OpenAI, Supabase service-role, FCM, and other service secrets.
- Use Log Analytics / Application Insights for gateway, API, consumer, and catalog job telemetry.
- Use RewardsCC as the card/reward provider, subject to its caching and storage terms.
- Use Plaid optionally for account/card metadata and linked transaction import, not liabilities.
- Use Stripe for paid plan billing, the 7-day free trial, subscription lifecycle, payment-method management, and webhook-driven entitlement updates.
- Create the Stripe customer from the .NET API on first paid action; expose `/api/v1/billing/checkout` and `/api/v1/billing/portal` that return Stripe-hosted URLs the Android app opens via Custom Tabs.
- Validate Stripe webhook signatures at Azure Gateway/API, persist entitlement state in Postgres, and publish a `subscription.changed` event to Service Bus for downstream consumers.
- Note: on Android, Google Play Billing is required for digital subscriptions distributed via the Play Store. Confirm the Stripe-only flow against current Play Console policy (Payments Policy exemptions, alternative billing pilot, or web-only checkout) before shipping.
- Use Azure OpenAI for reward-optimization AI insights surfaced in the Insights tab and for personalized nudges.
- Generate AI insights asynchronously: the API enqueues an `insights.generate` event, the Event Consumer calls Azure OpenAI, persists the result in Postgres, and pushes via FCM when complete.
- Gate Azure OpenAI calls behind the per-user "Personalized AI insights" privacy toggle and behind the user's plan entitlement.

## Upgrade Points

- Add more API and consumer replicas as traffic grows.
- Add more Service Bus topics/subscriptions when async workflows split by domain.
- Add Azure Gateway capacity or Azure Front Door if managed edge routing, WAF, or global balancing is required.
- Add separate consumers for heavier domains such as transaction analytics, notifications, catalog sync, or receipt processing.

## Related Docs

- [MVP Tooling Guide](./mvp-tooling-guide.md)
- [Scaling Architecture](./scaling-architecture.md)
