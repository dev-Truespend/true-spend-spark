# Plaid ↔ RewardsCC Category Bridge

> **Status:** Phase 1 built (table, EF entity, partial seed). Joins Plaid-categorized transactions to RewardsCC-categorized reward rules.

## Purpose

Translate a transaction's Plaid category into the RewardsCC vocabulary so the reward engine can answer "which of my cards rewards this transaction?" — required by missed-reward calc, insights donut, and AI insights.

## Why it's needed

Two taxonomies, two different sources, no shared join key today:

| Side | Table | Source | Example |
|---|---|---|---|
| Transactions | `finance.transactions.transaction_category_id` → `finance.transaction_categories` | Plaid `personal_finance_category` (16 primaries + ~104 detaileds) | `TRAVEL_LODGING` |
| Reward rules | `catalog.reward_rules.category_id` → `catalog.categories` | RewardsCC sync (open-ended; `category_group`, `subcategory_group`, leaf) | `subcategory_group = 'Hotel'` |

Without a bridge: `transactions.category_id` stays NULL after Plaid sync, no reward rule fires, `transaction_reward_results` stays empty, insights show no earned/missed per category.

## Match layer = `subcategory_group`, not leaf

RewardsCC categories form a 3-level tree. Bridge at the **middle level** — small, finite, stable.

| RewardsCC `subcategory_group` | Maps to Plaid leaf |
|---|---|
| `All Dining` | `FOOD_AND_DRINK_RESTAURANT` |
| `Grocery` | `FOOD_AND_DRINK_GROCERIES` |
| `All Gas Stations` | `TRANSPORTATION_GAS` |
| `Hotel` | `TRAVEL_LODGING` |
| `All Online Shopping` | `GENERAL_MERCHANDISE_ONLINE_MARKETPLACES` |

Brand-specific RewardsCC leaves (`Hilton Hotels & Resorts`, `Peloton`, `Lyft`) all inherit a generic `subcategory_group` from the provider payload. They become bridgeable for free. Brand precision (e.g. 12x at Hilton vs 4x at generic hotel) is decided at a separate merchant-name layer, not at the bridge.

## Schema

```sql
create table finance.transaction_category_bridge (
  transaction_category_id smallint primary key
    references finance.transaction_categories(id),
  subcategory_group text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on finance.transaction_category_bridge(subcategory_group);
```

PK on `transaction_category_id` → one-to-one mapping per Plaid leaf. `subcategory_group` is text (RewardsCC owns the vocabulary; not normalized into a lookup).

Lives in the **`finance`** schema, not `catalog`: the only FK is `finance.transaction_categories`, and `catalog.sql` migrates before `finance.sql` (finance depends on catalog), so a `catalog`→`finance` FK is an unsatisfiable file-ordering. No `confidence`/`source` columns — population is fully deterministic, no AI path.

## Population strategy

| Order | Source | When |
|---|---|---|
| 1 | Hand seed (~19 rewardable rows) | Pre-built before prod. Both sides are known by then (Plaid pre-seeded, RewardsCC catalog pre-synced), so the mapping is deterministic. No AI. |
| 2 | Admin append | One row per gap surfaced by `CardCatalogMappingReviewJob` when an on-demand card introduces a new `subcategory_group`. |

