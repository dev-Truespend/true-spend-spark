# Edge Functions API Reference

Base URL:

```text
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

Most functions require:

```http
Authorization: Bearer <supabase-user-jwt>
Content-Type: application/json
```

Provider webhooks use provider signatures instead of a user JWT.

## Source-Of-Truth Rewards Endpoints

These endpoints are the MVP path for card portfolio setup and browser-extension recommendations. They use Supabase JWT auth and never trust `user_id` from the request body.

### `card-search`

Searches active `card_catalog` rows.

```json
{ "query": "amex gold" }
```

### `card-add-user-card`

Adds a catalog card to the authenticated user's portfolio.

```json
{
  "card_catalog_id": "uuid",
  "display_name": "Amex Gold",
  "last4": "1234"
}
```

### `card-update-reward-overrides`

Stores user-confirmed reward overrides.

```json
{
  "user_credit_card_id": "uuid",
  "overrides": [
    { "category": "dining", "reward_rate": 4, "reward_unit": "points_per_dollar" }
  ]
}
```

### `merchant-resolve`

Resolves a domain to `merchant_domains`. Unknown domains return `status = unknown`; AI classification is intentionally not called in this phase.

```json
{ "domain": "amazon.com", "page_title": "Amazon" }
```

### `rewards-engine`

Deterministically ranks the authenticated user's active cards.

```json
{
  "merchant_name": "Amazon",
  "domain": "amazon.com",
  "normalized_category": "shopping",
  "amount_cents": 5000
}
```

### `extension-card-suggest`

Main browser-extension endpoint. It stores domain-only extension events and returns the best card plus alternatives.

```json
{
  "domain": "amazon.com",
  "page_title": "Amazon",
  "page_intent": "product",
  "amount_cents": 5000
}
```

### Admin Catalog Endpoints

- `admin-catalog-create-card`
- `admin-catalog-review-update`

Both require `profiles.role = admin` before service-role writes occur.

## Standard Error Shape

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User must be signed in",
    "correlationId": "request-id"
  }
}
```

## `ai-agent`

Primary AI orchestration endpoint. New user-facing AI features should use this endpoint instead of creating another single-purpose AI function.

**Method:** `POST`

**Body:**

```json
{
  "intent": "analyze_spending",
  "payload": {
    "period": "month"
  }
}
```

Supported intents:

| Intent | Payload |
| --- | --- |
| `analyze_spending` | `{ "period": "week" | "month" | "quarter" }` |
| `best_card_now` | `{ "merchant": "Whole Foods", "category": "groceries", "amount": 87.32 }` |
| `missed_rewards` | `{ "period": "month" }` |
| `recommend_card_to_apply` | `{ "goal": "maximize dining rewards" }` |
| `chat` | `{ "message": "What's my best card for Amazon?" }` |

**Response:**

```json
{
  "response": "Your highest spend this month is dining...",
  "data": {
    "top_categories": [
      { "category": "Dining", "amount": 420.5, "percentage": 34 }
    ]
  },
  "toolCalls": ["get_spending_summary"]
}
```

## AI Compatibility Endpoints

These endpoints remain for existing callers. Prefer `ai-agent` for new code.

### `ai-analyze-spending`

Returns the legacy spending-analysis shape for Insights and older clients.

```json
{ "period": "month" }
```

### `ai-categorize-transaction`

```json
{
  "description": "WHOLEFDS MKT #10",
  "merchant_name": "Whole Foods",
  "amount": 87.32,
  "location_type": "grocery"
}
```

### `location-insights-ai`

Legacy location insight generator. Keep only until location features are migrated to `ai-agent`.

## Transactions

### `process-transaction`

Creates a manual transaction, resolves merchant/geofence context, and evaluates budget rules.

```json
{
  "amount": 42.5,
  "category": "Dining",
  "description": "Coffee",
  "timestamp": "2026-05-26T10:30:00Z",
  "location_lat": 37.7749,
  "location_lng": -122.4194,
  "idempotency_key": "txn-uuid"
}
```

### `bff-transactions`

Paginated transaction read API with filters and optional Redis caching.

Query params:

| Param | Example |
| --- | --- |
| `page` | `1` |
| `limit` | `25` |
| `category` | `Dining` |
| `dateFrom` | `2026-05-01` |
| `dateTo` | `2026-05-31` |
| `creditCardId` | `uuid` |
| `search` | `whole foods` |
| `synced` | `true` |

## Plaid

### `plaid-create-link-token`

Creates a Plaid Link token for the current user.

```json
{}
```

### `plaid-exchange-token`

Exchanges Plaid's public token for stored access credentials.

```json
{
  "public_token": "public-sandbox-...",
  "institution_id": "ins_109508",
  "institution_name": "Chase"
}
```

### `plaid-sync-transactions`

Manually triggers transaction sync for a linked item.

```json
{
  "item_id": "uuid"
}
```

### `webhook-plaid`

Provider webhook. Configure in Plaid dashboard:

```text
https://<project-ref>.supabase.co/functions/v1/webhook-plaid
```

Production gaps:

- JWT signature verification must be completed.
- Removed transactions must soft-delete or mark inactive.
- Pending-to-posted transitions must deduplicate correctly.

## Stripe

### `stripe-create-checkout-session`

Creates Stripe Checkout for a subscription plan.

```json
{
  "priceId": "price_...",
  "successUrl": "https://app.example.com/settings/billing?success=true",
  "cancelUrl": "https://app.example.com/settings/billing?canceled=true"
}
```

### `stripe-create-portal-session`

Creates a Stripe customer portal session.

```json
{
  "returnUrl": "https://app.example.com/settings/billing"
}
```

### `stripe-update-subscription`

Changes the current user's subscription price.

```json
{
  "priceId": "price_..."
}
```

### `stripe-webhook`

Provider webhook. Configure in Stripe dashboard:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Requires `STRIPE_WEBHOOK_SECRET`.

## Email

### `send-email-notification`

Sends transactional email through the configured email provider.

### `send-verification-email`

Sends or resends email verification.

### `request-password-reset` / `complete-password-reset`

Password reset flow wrappers around Supabase Auth.

## OCR

### `ocr-process-receipt`

Extracts structured receipt data from an uploaded image URL.

```json
{
  "imageUrl": "https://<storage-url>/receipt.jpg"
}
```

## Endpoint Design Rules

- Use `ai-agent` for new AI behavior.
- Use direct table queries only for simple RLS-safe reads.
- Put provider secrets and webhook handling in Edge Functions.
- Keep response shapes stable for frontend callers.
- Add idempotency keys to any endpoint that creates financial records.
