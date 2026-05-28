# New API Architecture

Target backend: ASP.NET Core Web API.

This guide designs the API layer required by `_docs/UserStory/mobile-user-stories.md`, the current Supabase Edge Function audit, mobile mockups, and launch guides. It intentionally avoids database table design.

## Common Contract

Base path: `/api/v1`

Authentication:

- Authentication is handled by Supabase Auth directly from the mobile app.
- Supported sign-in methods are Google, Apple, phone OTP, and email OTP.
- Password sign-up, password sign-in, password reset, and password change are not part of this product.
- The .NET API validates Supabase JWTs and uses the Supabase user id for ownership checks.
- User routes require `Authorization: Bearer <supabase_access_token>`.
- Admin routes require the authenticated user to have `admin`.
- Developer monitoring routes require `developer` or `admin`.
- Webhooks do not use user auth; they must verify provider signatures.
- Internal jobs require a service credential or scheduler secret.

Headers:

| Header | Direction | Required | Purpose |
|---|---:|---:|---|
| `Authorization` | request | user/admin routes | User access token |
| `Idempotency-Key` | request | write/retry routes | Mobile retry and offline sync safety |
| `X-Correlation-Id` | request/response | recommended | Cross-service tracing |
| `X-Device-Id` | request | mobile routes | Device-specific permissions, push, offline sync |

Success envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "correlationId": "uuid",
    "serverTime": "2026-05-26T12:00:00Z"
  }
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount is required.",
    "details": {},
    "correlationId": "uuid"
  }
}
```

Common error codes:

`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `EXTERNAL_PROVIDER_ERROR`, `PLAID_ERROR`, `STRIPE_ERROR`, `MAPS_ERROR`, `OCR_ERROR`, `SYNC_CONFLICT`, `FEATURE_REQUIRES_PRO`, `DEVICE_PERMISSION_REQUIRED`.

Common DTOs:

```json
{
  "money": {
    "amount": 24.99,
    "currency": "USD"
  },
  "geoPoint": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracyMeters": 18
  },
  "pageRequest": {
    "cursor": "opaque",
    "limit": 25
  },
  "pageResponse": {
    "items": [],
    "nextCursor": "opaque",
    "hasMore": true
  }
}
```

## External Provider Calls

These are the provider calls the .NET API should hide behind server-side services.

| Provider | Used for | Server-side calls |
|---|---|---|
| Plaid | Bank/card linking, read-only account import, transaction sync, reconnect, disconnect, institution catalog sync | `POST /link/token/create`, `POST /item/public_token/exchange`, `POST /accounts/get`, `POST /accounts/balance/get`, `POST /transactions/sync`, `POST /item/remove`, `POST /webhook_verification_key/get`, Plaid institution/catalog endpoints available to the worker service |
| Stripe | Trial/Pro checkout, subscription management, billing portal, subscription lifecycle webhooks | `POST /v1/checkout/sessions`, `POST /v1/billing_portal/sessions`, `POST /v1/subscriptions/{id}`, Stripe webhook signature verification |
| Google Maps Platform | Place autocomplete, nearby merchant detection, place details, geocoding, geolocation fallback, directions if needed | `POST https://places.googleapis.com/v1/places:autocomplete`, `POST https://places.googleapis.com/v1/places:searchNearby`, `GET https://places.googleapis.com/v1/places/{placeId}`, `GET https://maps.googleapis.com/maps/api/geocode/json`, `POST https://www.googleapis.com/geolocation/v1/geolocate` |
| Google Vision or OCR provider | Receipt extraction | Vision document text detection or the configured OCR provider behind `ReceiptsController` |
| Push provider | iOS/Android notifications | FCM HTTP v1 for Android; APNS for iOS or a unified push gateway |
| Credit Karma | Credit profile/card-offer enrichment | No public consumer API is assumed. Treat as unsupported unless a private partner contract exists. Prefer Plaid/manual card data and internal card rewards catalog. |

## AuthController

Status: handled by Supabase Auth SDK, not custom .NET APIs.

Stories covered: app entry, Google sign-in, Apple sign-in, phone OTP sign-in, email OTP sign-in, session persistence, sign out, expired auth recovery, OAuth/deep-link return.

Supabase Auth client calls:

- Google OAuth sign-in from mobile.
- Apple OAuth sign-in from mobile.
- Phone OTP send and verify.
- Email OTP send and verify.
- Session refresh.
- Sign out.

The .NET API does not store passwords, receive passwords, reset passwords, or create password credentials.

### GET `/auth/me`

Auth: user.

Purpose: validate the Supabase JWT against the .NET API and return app-specific routing state.

