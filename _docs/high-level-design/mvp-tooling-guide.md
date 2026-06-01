# MVP Tooling Guide

This is the short tool/service checklist for the MVP architecture.

## Before Starting Development

| Tool / Vendor | Services To Set Up |
|---|---|
| **Azure** | Resource group, Container Apps Environment, Azure Container Registry, Azure Key Vault, Azure Service Bus, Log Analytics / Application Insights |
| **Supabase** | Supabase project, Auth, Postgres database, Storage, service-role key |
| **Azure Cache for Redis** | Redis database |
| **Apple** | Apple Developer account, iOS app identifier, APNs key/certificate |
| **Google / Firebase** | Google Cloud project, Google Places API, Firebase project, FCM |
| **RewardsCC** | API account/key and plan/usage confirmation |
| **Plaid** | Developer account, API keys, product/pricing confirmation for card metadata-only linking |
| **Expo** | Expo project/app config for iOS and Android builds |

## During Development

| Tool / Vendor | Services / Setup |
|---|---|
| **Azure Gateway** | Public routing, gateway policies, TLS/WAF configuration |
| **Azure Container Apps** | .NET API container, event consumer container, scheduled catalog job container |
| **Azure Service Bus** | Topics, subscriptions, retry policy, dead-letter queue |
| **Azure Key Vault** | Store Plaid, RewardsCC, Supabase service-role, APNs, FCM, and other service secrets |
| **Supabase** | Database migrations, RLS policies, auth integration, storage buckets |
| **Azure Cache for Redis** | Rate-limit keys, short-lived cache, consumer idempotency keys |
| **Apple MapKit** | iOS nearby merchant lookup |
| **Google Places** | Android nearby merchant lookup, quotas, billing limits |
| **APNs / FCM** | Push token registration and push delivery testing |

## Post Development / Before Launch

| Tool / Vendor | Services / Setup |
|---|---|
| **Azure** | Production Container Apps revisions, budgets, alerts, health checks, log dashboards |
| **Azure Service Bus** | DLQ monitoring and alerting |
| **Supabase** | Production RLS review, backup/restore expectations, service-role access review |
| **Google Cloud** | Places API budget alerts and production key restrictions |
| **Apple** | TestFlight, production APNs validation |
| **Google Play / Firebase** | Android internal testing track, production FCM validation |
| **Plaid** | Production approval and final pricing confirmation |
| **RewardsCC** | Production API key and final usage/caching confirmation |
