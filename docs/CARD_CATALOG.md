# Card Catalog

The card catalog is TrueSpend's product data source of truth.

## Tables

- `card_catalog`: issuer, card name, network, annual fee, base reward rate, verification status, official URLs.
- `card_reward_rules`: category-specific rewards, caps, activation requirements, source URLs, confidence, status.
- `catalog_update_reviews`: admin review queue for proposed catalog changes.

## Verification Status

- `needs_review`: seeded or imported data that should be manually checked before being marketed as verified.
- `verified`: admin-reviewed card or rule.
- `unverified`: low-confidence or incomplete source.
- `deprecated`: card or rule should no longer be used.

The MVP seeds conservative values and marks them `needs_review`. That is intentional: it lets the app function while keeping source-of-truth honesty.

## Admin Flow

1. Admin opens `/app/admin/catalog`.
2. Admin reviews cards, rule counts, and verification status.
3. Proposed changes appear at `/app/admin/catalog/review`.
4. Admin approves or rejects changes.
5. Only approved/verified or needs-review rules are used by the deterministic engine.

## Seed Files

- `supabase/migrations/20260526090004_seed_initial_catalog.sql`
- `supabase/migrations/20260526090005_seed_merchant_domains.sql`
- `supabase/seed/001_card_catalog_seed.sql`
- `supabase/seed/002_merchant_domains_seed.sql`

Regenerate Supabase TypeScript types after applying these migrations.
