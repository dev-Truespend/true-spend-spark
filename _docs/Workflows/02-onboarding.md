# Onboarding Workflow

## Scope

Phase 1 online onboarding for card connection, manual card entry, location permission, plan selection with Stripe checkout, notification setup, and final routing to Home. Plaid connection creates card metadata immediately; transaction import is handled later by the Transactions workflow through daily/user-triggered sync.

## Progress

| User story | Status | Notes |
|---|---|---|
| User can understand why TrueSpend needs card information during onboarding | Done |  |
| User can connect a bank with Plaid during onboarding | Done |  |
| User can search for a bank during Plaid onboarding | Done |  |
| User can pick a supported bank from common bank options | Done |  |
| User can cancel bank selection during onboarding | Done |  |
| User can understand that Plaid access is read-only | Done |  |
| User can complete Plaid bank authorization | Done | Going.Plaid SDK wired; `PlaidPlaceholderProvider` returns stub link token + Chase placeholder accounts when `Plaid:ClientId`/`Plaid:Secret` are empty |
| User can see connected cards after Plaid linking succeeds | Done | Placeholder returns two stub credit cards; real cards flow through once Plaid credentials are configured |
| User can see an error when Plaid linking fails | Done | Errors bubble through `ExternalProviderAppException` from `PlaidProvider`; mapper surfaces them to the UI |
| User can retry Plaid linking after a failure | Done | UI retry loops through the same mutation; provider failures propagate without state leaks |
| User can choose to add cards manually instead of using Plaid | Done |  |
| User can enter a card issuer manually from a catalog-backed dropdown | Done |  |
| User can select a card product manually from a catalog-backed dropdown | Done |  |
| User can request a missing bank/card during manual entry | Done |  |
| User can add a custom nickname for a manually added card | Done |  |
| User can add the last four digits for a manually added card | Done |  |
| User can add a card without entering a full card number | Done |  |
| User can set a manually added card as primary | Done |  |
| User can skip card connection and continue onboarding | Done |  |
| User can understand why TrueSpend needs location permission | Done |  |
| User can allow location access while using the app | Done |  |
| User can allow location access once | Done |  |
| User can deny location access and still continue with limited features | Done |  |
| User can recover from missing permissions | Done |  |
| User can pick Free, Basic, or Pro during onboarding | Done | `PlanPickerStep` renders 3 cards; Free advances with no checkout via `useOnboardingFlow.continueWithFree` |
| User can switch between monthly and annual billing during plan selection | Done |  |
| User can start a free trial from the selected paid plan via Stripe-hosted checkout (Basic 7-day, Pro 14-day) | Done | Trial length from `billing.plans.trial_days` |
| User can pay with Apple Pay on iOS when Stripe-hosted checkout supports it | Done |  |
| User can pay with Google Pay on Android when Stripe-hosted checkout supports it | Done |  |
| User can understand when billing starts and that cancellation is available | Done |  |
| User can enable notifications during onboarding | Done |  |
| User can finish onboarding and continue to the home screen | Done |  |
| User can see a loading state while cards sync | Done |  |
| User can see a clear fallback when location permission is denied | Done |  |
| User can see a clear fallback when Plaid linking fails | Done |  |

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 2.1 | Connect bank | Plaid entry, read-only messaging, manual option |
| 2.2 | Plaid bank picker | Plaid Link bank search/pick/cancel |
| 2.3 | Manual card | Catalog-backed issuer/product entry |
| 2.4 | Location permission | Platform prompt and reported state |
| 2.5 | Pick your plan | Basic/Pro, monthly/annual, Stripe checkout |
| 2.6 | Notifications and all set | Notification permission and onboarding completion |
| 5.1 | Cards list | Plaid success can route to connected cards |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can understand why TrueSpend needs card information during onboarding | 2.1 | UX copy only |
| Full | User can connect a bank with Plaid during onboarding | 2.1, 2.2 | Link token and exchange |
| Partial | User can search for a bank during Plaid onboarding | 2.2 | Plaid Link owned |
| Partial | User can pick a supported bank from common bank options | 2.2 | Plaid Link owned |
| Partial | User can cancel bank selection during onboarding | 2.2 | Plaid Link cancellation |
| Full | User can understand that Plaid access is read-only | 2.1, 5.4 | UX copy plus metadata-only scope |
| Full | User can complete Plaid bank authorization | 2.2 | Exchange public token |
| Full | User can see connected cards after Plaid linking succeeds | 5.1 | `PlaidConnectionResponse.cards` and cards refresh; later disconnect keeps cards visible with disconnected sync status |
| Full | User can see an error when Plaid linking fails | 2.2 | Link/exchange error state |
| Full | User can retry Plaid linking after a failure | 2.2 | Request a new link token |
| Full | User can choose to add cards manually instead of using Plaid | 2.1, 2.3 | Manual path |
| Full | User can enter a card issuer manually from a catalog-backed dropdown | 2.3 | Issuers cached by default |
| Full | User can select a card product manually from a catalog-backed dropdown | 2.3 | Products/search cached by default |
| Full | User can request a missing bank/card during manual entry | 2.3 | Creates catalog request for admin review |
| Full | User can add a custom nickname for a manually added card | 2.3 | Manual card request |
| Full | User can add the last four digits for a manually added card | 2.3 | Manual card request |
| Full | User can add a card without entering a full card number | 2.3 | No PAN field exists |
| Full | User can set a manually added card as primary | 2.3 | Manual card request |
| Full | User can skip card connection and continue onboarding | 2.3 | Skip endpoint |
| Full | User can understand why TrueSpend needs location permission | 2.4 | UX copy |
| Full | User can allow location access while using the app | 2.4 | Permission state report |
| Full | User can allow location access once | 2.4 | Report closest supported state |
| Full | User can deny location access and still continue with limited features | 2.4 | Denied state report |
| Full | User can recover from missing permissions | 2.4 | Permission state can be updated later |
| Full | User can pick Free, Basic, or Pro during onboarding | 2.5 | Plan/price APIs; Free skips checkout |
| Full | User can switch between monthly and annual billing during plan selection | 2.5 | Price query by period |
| Full | User can start a free trial from the selected paid plan via Stripe-hosted checkout (Basic 7-day, Pro 14-day) | 2.5, 8.3 | Checkout endpoint |
| Partial | User can pay with Apple Pay on iOS when Stripe-hosted checkout supports it | 2.5, 8.3 | Stripe hosted checkout owned |
| Partial | User can pay with Google Pay on Android when Stripe-hosted checkout supports it | 2.5, 8.3 | Stripe hosted checkout owned |
| Full | User can understand when billing starts and that cancellation is available | 2.5 | Plans/prices plus UX copy |
| Full | User can enable notifications during onboarding | 2.6 | Permission and settings APIs |
| Full | User can finish onboarding and continue to the home screen | 2.6 | Complete endpoint |
| Full | User can see a loading state while cards sync | 2.2 | Plaid exchange/sync loading |
| Full | User can see a clear fallback when location permission is denied | 2.4 | Continue with limited features |
| Full | User can see a clear fallback when Plaid linking fails | 2.2 | Error plus retry |

