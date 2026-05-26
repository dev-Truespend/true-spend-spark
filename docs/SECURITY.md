# Security Model

TrueSpend handles financial-adjacent data, so the default posture is least privilege.

## Auth

- Supabase Auth owns identity.
- Edge Functions derive the user from the JWT.
- Request bodies must not include trusted `user_id` values.
- Protected app routes require a live user and session.

## RLS

RLS is enabled for:

- `profiles`
- `user_credit_cards`
- `user_card_reward_overrides`
- `transactions`
- `ai_recommendations`
- `extension_events`
- `catalog_update_reviews`
- `card_catalog`
- `card_reward_rules`
- `merchant_domains`

Users can read/write only their own portfolio and overrides. Authenticated users can read active catalog data. Admin writes go through Edge Functions.

## Admin Access

Admin functions:

- Validate the Supabase JWT.
- Read `profiles.role`.
- Use service role only after admin verification.
- Write review metadata for catalog changes.

## Browser Extension Privacy

The extension source-of-truth endpoint stores:

- Domain
- Merchant name
- Normalized category
- Event type
- Safe metadata such as intent and amount

It does not store full URLs by default.

## Secrets

Do not expose these in frontend or extension bundles:

- `SUPABASE_SERVICE_ROLE_KEY`
- Plaid secrets
- Stripe secrets
- Resend API key
- Anthropic API key
- Sentry auth tokens

Frontend and extension code should only use publishable keys.

## Production Checks

Run:

```bash
npm run validate:env
npm run validate:catalog
npm run validate:rewards
npm run validate:extension
npm run validate:rls
```

Some validation scripts require test JWTs:

- `VALIDATION_USER_JWT`
- `VALIDATION_USER_A_JWT`
- `VALIDATION_USER_B_JWT`
