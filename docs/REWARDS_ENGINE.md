# Rewards Engine

The rewards engine is deterministic. It does not call Claude, OpenAI, or any other model for reward math.

## Inputs

```json
{
  "merchant_name": "Amazon",
  "domain": "amazon.com",
  "normalized_category": "shopping",
  "amount_cents": 5000
}
```

## Ranking Order

For each active user card:

1. Use `user_card_reward_overrides` for that card and category.
2. If no override exists, use `card_reward_rules` for the linked catalog card and category.
3. If no category rule exists, use the catalog card base reward rate.
4. Convert the reward into estimated cents.
5. Sort by estimated value descending.

## Reward Math

- `percent`: `amount_cents * reward_rate / 100`
- `points_per_dollar`: `dollars * points * point_value_cents`
- `miles_per_dollar`: `dollars * miles * point_value_cents`

The frontend pure functions live in `src/shared/lib/rewardsMath.ts`. The Edge Function uses the same logic in `supabase/functions/_shared/source-truth.ts`.

## Extension Endpoint

`extension-card-suggest` wraps merchant resolution and reward ranking:

1. Validate JWT.
2. Normalize the domain.
3. Resolve `merchant_domains`.
4. Rank user cards.
5. Insert `extension_events` with domain only.
6. Return best card and alternatives.

Full URLs are not stored by default.
