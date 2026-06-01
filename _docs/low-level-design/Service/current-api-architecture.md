# API Architecture

This document inventories the Supabase Edge Functions in `supabase/functions`.
It is based on direct code inspection of each `index.ts` file.

Legend:

- **Current auth** describes what the function currently enforces in code.
- **Should be** is the recommended production boundary for the endpoint.
- **External calls** excludes Supabase database/storage/auth calls and includes third-party APIs or internal Edge Function HTTP calls.
- Most functions accept `OPTIONS` for CORS even when not listed in the contract.

## Executive Summary

Most implemented backend APIs are Supabase Edge Functions. There are 119 deployed function entry points.

The API surface has three security classes:

- **User APIs:** should require a Supabase user JWT and enforce ownership through `user.id`.
- **Admin/internal APIs:** should require admin role, service-role caller, cron secret, or private network/job-only access.
- **Webhook APIs:** should be unauthenticated by user JWT but must verify provider signatures.

Important gaps found:

- Several internal/job functions use the service role but do not authenticate the caller. These should be protected with a cron secret, service-role JWT, or admin-only check before production exposure.
- Some user-impacting notification and ML functions accept target `userId` or training identifiers without a clear caller authorization check.
- Public helper endpoints such as Maps/Foursquare proxy functions expose paid external APIs and should be rate-limited and authenticated unless intentionally public.
- Webhooks should keep provider signature verification mandatory. `modal-training-callback` currently logs the Modal signature but does not verify it.

## Cross-Cutting Standards

Recommended defaults:

- Require `Authorization: Bearer <Supabase JWT>` for user-facing functions.
- Use `supabase.auth.getUser(token)` and scope reads/writes to `user.id`.
- Use `user_roles.role = 'admin'` for admin dashboards and operations.
- Use `x-cron-secret` or service-role JWT for cron/worker functions.
- Use provider signatures for Stripe, Plaid, Resend, and Modal webhooks.
- Return JSON consistently as either `{ success: true, ... }` / `{ success: false, error }` or `{ ok: true, data }` / `{ ok: false, error }`.
- Keep third-party API keys only inside Edge Functions.

## Core, Gateway, Health, Security

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `api-gateway` | No user auth; proxies with service role and forwarded auth header. | Public gateway may be allowed, but rate limiting and route allowlist should be mandatory. | Internal: `rate-limiter`, `health-check`. | Req: path/method/body passthrough. Res: gateway metadata, proxied response, or `{ error }`. |
| `rate-limiter` | Optional/derived user auth; falls back to IP. | Allow for gateway/internal use; protect direct mutation with service/internal auth. | None. | Req: `{ endpoint = "/api" }`. Res: `{ allowed, remaining, limit, reset }` or 429 `{ error, retryAfter }`. |
| `health-check` | No auth. | Public is acceptable if it reveals only non-sensitive health. | None. | Req: none. Res: health status, timestamp, dependencies, or `{ status: "unhealthy", error }`. |
| `service-health-check` | No auth. | Admin/internal only because it calls service endpoints. | Internal configured service endpoints. | Req: none. Res: aggregate service health or `{ error }`. |
| `security-headers` | No auth. | Public utility is acceptable. | None. | Req: `{ action }`. Res: `{ headers }` or `{ error: "Invalid action" }`. |
| `widget-data` | Requires user JWT. | User JWT; data scoped to authenticated user. | None. | Req: none. Res: `{ ok: true, data }` or `{ ok: false, error }`. |

