# 09. Billing And Entitlements

## Scope

Phase 1 online workflow for subscription comparison, Stripe-hosted checkout, Stripe customer portal, payment method display, and entitlement refresh.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 2.5 | Plan selection | Same hosted checkout flow during onboarding |
| 8.1 | Profile | Current plan badge |
| 8.3 | Billing & Pro | Plan comparison, upgrade, manage subscription |
| 5.1, 5.3 | Cards limits | Entitlement-driven upgrade guidance |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can view current plan status | 8.1, 8.3 | Subscription and entitlement APIs |
| Full | User can compare Basic and Pro plans from billing settings | 8.3 | Plans, prices, features |
| Full | User can understand Basic plan limits | 8.3 | Features and entitlements |
| Full | User can understand Pro plan benefits | 8.3 | Features and entitlements |
| Full | User can upgrade to Pro from billing settings | 8.3 | Stripe checkout |
| Full | User can open Stripe-hosted checkout to start or upgrade a paid plan | 8.3, 2.5 | `POST /billing/checkout` |
| Partial | User can use Apple Pay from Stripe-hosted checkout on iOS when available | 8.3, 2.5 | Stripe-hosted behavior |
| Partial | User can use Google Pay from Stripe-hosted checkout on Android when available | 8.3, 2.5 | Stripe-hosted behavior |
| Full | User can manage an existing subscription from mobile via the Stripe customer portal | 8.3 | `POST /billing/portal` |
| Full | User can cancel a subscription from billing settings via the Stripe customer portal | 8.3 | Stripe-hosted behavior |
| Full | User can update or remove a payment method via the Stripe customer portal | 8.3 | Stripe-hosted behavior |
| Full | User can see entitlement changes reflected in the app shortly after Stripe webhook processing | 8.3, 5.1 | Webhook + refresh |
| Full | User can return from Stripe checkout to an in-app confirmation state | 8.3, 2.5 | Refresh subscription/entitlements |
| Full | User can understand annual pricing and savings | 8.3 | Prices by period |
| Full | User can view payment method details | 8.3 | Cached Stripe payment methods |
| Full | User can see upgrade guidance when more links require a higher plan | 5.1, 5.3, 8.3 | Entitlements |
| Full | User can be redirected to billing when opening a higher-plan feature | 5.1, 5.3, 8.3 | Navigation to billing |

## Preconditions

User is authenticated and has a profile country or selected country for pricing.

## Primary API Sequence

