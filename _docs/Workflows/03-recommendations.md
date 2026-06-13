# Recommendations Workflow

## Scope

Phase 1 online and in-store recommendation flows for screens `3.1` through `3.4`. These views render inside the **Wallet** tab ([04-cards.md](04-cards.md)) — the dedicated "Home" tab was folded into Wallet. The mobile app may use device location/place detection, then sends the detected merchant to the API for resolution and recommendation.

The home surface is map-centric: rewardable merchants within ~2 km of the user render as map pins (client-side clustered), a location-biased **place search** lets the user look up a store/gas station by name, and tapping a pin or a search result resolves the merchant and returns its best card. Pins and search results share the same `NearbyMerchant` shape and the same tap → best-card path; neither records a `merchant_visit` (browsing, not arrival).

## Progress

| User story | Status | Notes |
|---|---|---|
| User can see a personalized home empty state when no cards are connected | Done |  |
| User can add a card from the home empty state | Done |  |
| User can connect a bank from the home empty state | Done |  |
| User can see plan or upgrade guidance from the home empty state | Done |  |
| User can get a clear single-card recommendation at a single-category merchant | Done |  |
| User can see the current detected merchant when shopping in person | Done | Foreground geo: on Wallet open the app sends device coords to `POST /api/v1/recommendations/nearby`; the server resolves the merchant from `foursquare.places` via the shared `GeoPlaceMatchBusiness` (same coordinate match the geo-arrival path uses) — no on-device places key. Falls back to the home last-visited replay when location is denied or no confident match. |
| User can see the best card recommendation for the detected merchant | Done | `/recommendations/nearby` composes place-match → shared `MerchantResolveBusiness` → `RecommendationBuilderBusiness` (`in_store` context), returning the same `RecommendationResponse` as in-store. `/merchants/resolve` + `/recommendations/in-store` remain for explicit merchant-id flows (category chips, refresh). |
| User can see expected rewards value for the recommended card | Done |  |
| User can see why the recommended card is better than other cards | Done |  |
| User can see runner-up card options for the current purchase | Done |  |
| User can see the last four digits of the recommended card | Done |  |
| User can refresh the current merchant recommendation | Done |  |
| User can access quick actions from the home screen | Done |  |
| User can get a smart default category at a multi-category merchant based on transaction history | Done |  |
| User can change the suggested category at a multi-category merchant | Done |  |
| User can see the recommendation update after selecting a category | Done |  |
| User can compare electronics recommendations at a store | Done |  |
| User can compare grocery recommendations at a store | Done |  |
| User can compare clothing recommendations at a store | Done |  |
| User can compare home goods recommendations at a store | Done |  |
| User can compare beauty recommendations at a store | Done |  |
| User can compare dining or cafe recommendations at a store | Done |  |
| User can see a coverage warning when merchant category coding may be uncertain | Done |  |
| User can open card details from an in-store recommendation | Done |  |
| User can browse nearby rewardable merchants as map pins | Done | `POST /recommendations/nearby-merchants` returns up to 60 rewardable (`category_id` resolved) places within a 2 km radius of the user, ranked by proximity. Client clusters overlapping pins (`supercluster`) and hides them when zoomed out past the radius. No fabrication — empty result = no pins. **Tier-gated** `map_pins_enabled` (Basic+), enforced server-side + hidden on Free — see [13-feature-gating.md](13-feature-gating.md). |
| User can get the best card for a tapped map pin | Done | `POST /recommendations/place` resolves the merchant (`MerchantResolveBusiness`) and builds its best card. Records no `merchant_visit`. |
| User can search for a nearby store or gas station | Done | `POST /recommendations/search-places` matches `foursquare.places.normalized_name` (trigram GIN index) for rewardable places, ranked by proximity to the user. Tapping a result reuses the `/place` path. Brand/name match only; generic category terms deferred. **Tier-gated** `place_search_enabled` (Pro), enforced server-side + hidden below Pro — see [13-feature-gating.md](13-feature-gating.md). |
| User can see their recent merchant visits on home | Done | `GET /merchants/recent-visits?limit=3`; tapping one re-computes the best card for that known merchant. |

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| `3.1` | Home empty | No cards, add-card and upgrade CTAs |
| `3.2` | Single-category merchant | Clear best-card answer |
| `3.3` | Multi-category merchant | Smart default category and category chips |
| `3.4` | Coverage warning | Runner-up cards and category-code uncertainty |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can see a personalized home empty state when no cards are connected | `3.1` | `GET /recommendations/home` returns `emptyState` |
| Full | User can add a card from the home empty state | `3.1` | Navigates to cards/manual-card flow |
| Full | User can connect a bank from the home empty state | `3.1` | Navigates to Plaid linking flow |
| Full | User can see plan or upgrade guidance from the home empty state | `3.1` | Uses entitlement/billing state |
| Full | User can get a clear single-card recommendation at a single-category merchant | `3.2` | In-store recommendation |
| Full | User can see the current detected merchant when shopping in person | `3.2`, `3.3`, `3.4` | Device detection plus merchant resolve |
| Full | User can see the best card recommendation for the detected merchant | `3.2`, `3.3`, `3.4` | `RecommendationVm.recommendedCard` |
| Full | User can see expected rewards value for the recommended card | `3.2`, `3.3`, `3.4` | `expectedRewardRate`, `expectedReward` |
| Full | User can see why the recommended card is better than other cards | `3.2` | `RecommendationVm.reason` |
| Full | User can see runner-up card options for the current purchase | `3.4` | `RecommendationVm.runnerUpCards` |
| Full | User can see the last four digits of the recommended card | `3.2`, `3.3`, `3.4` | `CardSummaryVm.lastFour` |
| Full | User can refresh the current merchant recommendation | `3.2` | Refresh endpoint |
| Full | User can access quick actions from the home screen | `3.1`, `3.3` | Navigation only |
| Full | User can get a smart default category at a multi-category merchant based on transaction history | `3.3` | Server recommendation uses visits/history |
| Full | User can change the suggested category at a multi-category merchant | `3.3`, `3.4` | Category chips |
| Full | User can see the recommendation update after selecting a category | `3.3`, `3.4` | Category update endpoint |
| Full | User can compare electronics recommendations at a store | `3.3`, `3.4` | Category chips |
| Full | User can compare grocery recommendations at a store | `3.3`, `3.4` | Category chips |
| Full | User can compare clothing recommendations at a store | `3.3`, `3.4` | Category chips |
| Full | User can compare home goods recommendations at a store | `3.3`, `3.4` | Category chips |
| Full | User can compare beauty recommendations at a store | `3.3`, `3.4` | Category chips |
| Full | User can compare dining or cafe recommendations at a store | `3.3` | Category chips |
| Full | User can see a coverage warning when merchant category coding may be uncertain | `3.4` | `RecommendationVm.coverageWarning` |
| Full | User can open card details from an in-store recommendation | `3.2`, `3.3`, `3.4` | Deep link to Cards workflow |
| Full | User can browse nearby rewardable merchants as map pins | `3.1`, `3.2` | Map pins from `nearby-merchants`, clustered client-side |
| Full | User can get the best card for a tapped map pin | `3.2` | `nearby-merchants` → tap → `place` |
| Full | User can search for a nearby store or gas station | `3.1`, `3.2` | `search-places` → tap result → `place` |
| Full | User can see their recent merchant visits on home | `3.1` | `merchants/recent-visits` |