Request: none.

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "phone": "+15551234567",
  "providers": ["google"],
  "roles": ["user"],
  "onboardingRequired": true,
  "homeRoute": "/onboarding"
}
```

### POST `/auth/session`

Auth: user.

Purpose: record app-specific session/device metadata after Supabase Auth succeeds.

```json
{
  "deviceId": "ios-device-uuid",
  "provider": "apple",
  "appVersion": "1.0.0",
  "platform": "ios"
}
```

Response:

```json
{
  "recorded": true,
  "onboardingRequired": true,
  "homeRoute": "/onboarding"
}
```

## AppController

Stories covered: splash screen, app bootstrap, loading states, empty states, feature gates, mobile app icons/splash readiness, app navigation after external auth.

### GET `/app/bootstrap`

Auth: optional; richer data when authenticated.

Request: none.

Response:

```json
{
  "minimumSupportedVersion": "1.0.0",
  "latestVersion": "1.1.0",
  "maintenance": false,
  "featureFlags": {
    "receiptOcr": true,
    "onlineRecommendations": true,
    "creditKarmaImport": false
  },
  "currentUser": {
    "userId": "uuid",
    "onboardingComplete": true,
    "plan": "pro",
    "roles": ["user"]
  }
}
```

### POST `/app/deep-links/resolve`

Auth: optional.

Request:

```json
{
  "url": "truespend://auth/callback?code=abc",
  "deviceId": "ios-device-uuid"
}
```

Response:

```json
{
  "type": "oauthCallback",
  "targetRoute": "/auth/callback",
  "parameters": {
    "code": "abc"
  }
}
```

## OnboardingController

Stories covered: card-need education, Plaid/manual choice, bank picker, manual card starter, skip card connection, location explanation, complete onboarding without bank link.

### GET `/onboarding/state`

Auth: user.

Request: none.

Response:

```json
{
  "status": "in_progress",
  "steps": {
    "cardChoice": "plaid",
    "plaidLinked": false,
    "manualCardAdded": false,
    "locationPermissionAsked": true,
    "notificationPermissionAsked": false
  },
  "nextStep": "connectCard"
}
```

### PUT `/onboarding/state`

Auth: user.

Request:

```json
{
  "cardChoice": "manual",
  "locationPermissionAsked": true,
  "notificationPermissionAsked": false,
  "skippedCardConnection": false
}
```

Response:

```json
{
  "status": "in_progress",
  "nextStep": "manualCard"
}
```

### POST `/onboarding/complete`

Auth: user.

Request:

```json
{
  "completedStepIds": ["welcome", "card-choice", "location"],
  "allowLimitedMode": true
}
```

Response:

```json
{
  "onboardingComplete": true,
  "nextRoute": "/home",
  "limitedMode": false
}
```

## DevicesController

Stories covered: permission prompts and fallbacks, push tokens, iOS/Android push, camera/location status, biometric unlock readiness, device-specific settings.

### PUT `/devices/current`

Auth: user.

Request:

```json
{
  "deviceId": "ios-device-uuid",
  "platform": "ios",
  "appVersion": "1.0.0",
  "osVersion": "18.0",
  "timezone": "America/New_York",
  "locale": "en-US"
}
```

Response:

```json
{
  "deviceId": "ios-device-uuid",
  "registered": true
}
```

### PUT `/devices/current/permissions`

Auth: user.

Request:

```json
{
  "location": "whileUsing",
  "backgroundLocation": "denied",
  "notifications": "authorized",
  "camera": "authorized",
  "biometrics": "available"
}
```

Response:

```json
{
  "permissions": {
    "location": "whileUsing",
    "backgroundLocation": "denied",
    "notifications": "authorized",
    "camera": "authorized",
    "biometrics": "available"
  },
  "limitedFeatures": ["backgroundGeofencing"]
}
```

### PUT `/devices/current/push-token`

Auth: user.

External calls: none at registration; push provider used later.

Request:

```json
{
  "deviceId": "ios-device-uuid",
  "provider": "apns",
  "token": "push-token",
  "environment": "production"
}
```

Response:

```json
{
  "pushEnabled": true
}
```

## PlaidController

Stories covered: Plaid onboarding, bank search from internal institution catalog, read-only explanation, successful link, link errors/retry, reconnect/update mode, disconnect institution, linked status. Imported transaction viewing is Phase 2 through `TransactionsController`.

### GET `/plaid/institutions`

Auth: user.

External calls: none at request time. Results come from internal tables populated by `PlaidInstitutionCatalogJob`.

Request query: `search=chase&country=US&limit=20`.

Response:

```json
{
  "institutions": [
    {
      "institutionId": "ins_56",
      "name": "Chase",
      "logoUrl": "https://cdn.example/chase.png",
      "oauth": true,
      "products": ["transactions", "liabilities"],
      "source": "plaid_catalog",
      "lastSyncedAt": "2026-05-26T02:00:00Z"
    }
  ]
}
```

### POST `/plaid/link-token`

Auth: user.

External calls: Plaid `POST /link/token/create`.

Request:

```json
{
  "flow": "new",
  "redirectUri": "truespend://plaid/callback",
  "platform": "ios"
}
```

Response:

```json
{
  "linkToken": "link-production-...",
  "expiresAt": "2026-05-26T16:00:00Z",
  "readOnly": true
}
```

### POST `/plaid/items/{itemId}/link-token`

Auth: user; item must belong to user.

External calls: Plaid `POST /link/token/create` in update mode.

Request:

```json
{
  "reason": "ITEM_LOGIN_REQUIRED",
  "redirectUri": "truespend://plaid/callback"
}
```

Response:

```json
{
  "linkToken": "link-production-...",
  "expiresAt": "2026-05-26T12:30:00Z",
  "mode": "update"
}
```

### POST `/plaid/exchange-public-token`

Auth: user.

External calls: Plaid `POST /item/public_token/exchange`, then `POST /accounts/get`.

Request:

```json
{
  "publicToken": "public-production-...",
  "metadata": {
    "institutionId": "ins_56",
    "institutionName": "Chase",
    "accounts": [
      {
        "id": "plaid-account-id",
        "name": "Freedom Flex",
        "mask": "1234",
        "type": "credit",
        "subtype": "credit card"
      }
    ]
  }
}
```

Response:

```json
{
  "itemId": "uuid",
  "institution": {
    "name": "Chase",
    "plaidInstitutionId": "ins_56"
  },
  "cards": [
    {
      "cardId": "uuid",
      "displayName": "Chase Freedom Flex",
      "last4": "1234",
      "source": "plaid",
      "syncStatus": "pending"
    }
  ]
}
```

### POST `/plaid/items/{itemId}/sync`

Auth: user; item must belong to user.

External calls: Plaid `POST /transactions/sync` with stored cursor.

Request:

```json
{
  "force": false
}
```

Response:

```json
{
  "itemId": "uuid",
  "added": 24,
  "modified": 2,
  "removed": 1,
  "hasMore": false,
  "nextCursorStored": true,
  "syncStatus": "succeeded"
}
```

### POST `/plaid/items/{itemId}/refresh-accounts`

Auth: user; item must belong to user.

External calls: Plaid `POST /accounts/balance/get`.

Request:

```json
{
  "includeBalances": true
}
```

Response:

```json
{
  "itemId": "uuid",
  "cardsUpdated": 2,
  "lastSyncAt": "2026-05-26T12:00:00Z"
}
```

### DELETE `/plaid/items/{itemId}`

Auth: user; item must belong to user.

External calls: Plaid `POST /item/remove`.

Request:

```json
{
  "removeImportedCards": false
}
```

Response:

```json
{
  "disconnected": true,
  "cardsAffected": 2
}
```

### POST `/webhooks/plaid`

Auth: Plaid webhook signature only.

External calls: Plaid `POST /webhook_verification_key/get`, optionally `POST /transactions/sync`.

Request:

```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "SYNC_UPDATES_AVAILABLE",
  "item_id": "plaid-item-id",
  "environment": "production"
}
```

Response:

```json
{
  "received": true,
  "queued": true
}
```

## CardsController

Stories covered: view cards, card visuals, primary card, add/edit/delete manual card, reward multipliers, card terms, Plaid/manual source, last sync status, refresh linked cards, use manual cards in recommendations, no full card number.

### GET `/cards`

Auth: user.

Request query: `source`, `includeRewards=true`, `includeSyncStatus=true`.

Response:

```json
{
  "cards": [
    {
      "cardId": "uuid",
      "displayName": "Chase Freedom Flex",
      "issuer": "Chase",
      "productName": "Freedom Flex",
      "nickname": "Groceries card",
      "last4": "1234",
      "source": "plaid",
      "isPrimary": true,
      "visual": {
        "network": "visa",
        "color": "#1F5EFF"
      },
      "syncStatus": {
        "status": "succeeded",
        "lastSyncAt": "2026-05-26T12:00:00Z"
      },
      "rewards": [
        {
          "category": "grocery",
          "multiplier": 5,
          "rewardType": "points",
          "cap": "Quarterly rotating cap"
        }
      ]
    }
  ]
}
```

### GET `/cards/{cardId}`

Auth: user; card must belong to user.

Request: none.

Response:

```json
{
  "cardId": "uuid",
  "displayName": "Chase Freedom Flex",
  "issuer": "Chase",
  "productName": "Freedom Flex",
  "last4": "1234",
  "source": "manual",
  "termsSummary": "5x rotating categories, 3x dining, 1x other",
  "rewards": [],
  "recentTransactions": []
}
```

### POST `/cards/manual`

Auth: user.

Request:

```json
{
  "issuer": "American Express",
  "productName": "Blue Cash Preferred",
  "nickname": "Grocery card",
  "last4": "9876",
  "network": "amex",
  "isPrimary": false,
  "rewards": [
    {
      "category": "grocery",
      "multiplier": 6,
      "rewardType": "cashback",
      "cap": "$6,000 per year"
    }
  ]
}
```

Response:

```json
{
  "cardId": "uuid",
  "displayName": "Grocery card",
  "source": "manual"
}
```

### PUT `/cards/{cardId}`

Auth: user; card must belong to user; only manual fields editable unless explicitly allowed.

Request:

```json
{
  "nickname": "Everyday groceries",
  "last4": "9876",
  "isPrimary": true
}
```

Response:

```json
{
  "cardId": "uuid",
  "updated": true
}
```

### PUT `/cards/{cardId}/rewards`

Auth: user; card must belong to user.

Request:

```json
{
  "rewards": [
    {
      "category": "dining",
      "multiplier": 3,
      "rewardType": "points",
      "effectiveFrom": "2026-04-01",
      "effectiveTo": "2026-06-30"
    }
  ]
}
```

Response:

```json
{
  "cardId": "uuid",
  "rewardsUpdated": true
}
```

### DELETE `/cards/{cardId}`

Auth: user; manual card or permitted Plaid card disconnect action.

Request:

```json
{
  "deleteTransactions": false
}
```

Response:

```json
{
  "deleted": true
}
```

### POST `/cards/{cardId}/refresh`

Auth: user; card must belong to user.

External calls: Plaid account refresh when linked.

Request:

```json
{
  "includeTransactions": true
}
```

Response:

```json
{
  "cardId": "uuid",
  "syncStatus": "queued"
}
```

## CardCatalogController

Stories covered: manual issuer/product dropdowns, manual card product dropdowns, card reward assumptions, missing rewards correction, Credit Karma catalog import fallback.

Catalog source: these endpoints read from internal tables populated by `CreditKarmaCardCatalogJob` and `CreditKarmaCardCatalogReconcileJob`. They do not call Credit Karma during the user request.

### GET `/card-catalog/issuers`

Auth: user.

Request query: `search=cha`.

Response:

```json
{
  "issuers": [
    {
      "issuerId": "chase",
      "name": "Chase"
    }
  ]
}
```

### GET `/card-catalog/products`

Auth: user.

Request query: `issuerId=chase&search=freedom`.

Response:

```json
{
  "products": [
    {
      "productId": "chase-freedom-flex",
      "issuerId": "chase",
      "name": "Freedom Flex",
      "networkOptions": ["visa", "mastercard"],
      "defaultRewards": []
    }
  ]
}
```

### GET `/integrations/credit-karma/status`

Auth: user.

External calls: none unless a private Credit Karma partner integration exists.

Request: none.

Response:

```json
{
  "provider": "creditKarma",
  "available": false,
  "mode": "unsupported",
  "message": "No public Credit Karma API is configured. Use Plaid linking or manual card setup."
}
```

## MerchantsController

Stories covered: detected merchant, online merchant search, online purchase intent, recent merchants, open merchant website, incomplete merchant/reward coverage warnings.

### GET `/merchants/search`

Auth: user.

External calls: Google Places Autocomplete for local search; internal catalog for online merchants.

Request query: `q=target&type=online|local&latitude=37.77&longitude=-122.42&sessionToken=uuid`.

Response:

```json
{
  "merchants": [
    {
      "merchantId": "uuid",
      "name": "Target",
      "type": "local",
      "placeId": "google-place-id",
      "websiteUrl": "https://www.target.com",
      "categories": ["department_store", "grocery"],
      "coverage": "partial"
    }
  ],
  "sessionToken": "uuid"
}
```

### POST `/merchants/online-intent`

Auth: user.

External calls: none by default; server searches internal merchant catalog and may enrich from Google Places only if needed.

Request:

```json
{
  "planningPurchase": true,
  "merchantName": "Amazon",
  "purchaseCategory": "online_marketplace",
  "estimatedAmount": 89.95,
  "currency": "USD"
}
```

Response:

```json
{
  "merchant": {
    "merchantId": "uuid",
    "name": "Amazon",
    "type": "online",
    "websiteUrl": "https://www.amazon.com",
    "categories": ["online_marketplace"],
    "coverage": "high"
  },
  "recommendationReady": true
}
```

### GET `/merchants/recent`

Auth: user.

Request query: `type=online|local&limit=10`.

Response:

```json
{
  "merchants": [
    {
      "merchantId": "uuid",
      "name": "Amazon",
      "lastUsedAt": "2026-05-25T19:00:00Z"
    }
  ]
}
```

### GET `/merchants/{merchantId}`

Auth: user.

External calls: Google Place Details when a place refresh is needed.

Request: none.

Response:

```json
{
  "merchantId": "uuid",
  "name": "Best Buy",
  "placeId": "google-place-id",
  "formattedAddress": "1717 Harrison St, San Francisco, CA",
  "websiteUrl": "https://www.bestbuy.com",
  "categories": ["electronics"],
  "coverage": "high",
  "lastEnrichedAt": "2026-05-26T12:00:00Z"
}
```

## LocationController

Stories covered: location-based recommendations, merchant detection, permission-limited fallback, location history, export location history, disable tracking, non-location usage, iOS/Android background geofencing.

### POST `/location/detect-merchant`

Auth: user.

External calls: Google Places Nearby Search, Place Details if needed.

Request:

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracyMeters": 20,
  "radiusMeters": 100,
  "sessionToken": "uuid"
}
```