## Authentication, MFA, Account, GDPR

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `audit-google-login` | Requires user JWT. | User JWT; log only for current user. | None. | Req: `{ eventType, success, reason, ipAddress, userAgent }`. Res: `{ success: true }` or `{ error }`. |
| `check-auth-provider` | No user auth; service role lookup by email. | Public but heavily rate-limited; avoid account enumeration. | None. | Req: `{ email }`. Res: provider/account/MFA status or generic none/error. |
| `check-login-attempts` | No user auth; service role lookup by email. | Public but heavily rate-limited; generic responses preferred. | None. | Req: `{ email }`. Res: `{ locked, lockExpiresAt?, message? }`. |
| `check-mfa-status` | No user auth; service role lookup by email. | Public only if anti-enumeration and rate limiting are enforced. | None. | Req: `{ email }`. Res: `{ exists, hasLocal, mfaEnabled }`. |
| `increment-login-failures` | No auth; service role update by `userId`. | Internal/auth-flow only; require service-role or signed internal secret. | None. | Req: `{ userId }`. Res: `{ locked, lockExpiresAt? }` or `{ failedAttempts }`. |
| `record-login-attempt` | No auth; service role insert. | Internal/auth-flow only; require service-role or signed internal secret. | None. | Req: `{ email, success, ipAddress, userId, metadata }`. Res: `{ success: true }` or `{ error }`. |
| `request-password-reset` | No auth; token email flow. | Public with rate limiting and generic response. | Resend email. | Req: `{ email }`. Res: generic success, Google-account hint, or validation error. |
| `complete-password-reset` | No auth; validates reset token. | Public token endpoint; token must be single-use, expiring. | Resend email. | Req: `{ token, newPassword }`. Res: success message or `{ error }`. |
| `request-account-recovery` | No auth; email flow. | Public with generic response and rate limiting. | Resend email. | Req: `{ email }`. Res: `{ ok: true }` always. |
| `send-verification-email` | Requires user JWT. | User JWT; current user only. | Resend email. | Req: none. Res: `{ success, expiresAt, message, request_id }` or rate/verified errors. |
| `verify-email` | No auth; token validation. | Public token endpoint. | None. | Req: `{ token }`. Res: success message or token/expired/account-deleted error. |
| `request-email-change` | Requires user JWT. | User JWT; current user only. | Resend email. | Req: `{ newEmail }`. Res: confirmation sent with `expiresAt` or validation/conflict error. |
| `confirm-email-change` | No auth; token validation. | Public token endpoint. | None. | Req: `{ token }`. Res: success with `newEmail` or token/expiry error. |
| `verify-current-password` | Requires user JWT. | User JWT; current user only. | None. | Req: `{ password }`. Res: `{ valid: true }` or `{ valid: false, error }`. |
| `mfa-generate-secret` | Requires user JWT. | User JWT; current user only. | None. | Req: none. Res: `{ secret, qrCodeUrl, issuer, label }` or `{ error }`. |
| `mfa-enable` | Requires user JWT. | User JWT; current user only, rate-limited. | None. | Req: `{ code }`. Res: success with backup codes or MFA verification errors. |
| `mfa-disable` | Requires user JWT plus password. | User JWT; current user only; password or recent auth required. | None. | Req: `{ password }`. Res: success message or password/auth errors. |
| `mfa-cancel-setup` | Requires user JWT. | User JWT; current user only. | None. | Req: none. Res: `{ success: true }` or `{ error }`. |
| `mfa-regenerate-backup-codes` | Requires user JWT plus TOTP code. | User JWT; current user only. | None. | Req: `{ code }`. Res: `{ success, backupCodes }` or MFA errors. |
| `mfa-verify-totp` | No JWT; verifies `userId` and code. | Login challenge endpoint; require challenge/session binding, not bare `userId`. | None. | Req: `{ userId, code }`. Res: `{ valid }` or MFA/rate-limit errors. |
| `mfa-verify-backup-code` | No JWT; verifies `userId` and code. | Login challenge endpoint; require challenge/session binding, not bare `userId`. | None. | Req: `{ userId, code }`. Res: `{ valid, remainingCodes? }` or MFA/rate-limit errors. |
| `delete-account` | Requires user JWT; confirms with password; admin/service role used internally. | User JWT for self-delete; admin role only for deleting others. | Stripe SDK for customer/subscription cleanup. | Req: confirmation/password fields from body. Res: scheduled deletion `{ ok, purge_after }` or errors. |
| `cancel-account-deletion` | Requires user JWT; admin role needed to target another `userId`. | User JWT for self; admin role for others. | None. | Req: optional `{ userId }`. Res: `{ ok, message }` or pending/expired errors. |
| `data-export-request` | Requires user JWT. | User JWT; current user only. | None. | Req: none. Res: export/audit data or `{ error, details }`. |
| `gdpr-purge-deleted-accounts` | Requires `x-cron-secret`. | Cron-only secret or private scheduled job. | None. | Req: none. Res: `{ ok, processed, succeeded, failed, results }`. |
| `cleanup-unverified-accounts` | No auth. | Cron-only secret or service-role JWT. | None. | Req: none. Res: `{ success, deletedCount }` or `{ error }`. |
| `seed-admin-user` | No auth. | One-time local/admin-only; remove or protect with admin secret. | None. | Req: none. Res: admin role assignment status. |