## Preconditions

- User is authenticated and routed into onboarding because `GET /api/v1/onboarding` returned incomplete.
- Plaid Link and Stripe hosted checkout are configured for mobile deep-link return.
- Dropdown/reference APIs use DB as source of truth and are cached by default.

## Primary API Sequence

```text
Enter onboarding
  GET /api/v1/onboarding
  GET /api/v1/cards/limits

Plaid path
  POST /api/v1/plaid/link-token
  Plaid Link flow
  POST /api/v1/plaid/exchange-token
  POST /api/v1/onboarding
  GET /api/v1/cards

Manual card path
  GET /api/v1/card-catalog/issuers
  GET /api/v1/card-catalog/products or /search
  POST /api/v1/cards/manual
  POST /api/v1/onboarding

Missing manual card path
  POST /api/v1/card-catalog/requests
  POST /api/v1/onboarding

Permissions and billing
  POST /api/v1/permissions
  GET /api/v1/billing/plans
  GET /api/v1/billing/prices
  POST /api/v1/billing/checkout
  Stripe return/webhook
  GET /api/v1/billing/subscription
  GET /api/v1/entitlements

Notifications and finish
  POST /api/v1/permissions
  POST /api/v1/devices
  GET /api/v1/notification-settings/types
  POST /api/v1/notification-settings
  POST /api/v1/onboarding/complete
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load onboarding state | `GET /api/v1/onboarding` | `OnboardingResponse` | Sync API | None | Read `app.onboarding_states`, `lookup.onboarding_steps` | Mobile onboarding cache; lookup cache |
| Load card limits | `GET /api/v1/cards/limits` | `CardLimitsResponse`: plaid/manual used and limits | Sync API | None | Read `finance.user_cards`, `billing.subscriptions`, plan feature tables | Short mobile cache; server entitlement cache |
| Start Plaid Link | `POST /api/v1/plaid/link-token` | `PlaidLinkTokenResponse`: `linkToken`, `expiration` | Sync API | None | May read/create Plaid session provider state | Do not persist token beyond expiration |
| Finish Plaid Link | `POST /api/v1/plaid/exchange-token` | `ExchangePlaidTokenRequest.publicToken` -> `PlaidConnectionResponse` | Sync API + Event | `finance.user_card.created` for linked cards; transaction sync handled by `05-transactions.md` | Write `finance.plaid_items`, `finance.plaid_accounts`, `finance.user_cards`; read catalog/lookup tables | Invalidate cards, limits, recommendations |
| Mark Plaid step done | `POST /api/v1/onboarding` | `UpdateOnboardingRequest`: `cardConnectionPlaid`, `currentStepCode` | Sync API | None | Write `app.onboarding_states` | Update mobile onboarding cache |
| Skip card linking | `POST /api/v1/onboarding/skip-card-linking` | Empty -> `OnboardingResponse` | Sync API | None | Write `app.onboarding_states` | Update onboarding cache |
| Load manual dropdowns | `GET /api/v1/card-catalog/issuers`, `GET /api/v1/card-catalog/products`, `GET /api/v1/card-catalog/search` | `IssuersResponse`, `CardProductsResponse` | Sync API | None | Read `catalog.card_issuers`, `catalog.card_products`, lookup reward/network tables | Mobile persistent and server cache; DB-first for new values |
| Add manual card | `POST /api/v1/cards/manual` | `CreateManualCardRequest`: `cardProductId`, `issuerId`, `nickname`, `lastFour`, `isPrimary` -> `CardDetailResponse` | Sync API + Event | `finance.user_card.created` | Write `finance.user_cards`; read `catalog.card_products`, `catalog.card_issuers`, `lookup.card_sources` | Invalidate cards, limits, recommendations |
| Request missing manual card | `POST /api/v1/card-catalog/requests` | `CreateCardProductRequest`: `issuerName`, `cardName`, `createUserCard`, `nickname`, `lastFour`, `isPrimary` -> `CardProductRequestResponse` | Sync API + Event | `catalog.card_product_request.created`; optional `finance.user_card.created` | Normalize names, write `catalog.card_product_requests`; optionally write `finance.user_cards` with custom names and null `card_product_id` | Update pending request cache; if user card is created, update cards cache and invalidate limits/recommendations |
| Report location permission | `POST /api/v1/permissions` | `UpdatePermissionsRequest.deviceId`, `location.state`, `location.accuracy`, `rawPlatformPayload` -> `PermissionsResponse` | Sync API | None | Write `app.user_device_permissions`; update `app.user_permissions`; read `lookup.permission_states` | Update permissions cache; lookup cache |
| Load plan options | `GET /api/v1/billing/countries`, `GET /api/v1/billing/plans`, `GET /api/v1/billing/prices`, `GET /api/v1/billing/features` | `CountriesResponse`, `PlansResponse`, `PlanPricesResponse`, `PlanFeaturesResponse` | Sync API | None | Read `billing.countries`, `billing.plans`, `billing.plan_prices`, `billing.features`, `billing.plan_features`, `lookup.periods` | Server and mobile reference cache; DB-first for new plan/reference values |
| Start checkout | `POST /api/v1/billing/checkout` | `CreateCheckoutSessionRequest`: `planCode`, `periodCode`, `returnContextCode: 'onboarding'` -> `HostedBillingResponse.url`. Server resolves Stripe `success_url`/`cancel_url` back to Home (2.5 is the last onboarding step). | Sync API | Stripe checkout session created | Read/write `billing.stripe_customers`; read plan/price tables | No URL cache; plans/prices remain cached |
| Apply checkout result | Stripe webhook, then `GET /api/v1/billing/subscription`, `GET /api/v1/entitlements` | `SubscriptionResponse`, `EntitlementsResponse` | Webhook Driven | `billing.subscription.updated` | Write `billing.subscriptions`, `billing.payment_methods`, `billing.stripe_webhook_events`; read entitlements tables | Invalidate billing, entitlements, card limits |
| Enable notifications | `POST /api/v1/permissions`, `POST /api/v1/notification-settings` | `UpdatePermissionsRequest.deviceId`, `notifications.state`, `UpdateNotificationSettingsRequest` | Sync API | None | Write `app.user_device_permissions`; update `app.user_permissions`; write `messaging.notification_preferences` | Update permissions and notification settings cache |
| Register/update push device | `POST /api/v1/devices` or auth bootstrap device payload | `RegisterDeviceRequest` -> `DeviceResponse` | Sync API | None | Write/update `messaging.devices`; read `lookup.device_platforms` | Keep current `deviceId`; update local device metadata |
| Load notification types | `GET /api/v1/notification-settings/types` | `NotificationTypesResponse`: `types` | Sync API | None | Read `messaging.notification_types`, `messaging.notification_type_preferences` | Dropdown/reference cache by default |
| Finish onboarding | `POST /api/v1/onboarding/complete` | Empty -> `OnboardingResponse.completed` | Sync API | None | Write `app.onboarding_states` | Invalidate onboarding route cache; route to Home |

## Contracts Used

- `OnboardingResponse`, `UpdateOnboardingRequest`
- `PlaidLinkTokenResponse`, `ExchangePlaidTokenRequest`, `PlaidConnectionResponse`
- `CardLimitsResponse`, `CreateManualCardRequest`, `CardDetailResponse`
- `CreateCardProductRequest`, `CardProductRequestResponse`
- `IssuersResponse`, `CardProductsResponse`
- `PermissionsResponse`, `UpdatePermissionsRequest`
- `CountriesResponse`, `PlansResponse`, `PlanPricesResponse`, `PlanFeaturesResponse`
- `CreateCheckoutSessionRequest`, `HostedBillingResponse`, `SubscriptionResponse`, `EntitlementsResponse`
- `NotificationSettingsResponse`, `UpdateNotificationSettingsRequest`, `NotificationTypesResponse`
- `RegisterDeviceRequest`, `DeviceResponse`

## Tables Involved

| Role | Tables |
|---|---|
| Onboarding state | `app.onboarding_states`, `lookup.onboarding_steps` |
| Permissions | `app.user_device_permissions`, `app.user_permissions`, `lookup.permission_states` |
| Plaid/card writes | `finance.plaid_items`, `finance.plaid_accounts`, `finance.user_cards`, `lookup.plaid_item_statuses`, `lookup.card_sources` |
| Catalog dropdowns and requests | `catalog.card_issuers`, `catalog.card_products`, `catalog.card_product_requests`, `catalog.reward_rules`, `catalog.categories`, `lookup.card_networks`, `lookup.reward_currencies` |
| Billing | `billing.countries`, `billing.plans`, `billing.plan_prices`, `billing.features`, `billing.plan_features`, `billing.stripe_customers`, `billing.subscriptions`, `billing.payment_methods`, `billing.stripe_webhook_events` |
| Notifications | `messaging.notification_preferences`, `messaging.notification_types`, `messaging.notification_type_preferences`, `messaging.devices` |

## Cache Strategy

- Catalog, lookup, plan, price, feature, and notification type dropdown/reference APIs are cached by default on server and mobile.
- New reference values must be written to DB first, then server cache is updated or invalidated.
- Mobile caches onboarding state, permissions, card limits, cards, selected billing period, and notification settings after successful reads/writes.
- Permission writes are stored per device first, then summarized into `app.user_permissions` for onboarding/profile display.
- Missing card requests are written to DB first, then the mobile pending-request cache is updated from the response; if a temporary user card is created, the cards cache is updated too.
- Checkout URLs and Plaid link tokens are not cached.

## Sync vs Async Decisions

- Onboarding state, manual card creation, missing card request submission, permission reporting, notification settings, and completion are synchronous.
- Plaid exchange is synchronous for the mobile response, then emits card-created side effects.
- Stripe checkout creation is synchronous; subscription activation is webhook driven.
- Analytics/recommendation recomputation after cards are added is event-backed and does not block onboarding.

## Invalidation Triggers

| Trigger | Invalidation |
|---|---|
| `finance.user_card.created` | Cards, card limits, recommendations, Home empty state |
| `catalog.card_product_request.created` | Pending catalog request cache |
| Admin catalog request approved/merged/rejected | Server catalog cache, mobile catalog refresh/TTL, affected cards and recommendations |
| `billing.subscription.updated` | Billing, entitlements, card limits, plan status |
| Permission update | Permissions and onboarding step UI |
| Notification settings update | Notification settings cache |
| Onboarding complete | Onboarding cache and initial route decision |
| Reference/catalog value added | Server reference cache, then mobile refresh/TTL |

## Loading And Error States

- Plaid link-token, Plaid exchange, manual card save, missing card request, checkout creation, and onboarding completion show blocking loading.
- Plaid cancellation returns to 2.1/2.2 without marking card connection complete.
- Plaid exchange failure shows retry and does not write onboarding Plaid completion.
- Location denial is saved and allows onboarding to continue with limited features.
- Stripe return may show pending until webhook updates subscription; refresh subscription/entitlements.
- Notification permission denial still allows onboarding completion.
- Missing card request failure keeps the form values and does not mark the manual card step complete.

## Design Gaps

| Gap | Owner | Notes |
|---|---|---|
| None currently open. |  |  |
