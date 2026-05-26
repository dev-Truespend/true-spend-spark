# TrueSpend Source of Truth

TrueSpend is a credit-card rewards intelligence product. The source of truth is deterministic data in Supabase, not AI output.

## Ownership Model

| Fact | Source of truth | Notes |
| --- | --- | --- |
| User identity | Supabase Auth | Frontend never trusts a user id from request bodies. |
| User profile and role | `profiles` | `role = admin` gates catalog review tools. |
| Card products | `card_catalog` | Seeded with top cards and reviewed by admins. |
| Reward rules | `card_reward_rules` | Only verified or reviewable rows feed recommendations. |
| User portfolio | `user_credit_cards` | User-owned list of cards used by the rewards engine. |
| User-specific rewards | `user_card_reward_overrides` | Overrides catalog defaults for that user's cards. |
| Merchant mapping | `merchant_domains` | Extension sends domains only by default. |
| Reward ranking | `rewards-engine` | Deterministic math. No AI calls. |
| Extension suggestions | `extension-card-suggest` | Resolves merchant, ranks cards, logs domain-only event. |
| Catalog changes | `catalog_update_reviews` | Admin approval gate for proposed changes. |

## Data Flow

1. User signs in through Supabase Auth.
2. The app calls Edge Functions with the Supabase JWT.
3. Edge Functions derive the user from the JWT.
4. User-owned reads/writes use RLS.
5. Admin writes use service role only after `profiles.role = admin` is verified.
6. Rewards are calculated from `user_card_reward_overrides`, then `card_reward_rules`, then card base rate.

## AI Boundary

AI can later explain recommendations, classify unknown merchants, or draft catalog changes. AI must not directly update verified reward rules or perform card ranking math.

Any AI-generated catalog update should be inserted into `catalog_update_reviews` as `status = proposed`, then approved or rejected by an admin.

## MVP Acceptance

The foundation is ready when:

- Source-of-truth migrations are applied.
- RLS is enabled on all user-owned tables.
- At least 25 cards and 10 merchant domains are seeded.
- A user can add a card manually.
- A user can confirm or override rewards.
- `extension-card-suggest` returns a deterministic Amazon recommendation without storing a full URL.
- Admin catalog review is role-gated.