## Billing And Stripe

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `stripe-create-checkout-session` | Requires user JWT. | User JWT; price allowlist; current user metadata only. | Stripe SDK. | Req: `{ priceId, successUrl, cancelUrl }`. Res: `{ url, sessionId }` or `{ error }`. |
| `stripe-create-portal-session` | Requires user JWT. | User JWT; current user's Stripe customer only. | Stripe SDK. | Req: `{ returnUrl }`. Res: `{ url }` or `{ error }`. |
| `stripe-update-subscription` | Requires user JWT; price allowlist. | User JWT; current user's subscription only. | Stripe SDK. | Req: `{ priceId }`. Res: `{ subscriptionId, status }` or `{ error }`. |
| `stripe-webhook` | Stripe signature verification. | Webhook only; keep `stripe-signature` verification mandatory. | Stripe SDK. | Req: raw Stripe event. Res: `{ received: true }`, duplicate marker, or signature/internal error. |

## Plaid And Credit Cards

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `plaid-create-link-token` | Requires user JWT. | User JWT; current user only. | Plaid `/link/token/create`. | Req: none. Res: `{ link_token }` or `{ error }`. |
| `plaid-exchange-token` | Requires user JWT. | User JWT; current user only. | Plaid `/item/public_token/exchange`, `/accounts/get`. | Req: `{ public_token, metadata }`. Res: `{ success, cards, institution }` or `{ error }`. |
| `plaid-sync-transactions` | Requires user JWT. | User JWT; item/card must belong to current user. | Plaid `/transactions/sync`. | Req: `{ item_id, card_id }`. Res: `{ success, synced }` or `{ error }`. |
| `plaid-refresh-accounts` | Requires user JWT. | User JWT; item must belong to current user. | Plaid `/accounts/balance/get`. | Req: `{ item_id }`. Res: `{ success, updated }` or `{ error }`. |
| `plaid-disconnect-item` | Requires user JWT. | User JWT; item must belong to current user. | Plaid `/item/remove`. | Req: `{ item_id }`. Res: `{ success: true }` or `{ error }`. |
| `webhook-plaid` | Plaid webhook JWT verification. | Webhook only; keep `Plaid-Verification` mandatory. | Plaid `/webhook_verification_key/get`, `/transactions/sync`. | Req: Plaid webhook body. Res: `{ received: true }`, warning, or signature/internal error. |

