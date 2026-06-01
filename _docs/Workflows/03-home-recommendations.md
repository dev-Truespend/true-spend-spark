# Home Recommendations Workflow

## Scope

Phase 1 online Home and in-store recommendation flows for screens `3.1` through `3.4`. The mobile app may use device location/place detection, then sends the detected merchant to the API for resolution and recommendation.

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

## Preconditions

- User is authenticated.
- Home tab has access to current card state, permissions state, and entitlement state.
- Device-side place detection is available when showing in-store recommendations.

## Primary API Sequence

```text
Open Home
  GET /api/v1/recommendations/home

Detected merchant
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
| Empty-state CTAs | Navigation; optional `GET /api/v1/entitlements` | `EntitlementsResponse`: `planCode`, `cardLinkLimit`, `unlimitedCards` | Sync API | None | Read `billing.subscriptions`, `billing.plan_features` | Mobile short cache; server entitlement cache |
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

None currently open.