## Preconditions

- User is authenticated.
- Home tab has access to current card state, permissions state, and entitlement state.
- Device-side place detection is available when showing in-store recommendations.

## Primary API Sequence

```text
Open Home
  GET /api/v1/recommendations/home

Detected merchant (foreground geo, automatic on Wallet open)
  POST /api/v1/recommendations/nearby   { lat, lng, accuracyMeters }
  (server: place-match -> resolve merchant -> best card; falls back to home replay on no match)

Map pins (anchored to the user, on Wallet open)
  POST /api/v1/recommendations/nearby-merchants   { centerLat, centerLng, radiusMeters?, limit? }
  GET  /api/v1/merchants/recent-visits?limit=3

Place search (user types a store/gas station)
  POST /api/v1/recommendations/search-places   { query, centerLat, centerLng, limit? }

Tap a pin or a search result
  POST /api/v1/recommendations/place   { providerPlaceId, name, lat, lng, categoryCode? }
  (resolve merchant -> best card; no merchant_visit recorded)

Explicit merchant id (category chips / refresh)
  POST /api/v1/merchants/resolve
  POST /api/v1/recommendations/in-store

Change category
  POST /api/v1/recommendations/category
  POST /api/v1/merchants/visits

Refresh
  POST /api/v1/recommendations/refresh
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load Home | `GET /api/v1/recommendations/home` | `RecommendationResponse`: `recommendation`, `emptyState` | Sync API | None | Read `finance.user_cards`, `catalog.reward_rules`, `finance.recommendations`, `lookup.recommendation_contexts` | Mobile memory cache; short server TTL |
| Nearby recommendation (foreground geo) | `POST /api/v1/recommendations/nearby` | `NearbyRecommendationRequest` (`lat`, `lng`, `accuracyMeters?`, `estimatedAmount?`) -> `RecommendationResponse` | Sync API | None | Read `foursquare.places`, `foursquare.category_bridge`, `catalog.reward_rules`, `finance.user_cards`; read/write `finance.merchants` (find-or-create), write `finance.recommendations`; provider-on-miss upsert `foursquare.places` | Tables are source of truth; no notification/gating (read-style) |
| Map pins (nearby merchants) | `POST /api/v1/recommendations/nearby-merchants` | `NearbyMerchantsRequest` (`centerLat`, `centerLng`, `radiusMeters?`, `limit?`) -> `NearbyMerchantsResponse` (`NearbyMerchantVm[]`) | Sync API | None | Read `foursquare.places` (bbox of centre ± radius, `category_id` not null), `foursquare.chains`, `catalog.categories` | Mobile query cache keyed by rounded centre; no merchant/recommendation write |
| Place search | `POST /api/v1/recommendations/search-places` | `SearchPlacesRequest` (`query`, `centerLat`, `centerLng`, `limit?`) -> `NearbyMerchantsResponse` | Sync API | None | Read `foursquare.places` (`normalized_name` ILIKE, trigram GIN index, `category_id` not null), `foursquare.chains`, `catalog.categories` | Mobile query cache keyed by debounced query + centre |
| Tap pin / search result | `POST /api/v1/recommendations/place` | `PlaceRecommendationRequest` (`providerPlaceId`, `name`, `lat`, `lng`, `categoryCode?`, `estimatedAmount?`) -> `RecommendationResponse` | Sync API | None | Read/write `finance.merchants` (find-or-create), read reward/category/card tables, write `finance.recommendations`. **No `merchant_visit`.** | Same recommendation cache as in-store |
| Recent visits | `GET /api/v1/merchants/recent-visits?limit=3` | `RecentVisitsResponse` (`RecentVisit[]`) | Sync API | None | Read `finance.merchant_visits` (≤ window, ordered desc), `finance.merchants` | Mobile short cache |
| Empty-state CTAs | Navigation; optional `GET /api/v1/entitlements` | `EntitlementsResponse`: `planCode`, `manualCardLimit`, `plaidCardLimit`, `unlimitedCards` | Sync API | None | Read `billing.subscriptions`, `billing.plan_features` | Mobile short cache; server entitlement cache |
| Resolve detected merchant | `POST /api/v1/merchants/resolve` | `ResolveMerchantRequest` -> `MerchantResponse` | Sync API | None | Read/write `finance.merchants`, read `catalog.categories`, `catalog.category_aliases` | Server merchant-resolution cache; DB first for new merchants |
| Get in-store recommendation | `POST /api/v1/recommendations/in-store` | `InStoreRecommendationRequest` -> `RecommendationResponse` | Sync API | None | Read `finance.user_cards`, `finance.card_reward_overrides`, `catalog.reward_rules`, `finance.merchants`; write `finance.recommendations` | Mobile memory cache; short server TTL keyed by user, merchant, category |
| Change category chip | `POST /api/v1/recommendations/category` | `UpdateRecommendationCategoryRequest` -> `RecommendationResponse` | Sync API | None | Read/write `finance.recommendations`; read reward/category/card tables | Replace active recommendation cache |
| Record selected category | `POST /api/v1/merchants/visits` | `CreateMerchantVisitRequest` -> `MerchantVisitsResponse` | Sync API + Outbox Event | `finance.merchant_visit.created` -> recommendation preference refresh/cache invalidation | Write `finance.merchant_visits` and `messaging.event_outbox` in same transaction | Invalidate smart-default recommendation cache for merchant through outbox consumer |
| Refresh recommendation | `POST /api/v1/recommendations/refresh` | `RefreshRecommendationRequest` -> `RecommendationResponse` | Sync API | None | Same as in-store recommendation | Bypass mobile cache; refresh server cache |
| Open recommended card | `GET /api/v1/cards/{cardId}` | `CardDetailResponse` | Sync API | None | Read `finance.user_cards`, `catalog.card_products`, `catalog.reward_rules`, `finance.card_reward_overrides` | Uses Cards workflow cache |
| Load category chips | `GET /api/v1/card-catalog/categories` | `CategoriesResponse` | Sync API | None | Read all active `catalog.categories` | Dropdown/reference cache by default |

## Contracts Used

| Contract | Fields Used |
|---|---|
| `RecommendationResponse` | `recommendation`, `emptyState` |
| `RecommendationVm` | `id`, `merchant`, `categoryCode`, `recommendedCard`, `reason`, `runnerUpCards`, `coverageWarning` |
| `RecommendationCardVm` | `card`, `expectedRewardRate`, `expectedReward`, `reason`, `rank` |
| `MerchantVm` | `id`, `name`, `categoryCode`, `isMultiCategory`, `address` |
| `CardSummaryVm` | `id`, `displayName`, `issuerName`, `lastFour`, `cardArtUrl` |
| `ResolveMerchantRequest` | `name`, `provider`, `providerPlaceId`, `lat`, `lng`, `address` |
| `NearbyRecommendationRequest` | `lat`, `lng`, `accuracyMeters`, `estimatedAmount` |
| `NearbyMerchantsRequest` | `centerLat`, `centerLng`, `radiusMeters`, `limit` |
| `SearchPlacesRequest` | `query`, `centerLat`, `centerLng`, `limit` |
| `NearbyMerchantsResponse` / `NearbyMerchantVm` | `merchants`; `providerPlaceId`, `name`, `lat`, `lng`, `categoryCode`, `categoryName`, `chainName` |
| `PlaceRecommendationRequest` | `providerPlaceId`, `name`, `lat`, `lng`, `categoryCode`, `estimatedAmount` |
| `RecentVisitsResponse` / `RecentVisit` | `visits`; `merchant`, `categoryCode`, `visitedAt` |
| `InStoreRecommendationRequest` | `merchantId`, `categoryCode`, `estimatedAmount` |
| `UpdateRecommendationCategoryRequest` | `recommendationId`, `categoryCode` |
| `RefreshRecommendationRequest` | `merchantId`, `categoryCode` |
| `CreateMerchantVisitRequest` | `merchantId`, `selectedCategoryCode`, `visitedAt` |
| `CategoriesResponse` | `categories` |

## Tables Involved

| Role | Tables |
|---|---|
| User cards | `finance.user_cards`, `finance.card_reward_overrides` |
| Merchant resolution/history | `finance.merchants`, `finance.merchant_visits` |
| Places (pins / search) | `foursquare.places` (search needs the `normalized_name` trigram GIN index — enabled in `supabase/migrations/foursquare.sql`, built post-load), `foursquare.chains`, `foursquare.category_bridge` |
| Recommendation result | `finance.recommendations`, `lookup.recommendation_contexts` |
| Catalog/reference | `catalog.categories`, `catalog.category_aliases`, `catalog.reward_rules`, `catalog.card_products`, `lookup.reward_currencies` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions` |
| Billing gate | `billing.subscriptions`, `billing.plan_features`, `billing.features` |