## Transactions, Budgets, Insights

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `bff-dashboard` | Requires user JWT. | User JWT; all queries scoped to `user.id`. | Azure Cache for Redis. | Req: none. Res: dashboard aggregate with cache metadata or `{ error }`. |
| `bff-transactions` | Requires user JWT. | User JWT; all filters scoped to `user.id`. | Azure Cache for Redis. | Query: `page`, `limit`, `category`, `geofenceId`, `dateFrom`, `dateTo`, `creditCardId`, `search`, `synced`, `sort`, `refresh`. Res: paged transactions plus cache flag or `{ error }`. |
| `process-transaction` | Requires user JWT. | User JWT; writes only current user's transaction. | None. | Req: transaction input body. Res: `{ ok, data }` or typed `{ ok: false, error }`. |
| `auto-categorize-transaction` | No auth; service role. | User/internal only; transaction ownership should be checked. | None. | Req: `{ transactionId, merchantName, description, amount }`. Res: `{ category, method, confidence? }` or `{ error }`. |
| `ai-categorize-transaction` | Requires user JWT. | User JWT; current user's categorization/logs only. | Lovable AI gateway. | Req: categorization input, especially `description`. Res: `{ ok, data }` or typed error. |
| `huggingface-categorize` | Requires user JWT. | User JWT; rate-limited per user. | HuggingFace through shared HF client. | Req: `{ merchantName, description, amount }`. Res: `{ success, data: { category, confidence, method } }` or fallback/error. |
| `ai-analyze-spending` | Requires user JWT. | User JWT; reads only current user's data. | Lovable AI gateway. | Req: `{ period = "month" }`. Res: insights/patterns/recommendations with cache flag or AI errors. |
| `detect-transaction-anomalies` | Requires user JWT. | User JWT; current user's transactions only. | None. | Req: none. Res: `{ anomalies, stats }` or insufficient-data/error. |
| `generate-budget-recommendations` | Requires user JWT. | User JWT; current user's transactions/budgets only. | None. | Req: none. Res: `{ success, recommendations, analyzed_transactions }` or `{ error }`. |
| `thompson-sampling-budget` | Requires user JWT. | User JWT; current user's historical spending only. | None. | Req: `{ categories, totalBudget, periodStart, periodEnd }`. Res: `{ success, allocations }` or `{ error }`. |
| `check-budget-status` | Requires user JWT. | User JWT; current user's budgets only. | None. | Req: `{ merchant, price }`. Res: `{ ok, alerts, budgetStatus, priceDetected }` or `{ error }`. |

## Location, Maps, Merchants, Geofencing

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `location-analytics-bff` | Requires user JWT. | User JWT; current user's locations/geofences only. | Azure Cache for Redis. | Req: `{ period_days = 30, geofence_id }`. Res: analytics aggregate with cache info or `{ error }`. |
| `location-insights-ai` | Requires user JWT. | User JWT; current user's location/transaction data only. | Lovable AI gateway. | Req: none. Res: `{ success, insights, stats }` or AI/auth error. |
| `merchant-discovery` | Requires user JWT. | User JWT; paid Google access should remain server-side and rate-limited. | Azure Cache for Redis, Google Places nearby search. | Req: `{ lat, lng, category, deals_only }`. Res: `{ merchants, cache_hit, cache_layer }` or `{ error }`. |
| `deal-notification-trigger` | Requires user JWT. | User JWT; geofence must belong to user. | None. | Req: `{ geofence_id, lat, lng }`. Res: notification counts/deals or auth/validation error. |
| `notify-nearby-deals` | Requires user JWT. | User JWT; user-scoped deal lookup. | None. | Req: `{ latitude, longitude, radiusMiles = 5 }`. Res: `{ ok, deals, count }` or `{ error }`. |
| `geofence-processor` | No auth; service role. | Internal worker/cron only. | Internal: `foursquare-enrich-geofence`. | Req: none. Res: `{ success, processed, timestamp }` or `{ error }`. |
| `foursquare-enrich-geofence` | No auth; service role. | Internal worker only; do not expose publicly. | Internal: `foursquare-places-search`. | Req: `{ geofence_event_id, lat, lng, user_id }`. Res: enriched place/merchant status or `{ error }`. |
| `foursquare-places-search` | No auth. | Authenticated or internal; paid API should be rate-limited. | Foursquare Places Search. | Req: `{ lat, lng, radius = 100, categories, query, limit = 10 }`. Res: `{ results, cached }` or fallback empty results. |
| `foursquare-place-details` | No auth. | Authenticated or internal; paid API should be rate-limited. | Foursquare Place Details. | Req: `{ fsq_id }`. Res: `{ place, cached }` or `{ error }`. |
| `foursquare-sync-categories` | No auth. | Cron/admin only. | Foursquare Categories. | Req: none. Res: `{ success, synced, errors, total }` or `{ error }`. |
| `foursquare-cache-cleanup` | No auth. | Cron/internal only. | None. | Req: none. Res: cache cleanup counts or `{ error }`. |
| `google-geolocation` | No auth. | Authenticated or internal; paid API should be rate-limited. | Google Geolocation API. | Req: optional IP/body. Res: `{ lat, lng, accuracy, cache_hit, response_time_ms }` or `{ error }`. |
| `google-maps-geocode` | No auth. | Authenticated or internal; paid API should be rate-limited. | Google Geocoding API. | Req: `{ address }` or `{ lat, lng }`. Res: geocode fields with cache info or `{ error }`. |
| `google-maps-autocomplete` | No auth. | Authenticated or internal; paid API should be rate-limited. | Google Places Autocomplete. | Req: `{ input, session_token }`. Res: `{ predictions, session_token, response_time_ms }` or `{ error }`. |
| `google-maps-directions` | No auth. | Authenticated or internal; paid API should be rate-limited. | Google Directions API. | Req: `{ origin, destination, waypoints?, mode?, optimize_waypoints? }`. Res: route components with cache info or `{ error }`. |
| `google-places-details` | No auth. | Authenticated or internal; paid API should be rate-limited. | Google Place Details API. | Req: `{ place_id, fields? }`. Res: place details with cache info or `{ error }`. |
| `sign-location-payload` | Requires user JWT. | User JWT; current user only. | None. | Req: `{ lat, lng, timestamp, accuracy }`. Res: `{ token, expires_at, user_id }` or validation error. |
| `verify-location-payload` | No user JWT; verifies HMAC token. | Token verifier can be public if token is signed/expiring. | None. | Req: `{ token, lat, lng }`. Res: `{ valid, user_id?, timestamp?, accuracy? }` or error. |

