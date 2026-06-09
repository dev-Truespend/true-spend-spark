# Wallet (Cards) Workflow

> The Wallet tab is the default tab and the merged home/cards surface. It hosts both card management (this workflow) and in-store recommendations (see [03-recommendations.md](03-recommendations.md)).
>
> **MVP execution note** — Any step below that mentions an outbox event runs **inline post-commit** in the MVP. See [api-design-patterns.md § Post-commit side-effects](../low-level-design/Service/api-design-patterns.md#post-commit-side-effects) and [_docs/Refactors/sync-execution-conversion.md](../Refactors/sync-execution-conversion.md).

## Progress

| User story | Status | Notes |
|---|---|---|
| User can view all linked and manually added cards | Done | |
| User can see card visuals with issuer and product names | Done | |
| User can see the last four digits of each card | Done | |
| User can see whether a card was added manually or through Plaid | Done | |
| User can see card sync status | Done | |
| User can see when card linking limits have been reached | Done | |
| User can see upgrade guidance when more links require a higher plan | Done | |
| User can be redirected to billing when opening a higher-plan feature | Done | |
| User can open a card detail screen | Done | |
| User can view reward multipliers for a card | Done | |
| User can view card terms relevant to recommendations | Done | |
| User can view monthly reward contribution for a card | Done | |
| User can edit reward rules for a card | Done | |
| User can remove a card | Done | |
| User can see a cards empty state when no cards are connected | Done | |
| User can add a manual card from the cards empty state | Done | |
| User can browse the card catalog from the cards empty state | Done | Standalone catalog browser at `/(app)/cards/catalog` with issuer filter and search; selecting a product pre-fills the manual-add screen. |
| User can request a missing bank/card from manual add | Done | |
| User's manually-added card is auto-merged into its Plaid link when later connected | Done | `PlaidInsertBusiness` adopts the matching manual card in place (last-four + product/issuer); `last_four` now required on manual create. See Manual↔Plaid Reconciliation. |
| User can understand Basic linking limits and Pro unlimited linking | Done | |
| User can start Plaid linking from the cards area | Done | |
| User can view Plaid connection health | Done | |
| User can reconnect a Plaid institution from connection management | Done | |
| User can disconnect a Plaid institution from connection management | Done | |

## Scope

Phase 1 online Cards tab flows for screens `5.1` through `5.4`: card list, card detail, empty state, manual add entry points, reward overrides, card removal, limits, and Plaid connection management.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| `5.1` | My cards | Linked/manual card stack and limits |
| `5.2` | Card detail | Multipliers, terms, monthly contribution, edit/remove |
| `5.3` | Cards empty | Add manual, browse catalog, upgrade guidance |
| `5.4` | Plaid connections | Health, sync, reconnect, disconnect |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can view all linked and manually added cards | `5.1` | `GET /cards` |
| Full | User can see card visuals with issuer and product names | `5.1` | `CardSummaryVm` |
| Full | User can see the last four digits of each card | `5.1` | `CardSummaryVm.lastFour` |
| Full | User can see whether a card was added manually or through Plaid | `5.1`, `5.2` | `CardSummaryVm.source` |
| Full | User can see card sync status | `5.1`, `5.4` | `CardSummaryVm.syncStatus`, Plaid connections |
| Full | User can see when card linking limits have been reached | `5.1` | `CardsResponse.limits` |
| Full | User can see upgrade guidance when more links require a higher plan | `5.1`, `5.3`, `8.3` | Cards limits and entitlements |
| Full | User can be redirected to billing when opening a higher-plan feature | `5.1`, `5.3`, `8.3` | Billing checkout/portal navigation |
| Full | User can open a card detail screen | `5.2` | `GET /cards/{cardId}` |
| Full | User can view reward multipliers for a card | `5.2` | `rewardRules` |
| Full | User can view card terms relevant to recommendations | `5.2` | `terms` |
| Full | User can view monthly reward contribution for a card | `5.2` | `monthlyRewardContribution` |
| Full | User can edit reward rules for a card | `5.2` | Reward overrides |
| Full | User can remove a card | `5.2` | `POST /cards/{cardId}/delete` |
| Full | User can see a cards empty state when no cards are connected | `5.3` | Empty `CardsResponse.cards` |
| Full | User can add a manual card from the cards empty state | `5.3` | Manual card endpoint |
| Full | User can browse the card catalog from the cards empty state | `5.3` | Catalog browser screen with issuer filter and product search; selection pre-fills manual-add |
| Full | User can request a missing bank/card from manual add | `5.3` | Catalog request endpoint and admin review |
| Full | User's manually-added card is auto-merged into its Plaid link when later connected | `5.2`, `5.4` | Adoption on `POST /plaid/exchange-token`; see Manual↔Plaid Reconciliation |
| Full | User can understand Basic linking limits and Pro unlimited linking | `5.1`, `5.3`, `8.3` | Cards limits/entitlements |
| Full | User can start Plaid linking from the cards area | `5.3`, `5.4` | Plaid link token |
| Full | User can view Plaid connection health | `5.4` | Plaid connections |
| Full | User can reconnect a Plaid institution from connection management | `5.4` | Plaid reconnect |
| Full | User can disconnect a Plaid institution from connection management | `5.4` | Plaid cards remain visible with disconnected sync status |

## Preconditions

- User is authenticated.
- Billing entitlement state is available or can be fetched.
- Card catalog reference data is seeded and cached.

## Primary API Sequence

```text
Open Cards
  GET /api/v1/cards

Open card detail
  GET /api/v1/cards/{cardId}

Add manual card
  GET /api/v1/card-catalog/issuers
  GET /api/v1/card-catalog/search
  POST /api/v1/cards/manual
  or POST /api/v1/card-catalog/requests when missing

Edit rewards/remove card
  GET /api/v1/cards/{cardId}/reward-overrides
  POST /api/v1/cards/{cardId}/reward-overrides
  POST /api/v1/cards/{cardId}/delete

Manage Plaid
  GET /api/v1/plaid/connections
  POST /api/v1/plaid/link-token
  POST /api/v1/plaid/connections/sync|reconnect|disconnect
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Load card list | `GET /api/v1/cards` | `CardsResponse`: `cards`, `limits` | Sync API | None | Read `finance.user_cards`, `finance.plaid_accounts`, `catalog.card_products`, `catalog.card_issuers`, `lookup.card_sources` | Mobile persistent cache; server catalog cache |
| Check limits | `GET /api/v1/cards/limits` or included in `GET /cards` | `CardLimitsResponse` | Sync API | None | Read `finance.user_cards`, `billing.subscriptions`, `billing.plan_features` | Short mobile cache; server entitlement cache |
| Open card detail | `GET /api/v1/cards/{cardId}` | `CardDetailResponse` | Sync API | None | Read `finance.user_cards`, `catalog.card_products`, `catalog.reward_rules`, `finance.card_reward_overrides` | Mobile detail cache; invalidate on card/reward changes |
| Add manual card form | `GET /api/v1/card-catalog/issuers`, `GET /api/v1/card-catalog/search` | `IssuersResponse`, `CardProductsResponse` | Sync API | None | Read `catalog.card_issuers`, `catalog.card_products` | Dropdown/reference cache by default |
| Create manual card | `POST /api/v1/cards/manual` | `CreateManualCardRequest` -> `CardDetailResponse` | Sync API + Outbox Event | `finance.user_card.created` -> recommendation/cache invalidation | Write `finance.user_cards` and `messaging.event_outbox`; read catalog tables | Update mobile card cache on success |
| Request missing manual card | `POST /api/v1/card-catalog/requests` | `CreateCardProductRequest` -> `CardProductRequestResponse` | Sync API + Event | `catalog.card_product_request.created`; optional `finance.user_card.created` | Normalize names, write `catalog.card_product_requests`; optionally write `finance.user_cards` with custom names and null `card_product_id` | Update pending request cache; if user card is created, update cards cache and invalidate limits/recommendations |
| Update card | `POST /api/v1/cards/{cardId}` | `UpdateCardRequest` -> `CardDetailResponse` | Sync API + Outbox Event | `finance.user_card.updated` -> recommendation/cache invalidation | Write `finance.user_cards` and `messaging.event_outbox` | Invalidate list/detail caches |
| Set primary | `POST /api/v1/cards/{cardId}/primary` | Empty -> `CardsResponse` | Sync API + Outbox Event | `finance.user_card.updated` | Write `finance.user_cards` and `messaging.event_outbox` | Replace card list cache |
| Load reward overrides | `GET /api/v1/cards/{cardId}/reward-overrides` | `RewardOverridesResponse` | Sync API | None | Read `finance.card_reward_overrides`, `catalog.categories`, `catalog.reward_rules` | Mobile memory cache; server catalog cache |
| Save reward override | `POST /api/v1/cards/{cardId}/reward-overrides` | `UpsertRewardOverrideRequest` -> `RewardOverridesResponse` | Sync API + Outbox Event | `finance.reward_override.upserted` -> reward/recommendation invalidation | Write `finance.card_reward_overrides` and `messaging.event_outbox` | Invalidate card detail and recommendation caches |
| Delete reward override | `POST /api/v1/cards/{cardId}/reward-overrides/delete` | `DeleteRewardOverrideRequest` -> `RewardOverridesResponse` | Sync API + Outbox Event | `finance.reward_override.deleted` | Delete/write `finance.card_reward_overrides`; write `messaging.event_outbox` | Invalidate card detail and recommendation caches |
| Remove card | `POST /api/v1/cards/{cardId}/delete` | Empty -> `CardsResponse` | Sync API + Outbox Event | `finance.user_card.deleted` -> recommendation/analytics refresh | Soft-delete `finance.user_cards`; write `messaging.event_outbox` | Replace card list cache; clear detail cache |
| Browse catalog | `GET /api/v1/card-catalog/products`, `GET /api/v1/card-catalog/products/{cardProductId}` | `CardProductsResponse`, `CardProductResponse` | Sync API | None | Read `catalog.card_products`, `catalog.reward_rules`, `catalog.card_issuers` | Dropdown/reference cache by default |
| Start Plaid link | `POST /api/v1/plaid/link-token` | Empty -> `PlaidLinkTokenResponse` | Sync API | Plaid Link completion handled by exchange | None until exchange | Do not cache link token beyond expiration |
| Exchange Plaid token | `POST /api/v1/plaid/exchange-token` | `ExchangePlaidTokenRequest` -> `PlaidConnectionResponse` | Sync API + Outbox Event | `finance.user_card.created` for discovered cards | Write `finance.plaid_items`, `finance.plaid_accounts`, `finance.user_cards`, `messaging.event_outbox`; per account, **adopt a matching manual card** (see Manual↔Plaid Reconciliation) instead of inserting a duplicate | Invalidate cards and connections caches |
| Load Plaid connections | `GET /api/v1/plaid/connections` | `PlaidConnectionsResponse` | Sync API | None | Read `finance.plaid_items`, `finance.plaid_accounts`, `finance.user_cards`, `lookup.plaid_item_statuses` | Mobile short cache |
| Sync Plaid connection | `POST /api/v1/plaid/connections/sync` | `SyncPlaidConnectionRequest` -> `PlaidConnectionResponse` | Sync API + Outbox Event | `finance.plaid_connection.synced` -> card cache invalidation | Read/write Plaid tables, `finance.user_cards`, `messaging.event_outbox` | Invalidate cards/connections |
| Reconnect Plaid | `POST /api/v1/plaid/connections/reconnect` | `ReconnectPlaidConnectionRequest` -> `PlaidLinkTokenResponse` | Sync API | Plaid Link completion updates connection | Read `finance.plaid_items` | Do not cache link token beyond expiration |
| Disconnect Plaid | `POST /api/v1/plaid/connections/disconnect` | `DisconnectPlaidConnectionRequest` -> `PlaidConnectionResponse` | Sync API + Outbox Event | `finance.plaid_connection.disconnected`, `finance.user_card.updated` | Mark `finance.plaid_items` disconnected; keep related `finance.user_cards.is_active = true` and set `sync_status = 'disconnected'`; write `messaging.event_outbox` | Replace cards/connections caches; recommendations can still use active disconnected cards |
| Upgrade CTA | `POST /api/v1/billing/checkout` | `CreateCheckoutSessionRequest` -> `HostedBillingResponse` | Sync API | Stripe webhooks update subscription | Read/write billing provider state; local billing rows updated by webhook | No URL cache; entitlement cache invalidates on webhook |

## Contracts Used

| Contract | Fields Used |
|---|---|
| `CardsResponse` | `cards`, `limits` |
| `CardSummaryVm` | `id`, `displayName`, `issuerName`, `lastFour`, `source`, `isPrimary`, `syncStatus`, `cardArtUrl` |
| `CardDetailResponse` | `card`, `rewardRules`, `monthlyRewardContribution`, `terms` |
| `CardLimitsResponse` | integer `plaidUsed`, nullable integer `plaidLimit`, integer `manualUsed`, nullable integer `manualLimit`, boolean `unlimited` |
| `CardTermsVm` | `annualFee`, `purchaseApr`, `foreignTransactionFee`, `termsSummary` |
| `MonthlyRewardContributionVm` | `points`, `estimatedValue`, `currencyCode`, `periodLabel` |
| `CreateManualCardRequest` | `cardProductId`, `issuerId`, `nickname`, `lastFour` (**required**, 4 digits), `isPrimary` |
| `CreateCardProductRequest` | `issuerName`, `cardName`, `createUserCard`, `nickname`, `lastFour` (**required when `createUserCard`**), `isPrimary` |
| `CardProductRequestResponse` | `request`, `userCard` |
| `UpdateCardRequest` | `nickname`, `lastFour`, `isPrimary` |
| `RewardOverridesResponse` | `rewardRules` |
| `UpsertRewardOverrideRequest` | `categoryCode`, `multiplier`, `notes` |
| `DeleteRewardOverrideRequest` | `categoryCode` |
| `IssuersResponse` | `issuers` |
| `CardProductsResponse` | `products` |
| `CardProductResponse` | `product`, `rewardRules`, `terms` |
| `PlaidConnectionResponse` | `connections`, `cards` |
| `PlaidConnectionsResponse` | `connections` |
| `PlaidLinkTokenResponse` | `linkToken`, `expiration` |
| `EntitlementsResponse` | `planCode`, `manualCardLimit`, `plaidCardLimit`, `unlimitedCards` |
| `HostedBillingResponse` | `url` |

## Tables Involved

| Role | Tables |
|---|---|
| User cards | `finance.user_cards`, `finance.card_reward_overrides` |
| Plaid metadata | `finance.plaid_items`, `finance.plaid_accounts`, `lookup.plaid_item_statuses` |
| Catalog/reference | `catalog.card_issuers`, `catalog.card_products`, `catalog.card_product_requests`, `catalog.reward_rules`, `catalog.categories`, `lookup.card_sources`, `lookup.card_networks`, `lookup.reward_currencies`, `lookup.cap_periods` |
| Billing/limits | `billing.subscriptions`, `billing.plans`, `billing.features`, `billing.plan_features`, `billing.stripe_customers` |
| Recommendation impact | `finance.recommendations` |
| Event dispatch | `messaging.event_outbox`, `messaging.event_deliveries`, `messaging.event_subscriptions` |

## Manual↔Plaid Reconciliation

When a Plaid account is linked that the user had already added manually, the manual card is **adopted in place** rather than duplicated. During `POST /plaid/exchange-token`, for each discovered account the business (`PlaidInsertBusiness`):

1. Resolves the account's catalog product (fuzzy match on institution + account name).
2. Finds active manual cards (no `plaid_account_id`) whose `last_four` equals the Plaid account `mask` — `CardsReadService.FindAdoptableManualCardsAsync`.
3. Adopts the best match when **last-four matches AND (same `card_product_id` OR issuer name aligns with the Plaid institution)** — preferring an exact product match, then primary, then oldest. Adoption (`PlaidUpdateService.AdoptManualCardToPlaidAsync`) flips that row to `source = plaid`, attaches `plaid_account_id`, fills `card_product_id` when unset, clears the custom issuer/name, and **keeps the row id** — so reward overrides, primary flag, transactions, and recommendation history survive. No duplicate card is created.
4. Inserts a new Plaid card only when no confident match exists.

`last_four` is **required** on manual card creation (and on request-missing when it also creates a card) so this match is always confident. Within one exchange, an already-adopted manual card is not reused for a second account.

## Cache Strategy

- Card list: mobile persistent cache; refresh on foreground, pull-to-refresh, or write success.
- Card detail: mobile cache keyed by card ID; invalidate after card or reward override changes.
- Catalog/dropdowns: cached by default on mobile and server.
- Pending catalog requests: mobile cache updates from `POST /api/v1/card-catalog/requests`; admin review invalidates affected catalog/card caches.
- Plaid connections: short mobile cache; provider/local DB remains authoritative.
- New catalog/reference values: write DB first, then update or invalidate server cache.

## Sync vs Async Decisions

- Card list/detail, limits, manual create, missing card request, reward override edits, and delete are synchronous.
- Card writes insert durable outbox events in the same transaction as the source change; recommendation/cache invalidation consumers run asynchronously.
- Plaid token exchange returns synchronously with discovered connection/card metadata; provider status changes can later be webhook/sync driven.
- Stripe checkout creation is synchronous; entitlement changes are webhook driven.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| `finance.user_card.created/updated/deleted` | Cards list/detail, Home recommendation, card limits |
| `catalog.card_product_request.created` | Pending catalog request cache |
| Admin catalog request approved/merged/rejected | Catalog dropdowns, affected card list/detail, recommendations |
| `finance.reward_override.upserted/deleted` | Card detail, recommendations, transaction reward calculations |
| Plaid sync/reconnect/disconnect | Cards list, Plaid connections, recommendations; disconnected cards remain in list with `syncStatus = disconnected` |
| Stripe subscription webhook | Entitlements, card limits, upgrade guidance |
| Catalog sync or reference data write | Catalog dropdowns, card details, recommendation cache |
| Pull-to-refresh | Card list and Plaid connection cache |

## Loading And Error States

| State | Handling |
|---|---|
| Initial card list load | Show skeleton stack, then cards or empty state |
| No cards | Show `5.3` empty state with add manual, catalog, Plaid, and upgrade CTAs |
| Limit reached | Disable add action or route to billing guidance |
| Card detail missing/deleted | Return to list and refresh |
| Reward override validation error | Keep form values and show field error |
| Missing catalog card submitted | Create pending request, optionally create custom user card, then update cache from response |
| Missing catalog card rejected | Keep any custom user card user-owned; do not add catalog product |
| Plaid reconnect required | Show status and reconnect action |
| Plaid/provider failure | Keep current local connection state and allow retry |
| Plaid disconnected | Keep related cards visible, mark `syncStatus = disconnected`, and offer reconnect/remove actions |

## Design Gaps

None currently open.