## Cache Strategy

- Catalog and reward rules: shared server/mobile reference cache by catalog version; safe to reuse across users.
- Merchant resolution: shared server cache by provider place ID and normalized name/location; safe to reuse across users visiting the same place.
- Merchant category candidates: shared server cache by `merchantId` and catalog/category version.
- User reward profile: user-scoped server/mobile cache built from active `finance.user_cards`, catalog reward rules, and `finance.card_reward_overrides`.
- Final recommendation: user-scoped short TTL cache keyed by user, merchant, category, estimated amount band, and reward profile version.
- Shared card-set recommendation cache is optional and only valid when users have the same active catalog card products, same catalog version, and no user-specific overrides.
- Categories and aliases: dropdown/reference cache by default on mobile and server.
- New merchant/category/reference values: write DB first, then update or invalidate server cache.

## Sync vs Async Decisions

- Recommendation generation is synchronous because the user needs a checkout-time answer.
- Merchant visit recording returns synchronously after writing the visit and outbox event in one transaction; preference refresh and cache invalidation run asynchronously from the outbox.
- Phase 1 category chips show all active categories from `GET /api/v1/card-catalog/categories`; merchant-specific category options are deferred.
- Analytics/AI side effects from recommendation usage should not block this workflow.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| `finance.user_card.created/updated/deleted` | User reward profile, final recommendation cache, optional shared card-set cache membership |
| `finance.reward_override.upserted/deleted` | User reward profile and recommendation cache for affected user; bypass shared card-set cache |
| Catalog sync or reference data write | Catalog, category, alias, reward-rule, merchant category, shared card-set, and recommendation caches |
| Merchant resolution write/update | Merchant resolution and merchant category caches |
| Merchant visit created | Smart default category cache for that merchant/user |
| Pull-to-refresh | Active recommendation cache |

## Loading And Error States

| State | Handling |
|---|---|
| Initial Home load | Show skeleton, then recommendation or empty state |
| Merchant resolve fails | Show location detected but no recommendation; allow refresh |
| Recommendation fails | Keep last visible recommendation only if clearly marked stale; allow retry |
| No cards | Show empty state and add/connect CTAs |
| Entitlement unavailable | Hide upgrade-dependent details until refreshed |

## Design Gaps

| Gap | Owner | Notes |
|---|---|---|
| None currently open. |  |  |