## OCR, AI, ML

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `google-vision-ocr` | Requires user JWT; per-user cost/rate checks. | User JWT; current user's cost limits. | Google Vision API; optional image URL fetch. | Req: `{ imageUrl }` or `{ imageBase64 }`. Res: `{ success, data, rawText, meta }` or `{ success: false, error }`. |
| `huggingface-ocr-receipt` | Requires user JWT. | User JWT; rate-limited per user. | HuggingFace through shared HF client. | Req: `{ imageUrl }` or `{ imageBase64 }`. Res: OCR text/data with `method: "hf-server"` or fallback/error. |
| `ocr-process-receipt` | No auth. | User JWT required; OCR costs and uploaded image access should be scoped. | Lovable AI gateway. | Req: `{ imageUrl }`. Res: structured receipt data or `{ success: false, error }`. |
| `ocr-queue-processor` | No auth. | Internal worker/cron only. | Internal: `google-vision-ocr`. | Req: `{ batchSize = 10 }`. Res: `{ success, processed/results }` or `{ error }`. |
| `ocr-health-check` | No auth. | Admin/internal only. | None. | Req: none. Res: OCR health/cost status or down error. |
| `ocr-alert-monitor` | No auth. | Internal scheduled monitor only. | None. | Req: none. Res: `{ success, alertCount, alerts, timestamp }` or `{ error }`. |
| `ocr-maintenance` | No auth. | Internal scheduled maintenance only. | None. | Req: none. Res: `{ success, results, summary }` or `{ error }`. |
| `ocr-security-monitor` | No auth. | Internal scheduled security monitor only. | None. | Req: none. Res: `{ success, actions, timestamp }` or `{ error }`. |
| `ml-inference` | Requires user JWT. | User JWT; model access and logged prediction scoped to user. | None. | Req: `{ model_type, input_data, model_id? }`. Res: prediction with model metadata or `{ error }`. |
| `prepare-training-data` | Requires user JWT, no admin role check. | Admin or privileged ML operator only unless data is user-local. | None. | Req: `{ model_type, date_range }`. Res: `{ training_data_id, model_type, record_count }` or `{ error }`. |
| `modal-training-trigger` | No auth. | Admin/internal only; currently high risk because it signs training data and starts jobs. | Modal API. | Req: `{ model_type, training_data_id, config }`. Res: `{ job_id, modal_job_id, model_type, status }` or `{ error }`. |
| `modal-training-callback` | No auth; optional signature is logged, not verified. | Modal webhook signature verification required. | None. | Req: `{ model_id, artifact_url, metrics, modal_job_id, status }`. Res: model registration/job update status or `{ error }`. |
| `deploy-shadow-model` | Requires user JWT and admin role. | Admin only. | None. | Req: `{ model_id, traffic_split = 5 }`. Res: deployment status or typed error response. |
| `schedule-retraining` | Requires user JWT and admin role. | Admin only. | Modal may be triggered when `auto_trigger` is true. | Req: `{ model_type, schedule_type = "weekly", auto_trigger = false }`. Res: schedule/job status. |
| `semantic-search-transactions` | Requires user JWT. | User JWT; search current user's transactions only. | HuggingFace embeddings. | Req: `{ query, limit = 10, threshold = 0.5 }`. Res: `{ success, results, count, method }` or `{ error }`. |
| `optimize-geofences` | Requires user JWT. | User JWT; current user's transaction locations only. | None. | Req: `{ numClusters = 5, minTransactions = 3 }`. Res: `{ success, suggestions }` or insufficient-data/error. |
| `generate-timeline-image` | No auth. | Admin/internal or authenticated and rate-limited. | Lovable AI image model. | Req: none. Res: `{ success, imageData, message }` or rate/payment/error. |
| `ab-testing-manager` | Requires user JWT. | User JWT for assignment/metric actions; admin only for experiment management if added later. | None. | Req: `{ action, experiment_id, metric_name?, metric_value? }`. Res: variant assignment, metric success, or `{ error }`. |
| `feature-flag-evaluator` | Requires user JWT. | User JWT; flag evaluation scoped to user/environment. | None. | Req: `{ flagName, environment? }`. Res: `{ enabled, flagName, userId, environment, evaluatedAt }` or `{ error }`. |

