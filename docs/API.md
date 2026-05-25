# Edge Functions API Reference

All functions are Deno-based Supabase Edge Functions invoked via `supabase.functions.invoke()` or direct HTTP.

**Base URL:** `https://<project>.supabase.co/functions/v1/`

**Auth:** All endpoints require the `Authorization: Bearer <supabase-jwt>` header unless noted.

**Common request headers:**
- `x-request-id` — UUID per request (auto-set by `bffClient`)
- `x-correlation-id` — trace ID (auto-set by `bffClient`)

---

## bff-dashboard

Aggregated dashboard data in a single round-trip.

**Method:** `GET`

**Response:**
```json
{
  "transactions": [...],
  "budgets": [...],
  "alerts": [...],
  "geofences": [...],
  "patterns": [...],
  "summary": {
    "totalSpent": 1234.56,
    "avgTransaction": 45.20,
    "transactionCount": 27,
    "activeBudgets": 3,
    "alertCount": 1
  },
  "meta": {
    "responseTime": "142ms",
    "cached": false
  }
}
```

---

## process-transaction

Create a transaction with geofence matching, merchant resolution, and rule evaluation.

**Method:** `POST`

**Body:**
```json
{
  "amount": 42.50,
  "category": "Dining",
  "description": "Starbucks Coffee",
  "location_lat": 37.7749,
  "location_lng": -122.4194,
  "timestamp": "2025-05-24T10:30:00Z",
  "idempotency_key": "txn-1716549000-abc123"
}
```

**Response:**
```json
{
  "transaction": { "id": "uuid", "amount": 42.50, ... },
  "geofence_matched": true,
  "rules_applied": 2
}
```

---

## ai-categorize-transaction

Infer a spending category from a description using LLM.

**Method:** `POST`

**Body:**
```json
{
  "description": "WHOLEFDS MKT #10",
  "amount": 87.32,
  "merchant_name": "Whole Foods",
  "location_type": "grocery"
}
```

**Response:**
```json
{
  "category": "Groceries",
  "confidence": 0.97,
  "merchant_normalized": "Whole Foods Market",
  "original_description": "WHOLEFDS MKT #10"
}
```

---

## ai-analyze-spending

Generate AI-powered insights for a given time period.

**Method:** `POST`

**Body:**
```json
{ "period": "month" }
```

`period` values: `"week"` | `"month"` | `"quarter"`

**Response:**
```json
{
  "insights": ["You spent 23% more on dining this month vs last month"],
  "patterns": ["Weekly grocery shop every Saturday"],
  "recommendations": ["Set a $200 dining budget to save $80/month"],
  "topCategories": [
    { "category": "Dining", "spent": 420.00, "percentage": 34 }
  ],
  "cached": false
}
```

---

## ocr-receipt

Extract transaction data from a receipt image.

**Method:** `POST`

**Body:**
```json
{
  "image": "<base64-encoded-image>",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "amount": 24.99,
  "description": "Coffee and pastry",
  "merchant": "Blue Bottle Coffee",
  "category": "Dining",
  "timestamp": "2025-05-24T09:15:00Z",
  "confidence": 0.89
}
```

---

## plaid-link-token-create

Create a Plaid Link token to initialise the Plaid Link UI.

**Method:** `POST`

**Body:** `{}`

**Response:**
```json
{ "link_token": "link-sandbox-..." }
```

---

## plaid-exchange-token

Exchange a Plaid public token for an access token after the user completes Link.

**Method:** `POST`

**Body:**
```json
{
  "public_token": "public-sandbox-...",
  "institution_id": "ins_109508",
  "institution_name": "Chase"
}
```

**Response:**
```json
{ "success": true, "accounts_linked": 2 }
```

---

## plaid-webhook

Receives Plaid webhook events. Not called by the frontend — configured as the Plaid webhook URL in your Plaid dashboard.

**Method:** `POST`

Processes `TRANSACTIONS_DEFAULT_UPDATE`, `TRANSACTIONS_INITIAL_UPDATE`, and `TRANSACTIONS_REMOVED` events. Syncs new transactions to the `transactions` table.

---

## Error Format

All functions return errors in this shape:

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 60 seconds.",
    "correlationId": "1716549000-abc123"
  }
}
```

Common error codes: `UNAUTHORIZED`, `RATE_LIMIT_EXCEEDED`, `AI_CREDITS_DEPLETED`, `PLAID_ERROR`, `VALIDATION_ERROR`.