1. Load billing screen: `GET /billing/subscription`, `GET /entitlements`, `GET /billing/plans`, `GET /billing/prices`, `GET /billing/features`, `GET /billing/payment-methods`.
2. Toggle monthly/annual: call `GET /billing/prices?countryCode=&periodCode=`.
3. Upgrade/start trial: `POST /billing/checkout`, open returned Stripe URL.
4. Return from checkout: refresh `GET /billing/subscription` and `GET /entitlements`.
5. Manage/cancel/update payment method: `POST /billing/portal`, open returned Stripe URL.

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load subscription | `GET /api/v1/billing/subscription` | `SubscriptionResponse`: `planCode`, `status`, `trialEnd`, `currentPeriodEnd`, `cancelAtPeriodEnd` | Sync API | None | Read `billing.subscriptions`, `billing.plans`, `lookup.subscription_statuses` | Short mobile cache; server cache by user |
| Load entitlements | `GET /api/v1/entitlements` | `EntitlementsResponse`: `planCode`, `cardLinkLimit`, `aiInsightsEnabled`, `unlimitedCards` | Sync API | None | Read `billing.subscriptions`, `billing.plan_features`, `billing.features` | Server entitlement cache; short mobile cache |
| Load plan comparison | `GET /api/v1/billing/plans`, `GET /api/v1/billing/features` | `PlansResponse.plans` (`PlanVm[]`), `PlanFeaturesResponse.features` (`PlanFeatureVm[]` with embedded `valuesByPlan: PlanFeatureValueVm[]`) | Sync API | None | Read `billing.plans`, `billing.features`, `billing.plan_features` | Dropdown/reference cache by default |
| Load pricing | `GET /api/v1/billing/prices?countryCode=&periodCode=` | `PlanPricesResponse.plans` (`PlanPriceVm[]`) | Sync API | None | Read `billing.plan_prices`, `billing.countries`, `lookup.periods` | Server/mobile reference cache; invalidate on price change |
| Load payment methods | `GET /api/v1/billing/payment-methods` | `PaymentMethodsResponse`: `paymentMethods` | Sync API | None | Read `billing.payment_methods`, `lookup.payment_method_types` | Short mobile cache; Stripe is source through webhook/portal |
| Start checkout | `POST /api/v1/billing/checkout` | `CreateCheckoutSessionRequest`: `planCode`, `periodCode`, `returnContextCode` ∈ {`billing`, `onboarding`} -> `HostedBillingResponse.url`. Server resolves deep-link `success_url`/`cancel_url` from `returnContextCode`: `billing` → screen 8.3, `onboarding` → Home. | Sync API | Stripe checkout lifecycle is provider-driven (see [webhook-handlers.md](webhook-handlers.md#stripe-event-mapping)) | Read/write `billing.stripe_customers`; read `billing.plan_prices` | Do not cache checkout URL |
| Return from checkout | `GET /api/v1/billing/subscription`, `GET /api/v1/entitlements` | `SubscriptionResponse`, `EntitlementsResponse` | Webhook Driven + Sync API refresh | `billing.subscription.updated` produced by Stripe webhook handler in [webhook-handlers.md](webhook-handlers.md#stripe-event-mapping) -> `EntitlementCacheInvalidator` | Write `billing.subscriptions`, `billing.payment_methods`, `billing.stripe_webhook_events` | Invalidate billing and entitlement cache |
| Open customer portal | `POST /api/v1/billing/portal` | Empty request -> `HostedBillingResponse.url` | Sync API | Stripe portal lifecycle is provider-driven (see [webhook-handlers.md](webhook-handlers.md#stripe-event-mapping)) | Read/write `billing.stripe_customers` | Do not cache portal URL |
| Return from portal | `GET /api/v1/billing/subscription`, `GET /api/v1/billing/payment-methods`, `GET /api/v1/entitlements` | Subscription, payment method, entitlement responses | Webhook Driven + Sync API refresh | `billing.subscription.updated` -> `EntitlementCacheInvalidator`, `billing.payment_method.updated` -> `BillingPaymentMethodCacheInvalidator` (both defined in [webhook-handlers.md](webhook-handlers.md#consumers-triggered)) | Write billing provider cache tables through webhook consumer | Invalidate billing, payment methods, entitlements |

## Contracts Used

| Contract | Fields Used |
|---|---|
| `PlansResponse` | `plans` (`PlanVm[]`) |
| `PlanPricesResponse` | `plans` (`PlanPriceVm[]`) for selected country/period |
| `PlanFeaturesResponse` | `features` (`PlanFeatureVm[]` with embedded `valuesByPlan`) |
| `PlanVm` | `code`, `displayName`, `description`, `trialDays` |
| `PlanPriceVm` | `planCode`, `countryCode`, `periodCode`, `amount` (`MoneyVm`), `stripePriceId` |
| `PlanFeatureVm` | `code`, `displayName`, `description`, `valueType`, `valuesByPlan` |
| `PlanFeatureValueVm` | `planCode`, `value` |
| `SubscriptionResponse` | `planCode`, `status`, `trialEnd`, `currentPeriodEnd`, `cancelAtPeriodEnd` |
| `PaymentMethodsResponse` | `paymentMethods` |
| `CreateCheckoutSessionRequest` | `planCode`, `periodCode`, `returnContextCode` |
| `HostedBillingResponse` | `url` |
| `EntitlementsResponse` | `planCode`, `cardLinkLimit`, `aiInsightsEnabled`, `unlimitedCards` |

## Tables Involved

| Role | Tables |
|---|---|
| Billing reference | `billing.countries`, `billing.plans`, `billing.plan_prices`, `billing.features`, `billing.plan_features` |
| User billing state | `billing.subscriptions`, `billing.stripe_customers`, `billing.payment_methods` |
| Provider audit | `billing.stripe_webhook_events` |
| Lookup/reference | `lookup.periods`, `lookup.subscription_statuses`, `lookup.payment_method_types` |
| Profile country | `app.profiles` |

## Cache Strategy

- Plans, prices, features, countries, periods, and payment method type lookups are cached by default.
- Entitlements are server cached with short TTL and explicit invalidation on Stripe webhook processing.
- Subscription/payment method state is local DB provider cache; mobile caches briefly and refreshes after checkout/portal return.
- New billing reference values must be written to DB first, then server cache invalidated/updated.

## Sync vs Async Decisions

- Checkout and portal URL creation are synchronous.
- Subscription/payment method changes are webhook driven because Stripe owns final state.
- Entitlement recalculation happens during webhook processing and is read synchronously by mobile.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| Stripe subscription webhook | Subscription, entitlements, card limits, billing screen |
| Stripe payment method webhook | Payment methods |
| Plan/price/feature admin change | Billing reference cache and mobile reference refresh |
| Checkout/portal return | Force refresh subscription, payment methods, entitlements |

## Loading And Error States

- Initial load: show current cached plan if available; skeleton prices/features.
- Pricing unavailable: block checkout and show retry.
- Checkout/portal URL creation failure: remain in app and show retry.
- Stripe return before webhook completion: show processing state and poll/refresh subscription.
- Entitlement refresh failure: keep previous entitlement state and retry before gated action.

## Design Gaps

None currently open.