## Notifications, Email, Push

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `send-email-notification` | Uses anon client with forwarded auth but does not call `auth.getUser`; accepts `userId`. | Internal service only, or user JWT/admin check that target `userId` is allowed. | Resend email. | Req: `{ userId, template, data, category?, scheduledFor? }`. Res: sent/scheduled/skipped message or `{ error }`. |
| `send-push-notification` | No auth; service role by `userId`. | Internal service only, or admin/service secret. | Google OAuth token, FCM HTTP v1; APNS helper code present. | Req: `{ userId, title, body, data?, category? }`. Res: push result, skipped reason, or device/error status. |
| `send-security-alert` | No auth; service role by email. | Internal auth/security service only. | Resend email. | Req: `{ email, alertType, details }`. Res: `{ success, request_id }` or user/email error. |
| `generate-email-digest` | No auth; service role by `userId`. | Internal scheduled/email service only. | Sends via `send-email-notification` path/templates. | Req: `{ userId, period, isTest }`. Res: digest generated summary or `{ error }`. |
| `process-scheduled-emails` | No auth. | Cron/internal only. | Resend/email sending path. | Req: none. Res: processed/failed counts or `{ error }`. |
| `alert-manager` | No auth; service role. | Internal observability/incident service only. | Calls notification helpers through Supabase function invoke. | Req: alert request body. Res: deduped/no-rule/processed delivery results or `{ error }`. |

## Observability, Incidents, Events, Jobs

