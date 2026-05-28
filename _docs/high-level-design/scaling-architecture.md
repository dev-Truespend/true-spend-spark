# Scaling Architecture

This target architecture adds managed shared state, durable messaging, stronger edge controls, and independently scalable services.

```mermaid
flowchart TB
  subgraph Users
    IOS[Expo iOS App]
    Android[Expo Android App]
  end

  subgraph MobilePlaces[Platform Places]
    AppleMapKit[Apple MapKit / MKLocalSearch]
    GooglePlaces[Google Places API]
  end

  subgraph Edge[Azure Edge]
    FrontDoor[Azure Front Door or App Gateway\nTLS, WAF, health probes]
  end

  subgraph Azure[Azure Container Apps]
    YARP[YARP Gateway\n2+ replicas]
    APIBlue[.NET API Blue]
    APIGreen[.NET API Green]
    Worker[Background Worker]
    CatalogJob[Scheduled Catalog Job]
  end

  subgraph SharedState[Managed Shared State]
    Redis[(Azure Cache for Redis\nrate limits, cache, locks)]
    ServiceBus[(Azure Service Bus\njobs, retries, DLQ)]
  end

  subgraph Supabase[Supabase Pro / Scale]
    Auth[Supabase Auth]
    DB[(Postgres)]
    Storage[Storage]
  end

  RewardsCC[RewardsCC API]
  Plaid[Plaid API]
  Push[APNs / FCM]
  Observability[Log Analytics / App Insights]

  IOS --> AppleMapKit
  Android --> GooglePlaces

  IOS --> FrontDoor
  Android --> FrontDoor
  FrontDoor --> YARP

  YARP --> APIBlue
  YARP --> APIGreen
  YARP --> Redis

  APIBlue --> Auth
  APIGreen --> Auth
  APIBlue --> DB
  APIGreen --> DB
  APIBlue --> Redis
  APIGreen --> Redis
  APIBlue --> ServiceBus
  APIGreen --> ServiceBus
  APIBlue --> Plaid
  APIGreen --> Plaid
  APIBlue --> Push
  APIGreen --> Push

  Worker --> ServiceBus
  Worker --> DB
  Worker --> Redis
  Worker --> Push

  CatalogJob --> RewardsCC
  CatalogJob --> DB
  CatalogJob --> ServiceBus

  FrontDoor --> Observability
  YARP --> Observability
  APIBlue --> Observability
  APIGreen --> Observability
  Worker --> Observability
  CatalogJob --> Observability
```

## Scaling Choices

- Front Door or Application Gateway handles managed edge routing, TLS, WAF, and health probes.
- YARP remains the application gateway for route-level logic, transforms, blue/green routing, and app-aware policies.
- Redis stores distributed rate-limit counters, short-lived merchant/category cache, feature flags, and locks.
- Azure Service Bus replaces the Postgres queue for durable jobs, retries, scheduled messages, and dead-letter handling.
- API blue/green revisions can receive weighted traffic through YARP or Container Apps revision traffic.
- Background workers consume durable jobs for push notifications, Plaid refreshes, merchant enrichment, and other async work.

## Code Design Requirement

Keep infrastructure behind replaceable interfaces:

- `IRateLimitStore`: memory now, Redis later.
- `ICacheStore`: memory now, Redis later.
- `IQueueClient`: Postgres queue now, Service Bus later.
- `ICardCatalogProvider`: RewardsCC now, internal/alternate provider later.
- `IMerchantResolver`: Apple MapKit, Google Places, and cached merchant resolvers.