Response:

```json
{
  "detectedMerchant": {
    "merchantId": "uuid",
    "name": "Best Buy",
    "placeId": "google-place-id",
    "confidence": 0.91,
    "categories": ["electronics"]
  },
  "candidates": [],
  "limitedByPermissions": false
}
```

### POST `/location/events`

Auth: user.

External calls: none synchronously; may queue recommendations/notifications.

Request:

```json
{
  "eventType": "geofence_enter",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracyMeters": 20,
  "occurredAt": "2026-05-26T12:00:00Z",
  "geofenceId": "uuid"
}
```

Response:

```json
{
  "accepted": true,
  "recommendationQueued": true,
  "notificationQueued": false
}
```

### GET `/location/history`

Auth: user.

Request query: `from=2026-05-01&to=2026-05-26&cursor=opaque&limit=50`.

Response:

```json
{
  "items": [
    {
      "locationEventId": "uuid",
      "eventType": "merchant_detected",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "merchantName": "Target",
      "occurredAt": "2026-05-26T12:00:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

### POST `/location/history/export`

Auth: user.

Request:

```json
{
  "from": "2026-01-01",
  "to": "2026-05-26",
  "format": "json"
}
```

Response:

```json
{
  "exportId": "uuid",
  "status": "queued"
}
```

### DELETE `/location/history`

Auth: user.

Request:

```json
{
  "before": "2026-05-01T00:00:00Z"
}
```

Response:

```json
{
  "deleted": true
}
```

## GeofencesController

Stories covered: active geofence zones, create/name/radius/link budget/edit/delete geofence, geofence-linked recommendations and budget warnings.

### GET `/geofences`

Auth: user.

Request query: `active=true`.

Response:

```json
{
  "geofences": [
    {
      "geofenceId": "uuid",
      "name": "Target near home",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "radiusMeters": 150,
      "linkedBudgetId": "uuid",
      "active": true
    }
  ]
}
```

### POST `/geofences`

Auth: user.

External calls: optional Google Geocoding/Place Details when created from address/place.

Request:

```json
{
  "name": "Best Buy",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radiusMeters": 150,
  "merchantId": "uuid",
  "linkedBudgetId": "uuid",
  "active": true
}
```

Response:

```json
{
  "geofenceId": "uuid",
  "created": true
}
```

### PUT `/geofences/{geofenceId}`

Auth: user; geofence must belong to user.

Request:

```json
{
  "name": "Best Buy downtown",
  "radiusMeters": 200,
  "linkedBudgetId": "uuid",
  "active": true
}
```

Response:

```json
{
  "geofenceId": "uuid",
  "updated": true
}
```

### DELETE `/geofences/{geofenceId}`

Auth: user; geofence must belong to user.

Request: none.

Response:

```json
{
  "deleted": true
}
```

## RecommendationsController

Stories covered: home recommendation, in-store single/multi-category recommendations, category switching, runner-up cards, confidence warnings, refresh, card details from recommendation, dismiss/ignore, online purchase helper, reward comparisons.

### POST `/recommendations/in-store`

Auth: user.

External calls: Google Places if merchant is unresolved; no external reward provider required.

Request:

```json
{
  "merchantId": "uuid",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracyMeters": 20
  },
  "purchaseCategory": "electronics",
  "estimatedAmount": 199.99,
  "currency": "USD"
}
```

Response:

```json
{
  "recommendationId": "uuid",
  "merchant": {
    "merchantId": "uuid",
    "name": "Best Buy",
    "categories": ["electronics"]
  },
  "recommendedCard": {
    "cardId": "uuid",
    "displayName": "Chase Freedom Flex",
    "last4": "1234",
    "expectedRewardValue": 10.0,
    "rewardUnit": "points",
    "multiplier": 5
  },
  "runnerUps": [],
  "reason": "Best electronics multiplier among your active cards.",
  "confidence": 0.94,
  "warnings": []
}
```

### POST `/recommendations/online`

Auth: user.

Request:

```json
{
  "merchantId": "uuid",
  "planningPurchase": true,
  "purchaseCategory": "online_marketplace",
  "estimatedAmount": 89.95,
  "currency": "USD"
}
```

Response:

```json
{
  "recommendationId": "uuid",
  "merchant": {
    "name": "Amazon",
    "websiteUrl": "https://www.amazon.com"
  },
  "recommendedCard": {
    "cardId": "uuid",
    "displayName": "Prime Visa",
    "last4": "2222",
    "expectedRewardValue": 4.5,
    "rewardUnit": "cashback",
    "multiplier": 5
  },
  "runnerUps": [],
  "reason": "Highest online marketplace reward rate.",
  "confidence": 0.9
}
```

### POST `/recommendations/{recommendationId}/refresh`

Auth: user; recommendation must belong to user.

Request:

```json
{
  "purchaseCategory": "grocery",
  "estimatedAmount": 54.2
}
```

Response:

```json
{
  "recommendationId": "uuid",
  "recommendedCard": {},
  "runnerUps": [],
  "confidence": 0.92
}
```

### POST `/recommendations/{recommendationId}/dismiss`

Auth: user; recommendation must belong to user.

Request:

```json
{
  "reason": "not_shopping"
}
```

Response:

```json
{
  "dismissed": true
}
```

### GET `/recommendations/recent`

Auth: user.

Request query: `limit=10`.

Response:

```json
{
  "recommendations": [
    {
      "recommendationId": "uuid",
      "merchantName": "Target",
      "recommendedCardName": "Freedom Flex",
      "createdAt": "2026-05-26T12:00:00Z"
    }
  ]
}
```

## TransactionsController

Phase: 2.

Stories covered: recent transactions, imported/manual distinction, fields, missed rewards, better-card detection, add/edit/delete, filters, search, details, OCR confirmation, offline cached transactions, pending sync status.

### GET `/transactions`

Auth: user.

Request query: `cardId`, `category`, `merchantId`, `search`, `source`, `from`, `to`, `cursor`, `limit`.

Response:

```json
{
  "items": [
    {
      "transactionId": "uuid",
      "merchantName": "Starbucks",
      "amount": 8.75,
      "currency": "USD",
      "cardId": "uuid",
      "cardDisplayName": "Freedom Flex",
      "category": "dining",
      "source": "plaid",
      "transactionDate": "2026-05-26",
      "syncStatus": "synced",
      "missedRewards": {
        "missed": true,
        "betterCardId": "uuid",
        "missedValue": 0.22
      }
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

### GET `/transactions/{transactionId}`

Auth: user; transaction must belong to user.

Request: none.

Response:

```json
{
  "transactionId": "uuid",
  "merchant": {},
  "amount": 8.75,
  "currency": "USD",
  "category": "dining",
  "card": {},
  "receiptId": "uuid",
  "recommendationId": "uuid",
  "missedRewards": {},
  "createdAt": "2026-05-26T12:00:00Z"
}
```

### POST `/transactions`

Auth: user.

Request:

```json
{
  "merchantName": "Starbucks",
  "merchantId": "uuid",
  "amount": 8.75,
  "currency": "USD",
  "cardId": "uuid",
  "category": "dining",
  "transactionDate": "2026-05-26",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "receiptId": "uuid",
  "clientMutationId": "offline-uuid"
}
```

Response:

```json
{
  "transactionId": "uuid",
  "syncStatus": "synced",
  "budgetWarnings": [],
  "missedRewards": {}
}
```

### PUT `/transactions/{transactionId}`

Auth: user; transaction must belong to user.

Request:

```json
{
  "amount": 9.1,
  "category": "dining",
  "cardId": "uuid",
  "merchantName": "Starbucks Coffee"
}
```

Response:

```json
{
  "transactionId": "uuid",
  "updated": true,
  "recalculated": {
    "budget": true,
    "rewards": true
  }
}
```

### DELETE `/transactions/{transactionId}`

Auth: user; transaction must belong to user.

Request: none.

Response:

```json
{
  "deleted": true
}
```

## BudgetsController

Phase: 2.

Stories covered: budget status before purchase, may-exceed warnings, merchant/geofence warnings, progress, create/edit/delete, thresholds, weekly/monthly/quarterly, category/geofence ties.

### GET `/budgets`

Auth: user.

Request query: `period=current`.

Response:

```json
{
  "budgets": [
    {
      "budgetId": "uuid",
      "name": "Dining",
      "category": "dining",
      "period": "monthly",
      "limit": 300,
      "spent": 182.4,
      "currency": "USD",
      "thresholds": [0.8, 1.0],
      "linkedGeofenceId": null
    }
  ]
}
```

### POST `/budgets`

Auth: user.

Request:

```json
{
  "name": "Dining",
  "category": "dining",
  "period": "monthly",
  "limit": 300,
  "currency": "USD",
  "thresholds": [0.8, 1.0],
  "linkedGeofenceId": "uuid"
}
```

Response:

```json
{
  "budgetId": "uuid",
  "created": true
}
```

### PUT `/budgets/{budgetId}`

Auth: user; budget must belong to user.

Request:

```json
{
  "limit": 350,
  "period": "monthly",
  "thresholds": [0.75, 0.9, 1.0],
  "linkedGeofenceId": null
}
```

Response:

```json
{
  "budgetId": "uuid",
  "updated": true
}
```

### DELETE `/budgets/{budgetId}`

Auth: user; budget must belong to user.

Request: none.

Response:

```json
{
  "deleted": true
}
```

### POST `/budgets/check-purchase`

Auth: user.

Request:

```json
{
  "merchantId": "uuid",
  "category": "grocery",
  "amount": 84.25,
  "currency": "USD",
  "geofenceId": "uuid"
}
```

Response:

```json
{
  "warnings": [
    {
      "budgetId": "uuid",
      "severity": "warning",
      "message": "This purchase would put Grocery at 92% of budget.",
      "projectedSpent": 462.1,
      "limit": 500
    }
  ]
}
```

## RewardsController

Stories covered: estimated rewards before purchase, points/cashback, compare across cards, missed rewards after purchase, transaction callouts, monthly totals, optimization insights, update assumptions.

### POST `/rewards/estimate`

Auth: user.

Request:

```json
{
  "merchantId": "uuid",
  "category": "grocery",
  "amount": 84.25,
  "currency": "USD",
  "cardIds": ["uuid"]
}
```

Response:

```json
{
  "estimates": [
    {
      "cardId": "uuid",
      "displayName": "Blue Cash Preferred",
      "rewardValue": 5.06,
      "rewardUnit": "cashback",
      "multiplier": 6,
      "eligible": true
    }
  ],
  "bestCardId": "uuid"
}
```

### GET `/rewards/missed`

Auth: user.

Request query: `from=2026-05-01&to=2026-05-31`.

Response:

```json
{
  "totalMissedValue": 14.72,
  "currency": "USD",
  "transactions": [
    {
      "transactionId": "uuid",
      "merchantName": "Starbucks",
      "usedCardId": "uuid",
      "betterCardId": "uuid",
      "missedValue": 0.22
    }
  ]
}
```

### GET `/rewards/insights`

Auth: user; Pro may be required for advanced insights.

Request query: `period=month`.

Response:

```json
{
  "period": "month",
  "earnedValue": 42.5,
  "missedValue": 14.72,
  "insights": [
    "Use Blue Cash Preferred for grocery purchases to reduce missed rewards."
  ],
  "requiresPro": false
}
```

## NotificationsController

Stories covered: location recommendation notifications, missed rewards, budget alerts, unusual spending, receipt completion, list/read/detail navigation, toggles, email/push preferences, quiet hours, empty notifications.

### GET `/notifications`

Auth: user.

Request query: `unreadOnly=false&cursor=opaque&limit=25`.

Response:

```json
{
  "items": [
    {
      "notificationId": "uuid",
      "type": "recommendation",
      "title": "Use Freedom Flex at Target",
      "body": "Best card for this purchase.",
      "read": false,
      "target": {
        "type": "recommendation",
        "id": "uuid"
      },
      "createdAt": "2026-05-26T12:00:00Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

### GET `/notifications/{notificationId}`

Auth: user; notification must belong to user.

Request: none.

Response:

```json
{
  "notificationId": "uuid",
  "type": "budgetAlert",
  "title": "Grocery budget warning",
  "body": "This purchase may exceed your budget.",
  "read": true,
  "target": {
    "type": "budget",
    "id": "uuid"
  }
}
```

### POST `/notifications/mark-read`

Auth: user.

Request:

```json
{
  "notificationIds": ["uuid"],
  "all": false
}
```

Response:

```json
{
  "markedRead": 1
}
```

### GET `/notifications/preferences`

Auth: user.

Request: none.

Response:

```json
{
  "pushEnabled": true,
  "emailEnabled": true,
  "locationNudges": true,
  "missedRewards": true,
  "budgetAlerts": true,
  "unusualSpending": true,
  "receiptCompletion": true,
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "07:00",
    "timezone": "America/New_York"
  }
}
```

### PUT `/notifications/preferences`

Auth: user.

Request:

```json
{
  "pushEnabled": true,
  "emailEnabled": false,
  "locationNudges": true,
  "missedRewards": true,
  "budgetAlerts": true,
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "07:00"
  }
}
```

Response:

```json
{
  "updated": true
}
```

## ProfileController

Stories covered: profile details, display name, Plaid/location/alert status, export data, account deletion/cancel, privacy controls, sensitive-action confirmation.

### GET `/profile`

Auth: user.

Request: none.

Response:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "displayName": "Avery",
  "emailVerified": true,
  "authMethods": ["google", "email_otp"],
  "plan": "pro",
  "linkedPlaidItems": 1,
  "locationTrackingEnabled": true,
  "notificationPreferencesSummary": {
    "pushEnabled": true,
    "emailEnabled": false
  },
  "accountDeletion": {
    "pending": false,
    "scheduledFor": null
  }
}
```

### PUT `/profile`

Auth: user.

Request:

```json
{
  "displayName": "Avery Stone"
}
```

Response:

```json
{
  "updated": true
}
```

### POST `/profile/data-export`

Auth: user.

Request:

```json
{
  "format": "json"
}
```

Response:

```json
{
  "exportId": "uuid",
  "status": "queued"
}
```

### POST `/profile/account-deletion`

Auth: user; recent Supabase re-auth or OTP confirmation recommended.

Request:

```json
{
  "confirmation": "DELETE",
  "otpChallengeId": "uuid"
}
```

Response:

```json
{
  "scheduled": true,
  "purgeAfter": "2026-06-25T12:00:00Z"
}
```

### DELETE `/profile/account-deletion`

Auth: user.

Request: none.

Response:

```json
{
  "cancelled": true
}
```

## BillingController

Stories covered: free plan limits, Pro benefits, start Pro trial, manage subscription, Pro gates for AI/cards/receipts, redirect to billing, cancel subscription.

### GET `/billing/plans`

Auth: optional; include current usage when authenticated.

Request: none.

Response:

```json
{
  "plans": [
    {
      "planId": "free",
      "name": "Free",
      "limits": {
        "cards": 2,
        "receiptsPerMonth": 10,
        "aiInsights": false
      }
    },
    {
      "planId": "pro",
      "name": "Pro",
      "priceId": "price_123",
      "trialDays": 14,
      "limits": {
        "cards": "unlimited",
        "receiptsPerMonth": "unlimited",
        "aiInsights": true
      }
    }
  ],
  "currentPlan": "free"
}
```

### POST `/billing/checkout-session`

Auth: user.

External calls: Stripe `POST /v1/checkout/sessions`.

Request:

```json
{
  "priceId": "price_123",
  "successUrl": "truespend://billing/success",
  "cancelUrl": "truespend://billing/cancel",
  "trialRequested": true
}
```

Response:

```json
{
  "sessionId": "cs_123",
  "url": "https://checkout.stripe.com/c/pay/cs_123"
}
```

### POST `/billing/portal-session`

Auth: user.

External calls: Stripe `POST /v1/billing_portal/sessions`.

Request:

```json
{
  "returnUrl": "truespend://settings/billing",
  "flow": "subscription_cancel"
}
```

Response:

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### GET `/billing/subscription`

Auth: user.

Request: none.

Response:

```json
{
  "plan": "pro",
  "status": "active",
  "trialEndsAt": null,
  "currentPeriodEndsAt": "2026-06-26T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### PUT `/billing/subscription`

Auth: user.

External calls: Stripe `POST /v1/subscriptions/{id}`.

Request:

```json
{
  "priceId": "price_456",
  "prorationBehavior": "create_prorations"
}
```

Response:

```json
{
  "subscriptionId": "sub_123",
  "status": "active",
  "plan": "pro"
}
```

### DELETE `/billing/subscription`

Auth: user.

External calls: Stripe portal cancellation flow or `POST /v1/subscriptions/{id}` with `cancel_at_period_end`.

Request:

```json
{
  "cancelAtPeriodEnd": true,
  "reason": "too_expensive"
}
```

Response:

```json
{
  "cancelAtPeriodEnd": true,
  "accessUntil": "2026-06-26T00:00:00Z"
}
```

### POST `/webhooks/stripe`

Auth: Stripe signature only.

External calls: Stripe webhook signature verification.

Request: raw Stripe event.

Response:

```json
{
  "received": true
}
```

## OfflineSyncController

Stories covered: open offline, cached cards/transactions, offline manual transaction, queued receipt edits, pending sync, sync success/failure, retry failed sync, conflict resolution.

### GET `/sync/bootstrap`

Auth: user.

Request query: `since=2026-05-20T00:00:00Z`.

Response:

```json
{
  "snapshotVersion": "opaque",
  "serverTime": "2026-05-26T12:00:00Z",
  "cards": [],
  "transactions": [],
  "budgets": [],
  "geofences": [],
  "notificationPreferences": {}
}
```

### POST `/sync/push`

Auth: user.

Request:

```json
{
  "baseSnapshotVersion": "opaque",
  "mutations": [
    {
      "clientMutationId": "offline-uuid",
      "entityType": "transaction",
      "operation": "create",
      "payload": {
        "merchantName": "Cafe",
        "amount": 12.5,
        "currency": "USD"
      }
    }
  ]
}
```

Response:

```json
{
  "accepted": [
    {
      "clientMutationId": "offline-uuid",
      "serverEntityId": "uuid"
    }
  ],
  "conflicts": [],
  "newSnapshotVersion": "opaque"
}
```

### GET `/sync/conflicts`

Auth: user.

Request: none.

Response:

```json
{
  "conflicts": [
    {
      "conflictId": "uuid",
      "entityType": "transaction",
      "local": {},
      "remote": {},
      "detectedAt": "2026-05-26T12:00:00Z"
    }
  ]
}
```

### POST `/sync/conflicts/{conflictId}/resolve`

Auth: user; conflict must belong to user.

Request:

```json
{
  "resolution": "useLocal",
  "mergedPayload": null
}
```

Response:

```json
{
  "resolved": true,
  "newSnapshotVersion": "opaque"
}
```

## InsightsController

Stories covered: AI insights require Pro, reward optimization insights over time, unusual spending notifications source, admin/developer quality guides.

### GET `/insights/spending`

Auth: user; Pro required.

Request query: `period=month`.

Response:

```json
{
  "period": "month",
  "summary": {
    "totalSpent": 1240.22,
    "topCategory": "dining"
  },
  "patterns": [],
  "recommendations": [],
  "requiresPro": false
}
```

### GET `/insights/anomalies`

Auth: user; Pro required for full details.

Request query: `period=month`.

Response:

```json
{
  "anomalies": [
    {
      "transactionId": "uuid",
      "severity": "medium",
      "reason": "Higher than normal dining transaction"
    }
  ]
}
```

## AdminController

Stories covered: admin-only access, developer monitoring, non-admin denial, mobile system health/incidents/SLO if layout supports it.

### GET `/admin/health`

Auth: admin or developer.

Request: none.

Response:

```json
{
  "status": "healthy",
  "dependencies": {
    "database": "healthy",
    "plaid": "healthy",
    "stripe": "healthy",
    "maps": "healthy",
    "ocr": "healthy"
  }
}
```

### GET `/admin/incidents`

Auth: admin or developer.

Request query: `status=open`.

Response:

```json
{
  "incidents": [
    {
      "incidentId": "uuid",
      "title": "Plaid webhook delay",
      "severity": "medium",
      "status": "open",
      "createdAt": "2026-05-26T12:00:00Z"
    }
  ]
}
```

### GET `/admin/slo`

Auth: admin or developer.

Request query: `period=24h`.

Response:

```json
{
  "slos": [
    {
      "name": "Plaid sync success",
      "target": 0.99,
      "actual": 0.982,
      "status": "warning"
    }
  ]
}
```

## Worker Services

This API guide does not define internal job endpoints. Background processing is handled by worker services in `job-architecture.md`, including card catalog sync, Plaid institution catalog sync, Plaid transaction sync, custom notification dispatch, account purge, and Phase 2 OCR queues.

## ReceiptsController

Phase: 2.

Stories covered: camera capture, image upload, quality feedback, retry blurry receipt, upload progress, OCR status, extracted fields, edit/manual fallback, low confidence confirmation, save as transaction, OCR failure recovery, Pro receipt gates.

### POST `/receipts/upload-url`

Auth: user; may require Pro after free limit.

Request:

```json
{
  "fileName": "receipt.jpg",
  "contentType": "image/jpeg",
  "fileSizeBytes": 823124,
  "qualityScore": 0.86
}
```

Response:

```json
{
  "receiptId": "uuid",
  "uploadUrl": "https://signed-upload-url",
  "expiresAt": "2026-05-26T12:15:00Z",
  "requiresPro": false
}
```

### POST `/receipts/{receiptId}/process`

Auth: user; receipt must belong to user.

External calls: Google Vision/OCR provider.

Request:

```json
{
  "imageUrl": "storage://receipts/user/receipt.jpg",
  "qualityScore": 0.86,
  "fallbackToManual": true
}
```

Response:

```json
{
  "ocrJobId": "uuid",
  "status": "queued"
}
```

### GET `/receipts/{receiptId}/ocr-status`

Auth: user; receipt must belong to user.

Request: none.

Response:

```json
{
  "receiptId": "uuid",
  "status": "completed",
  "progress": 100,
  "extracted": {
    "merchantName": "Target",
    "amount": 42.1,
    "tax": 3.21,
    "transactionDate": "2026-05-26",
    "category": "grocery",
    "confidence": 0.82
  },
  "requiresConfirmation": true,
  "failureReason": null
}
```

### POST `/receipts/{receiptId}/transaction`

Auth: user; receipt must belong to user.

Request:

```json
{
  "merchantName": "Target",
  "amount": 42.1,
  "currency": "USD",
  "tax": 3.21,
  "transactionDate": "2026-05-26",
  "category": "grocery",
  "cardId": "uuid"
}
```

Response:

```json
{
  "transactionId": "uuid",
  "receiptId": "uuid"
}
```

### POST `/receipts/{receiptId}/retry`

Auth: user; receipt must belong to user.

Request:

```json
{
  "reason": "blurry",
  "newImageUrl": "storage://receipts/user/receipt-2.jpg"
}
```

Response:

```json
{
  "ocrJobId": "uuid",
  "status": "queued"
}
```

## PurchaseTrackingController

Phase: 2.

Stories covered: track an in-store purchase after using a recommendation, track an online purchase after choosing a recommended card, create transaction records from tracked purchases, calculate missed rewards after tracking.

### POST `/purchase-tracking/recommendations/{recommendationId}`

Auth: user; recommendation must belong to user.

Request:

```json
{
  "cardId": "uuid",
  "amount": 199.99,
  "currency": "USD",
  "purchasedAt": "2026-05-26T12:00:00Z",
  "purchaseChannel": "in_store",
  "merchantId": "uuid",
  "category": "electronics"
}
```

Response:

```json
{
  "tracked": true,
  "transactionId": "uuid",
  "recommendationId": "uuid",
  "missedRewards": {
    "missed": false,
    "amount": 0
  }
}
```

## Story Coverage Index

| User story group | Primary API coverage |
|---|---|
| App Entry And Authentication | `AuthController`, `AppController`, `DevicesController` |
| Onboarding | `OnboardingController`, `PlaidController`, `CardsController`, `DevicesController` |
| Permissions | `DevicesController`, `LocationController`, `NotificationsController`; Phase 2 camera permission uses `ReceiptsController` |
| Mobile Home And Card Recommendation | `RecommendationsController`, `LocationController`, `MerchantsController`, `CardsController`, `NotificationsController`, `ProfileController` |
| In-Store Shopping Recommendations | `RecommendationsController`, `LocationController`, `MerchantsController`, `CardsController`; Phase 2 purchase tracking uses `PurchaseTrackingController` |
| Online Purchase Helper | `RecommendationsController`, `MerchantsController`; Phase 2 purchase tracking uses `PurchaseTrackingController` |
| Cards | `CardsController`, `CardCatalogController`, `PlaidController` |
| Plaid Card Linking | `PlaidController`, `CardsController`; Phase 2 imported transaction viewing uses `TransactionsController` |
| Manual Card Setup | `CardsController`, `CardCatalogController`, `RecommendationsController` |
| Purchase Tracking | Phase 2: `PurchaseTrackingController`, `TransactionsController`, `RewardsController` |
| Transactions | Phase 2: `TransactionsController`, `RewardsController`, `ReceiptsController`, `OfflineSyncController` |
| Receipt Capture And OCR | Phase 2: `ReceiptsController`, `TransactionsController`, `DevicesController`, `BillingController` |
| Location And Geofencing | `LocationController`, `GeofencesController`, `RecommendationsController`, `BudgetsController` |
| Budget Awareness | Phase 2: `BudgetsController`, `GeofencesController`, `NotificationsController`, `TransactionsController` |
| Rewards And Missed Savings | `RewardsController`, `RecommendationsController`, `TransactionsController`, `CardsController` |
| Notifications | `NotificationsController`, `DevicesController`, worker services |
| Profile And Settings | `ProfileController`, `PlaidController`, `NotificationsController`, `BillingController`, `DevicesController` |
| Security And Privacy | `AuthController`, `ProfileController`, `PlaidController`, `CardsController`, `LocationController`, `NotificationsController` |
| Offline And Sync | `OfflineSyncController`, `CardsController`; Phase 2 transaction/receipt sync uses `TransactionsController` and `ReceiptsController` |
| Billing And Plan Access | `BillingController`, plus Pro gates in `InsightsController`, `CardsController`; Phase 2 receipt gates use `ReceiptsController` |
| Admin And Internal Mobile Considerations | `AdminController`, worker services |
| Error, Empty, And Loading States | Common success/error envelope across all controllers, plus empty arrays and async job statuses |
| App Store Readiness | `AppController`, `AuthController`, `DevicesController`, `LocationController`, `NotificationsController`; Phase 2 camera readiness uses `ReceiptsController` |

## Current Supabase Function Migration Map

| Current Supabase domain | New .NET controller |
|---|---|
| Supabase Auth helpers, account recovery, verification, GDPR functions | Supabase Auth SDK, `AuthController`, `ProfileController`, worker services |
| Stripe functions | `BillingController` |
| Plaid functions and Plaid webhook | `PlaidController`, worker services |
| BFF transactions/dashboard/process transaction | Phase 2: `TransactionsController`; current dashboard/insights use `InsightsController` |
| Maps, Places, geolocation, merchant discovery | `LocationController`, `MerchantsController`, `GeofencesController` |
| OCR functions | Phase 2: `ReceiptsController`, worker services |
| Budget, anomaly, reward, recommendation logic | Phase 2 budgets: `BudgetsController`; rewards/recommendations: `RewardsController`, `RecommendationsController`, `InsightsController` |
| Notification/email/push functions | `NotificationsController`, worker services |
| Metrics, incidents, SLO, health, audit functions | `AdminController`, worker services |