| Function | Current auth | Should be | External calls | Contract |
|---|---|---|---|---|
| `log-collector` | No auth. | Public ingestion may be acceptable only with rate limiting and schema validation; otherwise require app token. | None. | Req: log entry `{ level, message, component, ... }`. Res: `{ success, log_id }` or `{ error }`. |
| `trace-collector` | No auth. | Public ingestion may be acceptable only with rate limiting; otherwise app token. | None. | Req: `{ type, data }` where type is `trace`, `span`, `error`, or `batch`. Res: inserted IDs/counts or `{ error }`. |
| `metrics-collector` | Uses anon client with forwarded auth; supports POST/query actions. | User/admin JWT depending on metric action; writes should authenticate source. | None. | Query: `action`, `timeRange`, `metric`; body metric data for POST. Res: stored metrics or queried metrics. |
| `extension-telemetry` | Requires user JWT. | User JWT; events attributed to current user and extension origin should be constrained. | None. | Req: `{ events }`. Res: `{ success, count }` or auth/validation/insert error. |
| `metrics-aggregator` | No auth. | Cron/internal only. | None. | Req: none. Res: aggregation success timestamp or `{ error }`. |
| `redis-metrics` | Requires user JWT. | Admin only because it exposes cache metrics/config. | Azure Cache for Redis. | Req: none. Res: Redis INFO/config metrics or `{ error }`. |
| `performance-analyzer` | Requires user JWT and admin role. | Admin only. | None. | Req: `{ timeWindow = "24h" }`. Res: performance analysis or auth/error. |
| `backup-verification` | No auth. | Admin/internal scheduled job only. | None. | Req: none. Res: backup verification status or `{ error }`. |
| `cache-eviction` | No auth. | Internal scheduled job only. | None. | Req: none. Res: eviction summary or `{ error }`. |
| `cache-prewarmer` | No auth. | Internal scheduled job only. | Internal authenticated `merchant-discovery` calls. | Req: none. Res: prewarmed geofence count or `{ error }`. |
| `event-consumer` | No auth. | Internal worker only. | None. | Req: none. Res: processed event count/details or `{ error }`. |
| `event-batch-processor` | No auth. | Internal worker only. | None. | Req: none. Res: batch metrics/results or `{ error }`. |
| `publish-event` | Requires user JWT. | User/service JWT; event topic authorization by producer. | None. | Req: event body with `event_type`, `event_payload`, `topic`, optional schedule. Res: event id/type/topic or `{ error }`. |
| `retry-processor` | No auth. | Internal worker only. | Notification helper invokes. | Req: none. Res: processed/succeeded/failed counts or `{ error }`. |
| `dlq-review` | Requires user JWT and admin role. | Admin only. | None. | Query: `action`, `limit`, `queue_type`, `resolved`; POST body for retry/resolve. Res: count/items/action success or error. |
| `incident-detector` | No auth. | Internal scheduled detector only. | None. | Req: none. Res: incidents created or `{ error }`. |
| `incident-manager` | Requires user JWT and admin role. | Admin only. | None. | Req: body with action fields such as incident id/title/severity. Res: incident list/detail/create/update results or auth/error. |
| `slo-manager` | Requires user JWT and admin role. | Admin only. | None. | Req: body action for SLIs/SLOs/compliance/history. Res: `{ success, slis/compliance/history/slos/slo }` or error. |
| `security-audit` | Requires user JWT and admin role. | Admin only. | None. | Req: `{ action }`. Res: security audit findings/result or `{ error }`. |
| `csp-reporter` | No auth; rate-limited. | Public browser report endpoint is acceptable with rate limiting. | None. | Req: CSP report JSON. Res: `204`, rate-limit, validation, or internal error. |
| `resend-webhook-handler` | No actual signature verification in code path. | Resend/Svix signature verification required. | None. | Req: Resend webhook payload. Res: logged/update status or `{ error, request_id }`. |
| `workflow-executor` | No auth; service role can run arbitrary enabled workflows. | Internal/admin only; callable step functions should be allowlisted. | Internal Supabase function invokes. | Req: `{ workflowId?, workflowName?, executionId?, context?, triggerType?, triggerData? }`. Res: execution status/context or `{ error }`. |