Current seed state: 7 rows sealed against the 5 confirmed `subcategory_group` strings; ~12 rewardable leaves stubbed (Plaid code pre-filled) pending the full RewardsCC catalog sync. See [job-architecture.md § Category Bridge Population](../low-level-design/Service/job-architecture.md#category-bridge-population-gap).

New RewardsCC categories from sync **do not** trigger anything — they inherit an existing `subcategory_group` already covered by the bridge.

Unbridged Plaid leaf → base reward rate (under-credit, never a wrong bonus); flagged for admin review.

## How reward calc uses it (materialize-on-write)

In `TransactionsInsertService.UpsertPlaidTransactionAsync`, after resolving `transaction_category_id` from Plaid, also resolve `category_id` via the bridge and store both on the row.

```text
Plaid leaf
  → bridge → subcategory_group
    → catalog.categories WHERE subcategory_group = X (may be multiple rows)
      → catalog.reward_rules joined to user's cards
        → highest multiplier wins → transactions.category_id = that row's id
```

Reward engine (`TransactionsInsertService.InsertRewardResultAsync` and missed-reward path) joins `transactions.category_id = reward_rules.category_id` unchanged.

## End-to-end example

User holds Sapphire Reserve + Freedom Unlimited. Spends $200 at Hilton on Freedom Unlimited:

| Step | Result |
|---|---|
| Plaid sync | `personal_finance_category.detailed = TRAVEL_LODGING` |
| Resolve transaction category | `transaction_category_id = <id of TRAVEL_LODGING>` |
| Bridge lookup | `subcategory_group = 'Hotel'` |
| Find candidate reward rules | All `catalog.categories WHERE subcategory_group = 'Hotel'` joined to user's cards → Sapphire Reserve 4x Hotels, Freedom Unlimited base 1.5x |
| Apply to actual card | Freedom Unlimited 1.5x → earned $3.00 |
| Compute missed reward | Best other card: Sapphire Reserve 4x → $8.00 hypothetical → missed $5.00 |
| Insight generated | "Missed $5. Sapphire Reserve would have earned 4x Hotels." |

If user also held Amex Aspire AND Foursquare confirmed merchant chain = Hilton, the brand-specific 14x Hilton rule fires instead of the generic 4x. That precision is added by a separate merchant-resolution layer; the bridge is unchanged.

## Tables Involved

| Table | Role |
|---|---|
| `finance.transaction_category_bridge` | New. Bridge rows. |
| `finance.transaction_categories` | Existing. Plaid PFC taxonomy. |
| `finance.transactions` | Existing. `transaction_category_id` already populated by Plaid sync; `category_id` gets populated by bridge lookup. |
| `catalog.categories` | Existing. RewardsCC categories. `subcategory_group` column already present. |
| `catalog.reward_rules` | Existing. Reward calc joins via `category_id`. |

No schema changes outside the new bridge table.

## Out of scope

| Item | Why |
|---|---|
| Brand-specific overrides (Costco gas as Wholesale Club, Whole Foods as Amazon) | Needs a separate per-merchant override layer on top of the bridge. Track separately. |
| Foursquare ↔ RewardsCC bridge | Same architectural shape but different source side. Document separately if/when geo-recommendation needs it for un-chained venues. |
| Per-card category overrides | E.g., Citi Custom Cash auto-picks the user's top category each statement. Cannot be modeled here; needs runtime computation per statement. |
| Plaid taxonomy versioning beyond `pfc-v1` | Today only `source_version = 'pfc-v1'` is seeded. When Plaid bumps to v2, bridge rows pointing at deprecated `transaction_categories` rows need re-validation. |

## Implementation phases

| Phase | Status | Work |
|---|---|---|
| 1 | Done | Migration: `finance.transaction_category_bridge` table + EF entity, configuration, DbSet. |
| 1 | Done | Seed `finance_transaction_category_bridge.sql` — 7 sealed rows + ~12 stubs. Wired into `run-all.sql`. |
| 2 | Done | `reward_rules.is_merchant_locked` + `merchant_brand`; flagged in catalog sync via `RewardsCcBrandDetection` generic-name allowlist. |
| 3 | Done | `MerchantBrandMatcher` — brand alias families + `merchant_name` normalizer. |
| 4 | Done | `UpsertPlaidTransactionAsync` — bridge lookup resolves `subcategory_group` → catalog category, stored on `transactions.category_id`; unbridged leaf → base rate. Returns category code + merchant for calc. |
| 5 | Done | `TransactionRewardCalculator` — locked rules held in `UserCardReward.MerchantLockedRates`, credit earned and missed only on `MerchantBrandMatcher` match. |
| 6 | Done | Insights donut (`AnalyticsReadService`) buckets on Plaid primary, not bridged `category_id`. |
| 7 | Pending | Post-catalog: fill the ~12 stub rows from `SELECT DISTINCT subcategory_group`; backfill existing transactions via force-resync. |

## Design Gaps

| Gap | Disposition |
|---|---|
| Unbridged Plaid leaf is not flagged for admin review. | Falls back to base reward rate (safe under-credit), but the `CardCatalogMappingReviewJob` flag is unimplemented — `catalog.card_product_review_items` is card-mapping shaped, not leaf shaped, so a leaf-review structure is still needed. |
| Modify path recomputes rewards on the bridge category, not a user's category override. | `transactions.category_id` override is preserved for display, but the reward recompute on a Plaid modify uses the freshly bridged category. Acceptable for MVP; revisit if override-aware recompute is needed. |
