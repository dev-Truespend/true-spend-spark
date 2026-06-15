# Arrival Detection Provider Workflow

On-device "user reached a merchant" detection that feeds the geo-arrival push pipeline. This workflow owns the **device-side detection + ingress** only; merchant resolution, best-card recommendation, notification insert, and push fan-out are owned by [10-geo-recommendations.md](10-geo-recommendations.md) and reused unchanged by both providers.

Two interchangeable code sets implement the same `ArrivalDetectionClient` contract:

| Provider | On-device detection | Place matching | Server ingress |
|---|---|---|---|
| `foursquare` | Foursquare **Movement SDK** (Pilgrim) | Foursquare POI DB | `POST /api/v1/webhooks/foursquare` (existing, signature-verified) |
| `custom` | OS-native arrival APIs (own-built) | Google Places Nearby Search | `POST /api/v1/geo/arrival` (new, JWT-authed) |

Both support **iOS and Android**. The active provider is a **config switch** — when Foursquare is configured, use it; otherwise use the custom built logic. Android hardening (OEM battery-killer workarounds, Doze edge cases) is explicitly out of scope for this cut.

**Reliability is best-effort, not guaranteed.** Background arrival detection on the `custom` path is delayed and coarse, not real-time: iOS `CLVisit` relaunches the app but lags the physical arrival and may not fire at every stop; Android background delivery depends on a visible foreground-service notification and is still subject to Doze/OEM throttling (out of scope this cut). The `foursquare` path is more accurate because place detection is the SDK's core product. Treat geo-arrival as an opportunistic nudge, not a reliable real-time trigger.

## Workflow Overview (plain language)

Two separate machines run, and they barely touch:

- **Machine A — the store map (server).** `FoursquarePlacesCatalogSyncJob` runs ~weekly on the server and keeps `foursquare.places` / `foursquare.chains` filled with known store locations. Pure backend prep — no phone involved. It just means the server already knows "where every store is" when a phone later asks. Missing stores are filled on-demand by the live-lookup path ([job-architecture.md § FoursquarePlacesCatalogSyncJob](../low-level-design/Service/job-architecture.md#foursquareplacescatalogsyncjob)).
- **Machine B — the phone noticing you arrived.** Battery rule: **the phone does nothing while you move and only wakes when you stop.** Moving (walk/drive) → no GPS, no lookups. Stop → the OS fires an "arrival" signal, the app wakes (even backgrounded), asks the server "what store is this + which card?", and that single moment is the only work done.

What happens in each situation:

| Situation | What happens |
|---|---|
| Walking | "Moving" → nothing fires. Battery calm. |
| Driving | "Moving" → nothing fires. No nagging at speed. |
| You stop | The trigger — app wakes, resolves the store, computes best card. |
| You open the app | Foreground path shows the best-card screen live, no waiting on a background trigger ([03-recommendations.md](03-recommendations.md)). |
| At home | You stop, but home isn't a rewardable store → no match → **no notification**; phone settles back to sleep. |
| Drive → stop → app **not** opened | Headline case: arrival fires in the background → server resolves the store → **push on the lock screen**. App never opened. |
| Drive → stop → app opened | May get the background push *and* the live screen; deduped so you're not nudged twice. |
| App killed | iOS: the arrival signal can relaunch the app, so the push usually still works. Android: a foreground service keeps it alive unless force-stopped. **Best-effort** — the weakest case. |

One-sentence version: the **server** keeps a map of all the stores; the **phone** stays asleep until you *stop* somewhere, then asks "what store is this and which card?" — and answers with a push, even if the app was never opened.

## Progress

| User story | Status | Notes |
|---|---|---|
| Geo-arrival push works on iOS and Android without Foursquare (own-built detection) | Done | New JWT-authed `POST /api/v1/geo/arrival` → neutral `GeoArrivalInput` → shared `GeoArrivalBusiness`; server-side DB-first place matching (`foursquare.places` bounding-box + Haversine ranking, provider-on-miss persist), confidence tiers (high→push, medium→foreground list, low→log). **Geo upgrade item 1 (2026-06-15):** dense-lot suppression + runner-up margin now measure over *plausible* candidates within `GeoConstants.DenseLotProximityMeters` (50m), not the 100-150m search radius — a standalone store with POIs scattered farther out (Wawa) is no longer wrongly capped at Low/Medium. **Geo upgrade item 0 (2026-06-15):** every resolved arrival now writes a `finance.geo_arrival_decisions` row (tier, candidate/plausible counts, outcome, `notification_produced`) via `IGeoWebhookInsertService.InsertArrivalDecisionAsync`, inside the handler transaction, so threshold tuning for later items is data-driven. Mobile `custom` client fires one arrival per stop with a stable per-stop key on two paths: a foreground `watchPositionAsync` and a headless `expo-task-manager` background task (`Location.startLocationUpdatesAsync` + Android foreground service) registered at app entry — iOS relaunch + Android foreground-service keep it alive. Both paths share the stop math and emit the same eventId, so they dedup server-side. Requires an EAS dev client (background location does not run in Expo Go) |
| Geo-arrival push works via Foursquare Movement SDK when configured | Blocked (SDK access) | Mobile plug-point (`registerArrivalDetectionClient` + `foursquareMovementClient`) + server webhook handler built; only the paid Movement SDK install + Foursquare account remain. Selector fails over to `custom` (logged) until the SDK is wired |
| Provider is selectable by config with no downstream change | Done | `EXPO_PUBLIC_GEO_PROVIDER` (`foursquare`\|`custom`\|`auto`) → `selectArrivalProvider` registers one client behind `ArrivalDetectionClient`; server `Geo:Provider`/`Foursquare:PlacesApiKey` gates the real-vs-placeholder provider. No change to gating, recommendation builder, notification pipeline, or UI |

## Scope

Background flow that fires a best-card push when the user arrives at a known merchant, with the detection layer pluggable between Foursquare and an own-built implementation. No new screens. The push lands on the lock screen and in the inbox (7.1/7.2) and honors notification settings (7.3) — all shared with [10-geo-recommendations.md](10-geo-recommendations.md). Once an arrival is detected and a push is produced, display state does not affect delivery (it renders on the lock screen). Detecting the arrival in the first place is best-effort while backgrounded/killed — see the reliability caveat above.

## Provider Selection

The selector runs once at app bootstrap and registers exactly one client. Server enables the matching ingress endpoint; both endpoints share one business handler.

| Surface | Config key | Values | Behavior |
|---|---|---|---|
| Mobile | `EXPO_PUBLIC_GEO_PROVIDER` | `foursquare` \| `custom` \| `auto` | `auto`: use `foursquare` when the Movement SDK key is present, else `custom` |
| Mobile | `EXPO_PUBLIC_FOURSQUARE_MOVEMENT_KEY` | string | Presence is the `auto` signal for the Foursquare path (distinct from the Places-search `EXPO_PUBLIC_FOURSQUARE_API_KEY`) |
| Server | `Geo:Provider` | `foursquare` \| `custom` | Gates which ingress endpoint accepts events; both map to `HandleEventAsync` |

Switching providers is config-only: no change to `useFoursquareTracking` gating, the recommendation builder, the notification pipeline, or any UI.

**Fail closed + observable.** Mobile `auto` and server `Geo:Provider` can drift (e.g. a build ships `custom` but the server only enabled the Foursquare endpoint). To avoid silent loss:

- Both ingress endpoints stay enabled during any rollout; `Geo:Provider` controls only which the app is told to use, not which the server will accept.
- The mobile client emits a health/log signal when it starts a provider whose endpoint rejects it (401/404/disabled), so drift surfaces in telemetry instead of dropping arrivals silently.
- If no provider can be selected (neither SDK present nor custom configured), tracking does not start and the state is logged — never a half-initialized client.

## Screens Covered

| Screen | Name | Notes |
|---|---|---|
| 2.4 | Location permission | Onboarding requests `authorized_always`; same requirement for both providers |
| 7.1 / 7.2 | Inbox + notification detail | Push lands here as `best_card_alert` |
| 7.3 | Notification settings | `best_card_alert` toggle gates these pushes |
| (lock screen) | OS-rendered push | Tap routes to notification detail |

## User Stories Covered

| Coverage | User Story | Screen Ref | Notes |
|---|---|---|---|
| Full | User can receive a push notification with the best card when they arrive at a known merchant | lock screen, 7.1, 7.2 | Either provider triggers the same server pipeline |
| Partial | User can grant the OS background location permission required for arrival detection | 2.4 | Owned by onboarding; both providers need `authorized_always` |
| Out of scope | Tap-through, opt-out, recommendation content | 7.2, 7.3 | Owned by [10-geo-recommendations.md](10-geo-recommendations.md) / [07-notifications.md](07-notifications.md) |

## Preconditions

- `authorized_always` background location granted ([location.ts](../../ui-mobile/src/shared/native/location.ts)).
- `geofencing_enabled` entitlement granted ([13-feature-gating.md](13-feature-gating.md)); gated in [useFoursquareTracking.ts](../../ui-mobile/src/shared/native/useFoursquareTracking.ts).
- `best_card_alert` type + master notification preference enabled; outside quiet hours.
- User has at least one active `finance.user_cards` row.
- Provider-specific: `foursquare` → Movement SDK installed + webhook registered; `custom` → Google Places key configured.

## Primary API Sequence

```text
App bootstrap (after auth)
  selectArrivalProvider(config) -> registerArrivalDetectionClient(impl)
  client.setUserId(auth.users.id); client.start()   // gated by geofencing_enabled + authorized_always

User physically arrives at a merchant
  foursquare: Movement SDK detects entry -> Foursquare -> POST /api/v1/webhooks/foursquare
  custom:     OS arrival event wakes background task
              -> Google Places Nearby Search (current coords) -> top merchant
              -> POST /api/v1/geo/arrival  (device JWT)

Server (shared, single transaction)
  Ingress maps payload -> FoursquareWebhookInput-equivalent
  HandleEventAsync: dedup -> resolve merchant -> gate -> best card
                    -> insert messaging.notifications (best_card_alert)
  Post-commit: DispatchPushAsync + InvalidateAsync  (inline, MVP)
```

## Step Matrix

| Step | API | Contract | Execution | Events/Consumers | Tables | Cache |
|---|---|---|---|---|---|---|
| Select + register provider | Client-side | `selectArrivalProvider` -> `ArrivalDetectionClient` | Client-side | None | None | None |
| Start tracking | Client-side | `setUserId` + `start` | Client-side | None | None | None |
| Detect arrival (`foursquare`) | Foursquare Movement SDK | Provider-internal | Client-side | None | None (provider state) | None |
| Detect arrival (`custom`) | OS arrival API (iOS `CLVisit` / Android Fused + Activity Recognition) | native event | Client-side (background task) | None | None | None |
| Match merchant (`custom`) | DB-first `foursquare.places` (spatial/trigram); provider lookup only on miss | coords -> **confidence-gated** merchant; read-through upsert on miss | Server-side | None | Read `foursquare.places`, `foursquare.chains`, `foursquare.category_bridge`; write `foursquare.places` (`on_demand_lookup`) on miss | None (tables are source of truth); provider called at most once per new place |
| Ingest arrival (`foursquare`) | `POST /api/v1/webhooks/foursquare` | raw event -> map to neutral `GeoArrivalInput` -> `WebhookAckResponse` | Webhook Driven | Post-commit `DispatchPushAsync`, `InvalidateAsync` | See [10-geo-recommendations.md](10-geo-recommendations.md#step-matrix) | None at handler |
| Ingest arrival (`custom`) | `POST /api/v1/geo/arrival` | `GeoArrivalRequest` -> neutral `GeoArrivalInput` -> `WebhookAckResponse`; **`userId` from JWT claims, body identity ignored** | Sync API (device-driven) | Post-commit `DispatchPushAsync`, `InvalidateAsync` | Same as Foursquare path + provider idempotency | None at handler |
| Deliver push | inline `DispatchPushAsync` | APNs / FCM | Async-ish (post-commit) | None | Read `messaging.devices`; write `messaging.notification_deliveries` | None |

## Contracts Used

| Contract | Fields | Notes |
|---|---|---|
| `ArrivalDetectionClient` | `setUserId`, `start`, `stop` | Shared client interface; existing `registerFoursquareTrackingClient` plug-point generalized to `registerArrivalDetectionClient` |
| `GeoArrivalRequest` (new, transport) | `eventId`, `eventType`, `placeName`, `providerPlaceId`, `lat`, `lng`, `accuracyMeters`, `occurredAt`, `matchConfidence`, `dwellSeconds`, `movementState` | Custom-path request body. `eventType` is `arrival` or `exit` (`exit` closes the covering area session, item 8). `dwellSeconds`/`movementState` (`on_foot` \| `in_vehicle` \| `still` \| `unknown`) feed candidate ranking. **Carries no user identity** — `userId` is derived server-side from JWT claims (see below) |
| `MonitoredRegionsResponse` (new, item 8) | `regions[]` of `{ identifier, lat, lng, radiusMeters }` | `GET /api/v1/geo/monitored-regions` (JWT-authed) — the device's native-geofence set, the user's most-frequented clusters capped under the iOS 20-region limit |
| `GeoArrivalInput` (new, internal) | `provider`, `eventId`, `eventKind`, `userId`, `placeName`, `providerPlaceId`, `geofenceTag`, `lat`, `lng`, `accuracyMeters`, `occurredAt`, `dwellSeconds`, `movementState` | Provider-neutral model the shared handler consumes. Foursquare and custom each have a thin mapper into this; replaces today's Foursquare-shaped `FoursquareWebhookInput` as the handler input |
| `WebhookAckResponse` | `received`, `deduplicated` | Shared ack for both ingress endpoints |

Recommendation/notification view models are unchanged and owned by [10-geo-recommendations.md](10-geo-recommendations.md). The notification is a standard `best_card_alert` row regardless of provider.

**Identity rule.** The Foursquare path trusts `ExternalUserId` from the signed webhook body (the signature is the trust anchor). The `custom` path is JWT-authed, so the handler derives `userId` from the token's claims and **ignores any user identifier in the request body** — a device must not be able to assert arrivals for another user. The neutral `GeoArrivalInput.userId` is populated from claims on the custom path and from the validated body on the Foursquare path.

**Neutral internal model.** Long term the shared handler should consume `GeoArrivalInput`, not `FoursquareWebhookInput`. Today the validator messages ([GeoValidator.cs](../../service/truespend.domain/Validators/GeoValidator.cs)), event-id/event-type fields ([FoursquareWebhookInput.cs](../../service/truespend.domain/Models/Geo/FoursquareWebhookInput.cs)), and the hardcoded `provider: "foursquare"` on merchant save ([FoursquareWebhookBusiness.cs:267](../../service/truespend.domain/Business/Geo/FoursquareWebhookBusiness.cs#L267)) are Foursquare-specific. The merchant-save `provider` must come from the event's provider, not a constant, so custom-detected merchants are not mislabeled as Foursquare.

## Provider Implementations

Two separate code sets, one per provider, both implementing `ArrivalDetectionClient`. The selector wires exactly one.

### `foursquare` code set

| Layer | iOS | Android |
|---|---|---|
| Mobile module | `arrival/foursquareMovementClient.ts` wrapping `@foursquare/movement-sdk-react-native` (Pilgrim via Podfile) | same wrapper (Movement SDK via Gradle) |
| Detection | Movement SDK background place detection | Movement SDK background place detection |
| Ingress | Foursquare → `POST /api/v1/webhooks/foursquare` | same |

Server side already built: [FoursquareWebhooksController.cs](../../service/truespend.api/Controllers/FoursquareWebhooksController.cs), [FoursquareWebhookBusiness.cs](../../service/truespend.domain/Business/Geo/FoursquareWebhookBusiness.cs), signature filter. Remaining: Movement SDK install + Foursquare account (paid; EAS dev client, not Expo Go).

### `custom` code set

| Layer | iOS | Android |
|---|---|---|
| Mobile module | `arrival/customArrivalClient.ts` + native config plugin wrapping **`CLVisit` / significant-location-change** | `arrival/customArrivalClient.ts` using `expo-location` `startLocationUpdatesAsync` with `foregroundService` + Activity Recognition `STILL` transition |
| Detection | OS Visit/arrival event relaunches killed app (free, battery-cheap) | Foreground service keeps process alive across backgrounded/closed states |
| Place match | Google Places Nearby Search on the arrival coords; top result is the merchant | same |
| Ingress | `POST /api/v1/geo/arrival` (device JWT) | same |

Server side new: `GeoArrivalController` (JWT-authed) → derives `userId` from claims → maps `GeoArrivalRequest` into the neutral `GeoArrivalInput` → calls the same `HandleEventAsync`. No duplicate recommendation/notification logic, and no dependency on the Foursquare-shaped input model.

**Approximate arrival → candidate ranking (custom).** Treat the device coordinate as an approximate **arrival area, not the merchant's location** — the user may have parked 40–150 m away in a lot shared by several stores, so our tables hold the store's exact coordinate but the phone only knows "stopped near here." Never do "nearest POI wins." Instead: **search a radius → collect candidates → rank → act on the confidence tier.**

Search radius scales with the reported fix accuracy:

| Reported accuracy | Search radius |
|---|---|
| ≤ 30 m | 75–100 m |
| 30–75 m | 150 m |
| > 75 m | skip, or low-confidence path only |

Rank the candidates in `foursquare.places` (filtered to active rewardable categories) by combining these signals — not distance alone:

| Signal | Source | Sense |
|---|---|---|
| Distance from the stop point | server (PostGIS) | closer is better |
| Fix accuracy radius | device (`accuracyMeters`) | wider = less certain |
| Category relevance | server (bridge) | rewardable beats generic |
| Exact chain/name match | server | beats a fuzzy location guess |
| User visit / brand history (been to this Chipotle before?) | server (`finance.merchant_visits`) | repeat raises confidence |
| Recent transaction history (when available) | server | corroborates |
| Dwell time at the stop | device (`dwellSeconds`) | longer = real stop, not drive-by |
| Movement state (walking toward storefront vs driving by) | device (`movementState`) | on-foot raises confidence |
| Place density / shared parking lot | server (count of **plausible** candidates within the proximity radius, not the wider search radius) | many close merchants = ambiguous; far scattered POIs don't count |
| Chain popularity | server | tie-breaker |

Act on the resulting confidence, never on a single nearest hit:

| Confidence | Example | Action |
|---|---|---|
| **High** (`single_merchant`) | Standalone store, top candidate clearly closest (Chipotle 35 m, next 180 m) | Send the single lock-screen best-card push |
| **Medium** (`area_cluster`) | Strip mall, 2-5 plausible close places (Chipotle 35 m, Starbucks 45 m) | Send **one grouped push** listing the best card for the top stores (deduped by card) + open an `area_cluster` session |
| **Medium** (`near_but_not_at`) | Closest plausible place is beyond the 40 m AT-gate | No push — foreground "nearby best cards" list only ([03-recommendations.md](03-recommendations.md)) |
| **Low** (`mall_area`) | Mall / dense lot (many plausible merchants packed in the proximity radius) | Send **one grouped/area push** of the top nearby best cards + open a `mall_area` session |
| **Low** (`unknown`) | Accuracy > 75 m, or a lone coarse hit | Log arrival only; wait for a stronger signal |

A wrong *single* lock-screen push is worse than no push, so we never push a single guessed merchant when the area is ambiguous. Ambiguity instead resolves to a **hedged grouped push** (several stores, each with its best card — the user picks) plus an area session that suppresses per-store re-pushes inside the same complex; `near_but_not_at` and `unknown` still resolve to the foreground list or a log-only. One grouped push counts as one against the daily geo cap. `GeoArrivalRequest.matchConfidence` carries the device's own score; the server re-scores with the signals above and makes the final call.

**Place matching — DB-first, provider-on-miss (custom).** The tables are the source of truth; there is no cache layer. Calling a live places API per arrival means metered cost and, on-device, an effectively public key. Resolve the merchant server-side in this order (the device sends only `{lat, lng, accuracy}`):

1. **Local tables first.** Query `foursquare.places` ([job-architecture.md](../low-level-design/Service/job-architecture.md#foursquareplacescatalogsyncjob)) for the arrival coordinates — `ST_DWithin` + `<->` nearest match (trigram/name for text search), filtered to active rewardable categories, under the confidence gates above. No provider call, no key on-device.
2. **On miss, call the provider.** When there is no confident local match, the server calls Google Places (or Foursquare / Overture) with the coordinates. The key stays server-side.
3. **Persist, then return.** Write the provider's result into `foursquare.places` with `source = on_demand_lookup` when its category is on the allowlist, then use it for this arrival. **Subsequent arrivals/searches at that place read from the tables — the provider is called at most once per new place.**

Net effect: `FoursquarePlacesCatalogSyncJob` pre-loads the common chains; live lookups fill the long tail and persist themselves into the source-of-truth tables. If you ever match live without the local store, lock the on-device key down hard (bundle/package-id restriction, Places-only, tight quotas) or keep the call server-side.

Battery rule (custom): never poll continuously. Power GPS + call Google Places **only on a stop/arrival event** — at most one lookup per stop. Out of scope this cut: Android OEM battery-manager workarounds, Doze tuning, drive-by false-positive suppression beyond the gates above.

## Tables Involved

- Reuses all tables in [10-geo-recommendations.md § Tables Involved](10-geo-recommendations.md#tables-involved).
- Decision telemetry: `finance.geo_arrival_decisions` — one row per resolved arrival (confidence tier, `decision_mode`, candidate/plausible counts, dwell, movement, chosen merchant, outcome, `notification_produced`). Written inside the same handler transaction as the webhook event; powers data-driven tuning of the proximity/margin/dwell/density thresholds.

**ArrivalDecision model (item 2).** `ArrivalDecisionModeEnum` captures the *situation* (what kind of place the user is at), orthogonal to `ArrivalConfidenceTierEnum` (the *action* — whether/how confidently to push). Mode picks the notification shape; tier still gates whether it fires. Current behavior maps 1:1 (no UX change yet):

| Mode | Maps from today | Meaning |
|---|---|---|
| `single_merchant` | High | one clear close store → lock-screen best-card push |
| `area_cluster` | Medium (closest plausible within the AT-gate) | 2-5 plausible close places → foreground list now, grouped push later (item 3) |
| `near_but_not_at` | Medium (closest plausible beyond the AT-gate) | closest place isn't somewhere the user is standing |
| `mall_area` | Low + dense proximity cluster | many plausible places packed in → mall/plaza (item 4) |
| `unknown` | Low (coarse fix) / None | can't tell; log only |
| `personal_place` | (reserved) | home/work suppression (item 6) |
- POI store (place matching): `foursquare.places`, `foursquare.chains`, `foursquare.category_bridge` — populated by `FoursquarePlacesCatalogSyncJob` (batch) and by read-through upsert on a live-lookup miss (`source = on_demand_lookup`). See [job-architecture.md § FoursquarePlacesCatalogSyncJob](../low-level-design/Service/job-architecture.md#foursquareplacescatalogsyncjob).
- Provider idempotency: `foursquare` uses `finance.foursquare_webhook_events`; the `custom` path needs its own dedup (see Design Gaps).
- Dwell tuning (item 7): the mobile arrival dwell floor (`ARRIVAL_DWELL_MS`) dropped 150s → **90s** now that the suppression gates catch the extra noise — faster gas/drive-thru nudges; item 0 telemetry guides any further drop to 60s. The floor only governs *when* the client reports; the server no longer derives a confidence tier from dwell length (the old dwell-promotion was removed so an ambiguous 2+ cluster stays Medium → grouped push instead of being promoted to a single guess).
- Visit lifecycle + geofences (item 8): the custom client now emits an **`exit`** event when leaving a fired stop (`GeoConstants.CustomEventExit`); the handler closes any covering area session on exit (`IGeoWebhookInsertService.ExpireCoveringAreaSessionsAsync`) instead of waiting out the TTL. Native OS geofences around the user's frequent places (`geofenceArrivalTask` + `GET /api/v1/geo/monitored-regions`, capped under the iOS 20-region limit) wake the app on enter/exit cheaply; continuous stop-detection stays the always-on fallback. The geofence task reports `accuracyMeters = null` (the region center is a known place); reporting the region *radius* there would trip the coarse-fix gate (>75m → Low → no push) and silently kill every geofence arrival. Native geofencing needs an EAS dev-client build to validate on-device.
- Personal places (item 6): `finance.personal_places` — recurring dwell zones (home/work) auto-detected offline by `PersonalPlaceDetectionJob` (clusters the last 30d of `finance.location_events` on a ~111m grid). A cell is a zone only when it (a) recurs across **≥ `PersonalPlaceMinDistinctDays` (8) distinct days** — not a one-week burst — and (b) is **not** sitting within `PersonalPlaceKnownMerchantRadiusMeters` (60m) of an active rewardable place (a favorite store/gym/coffee shop is somewhere we *want* to push, not a residence). Capped per user, most-recurring first. The arrival handler suppresses **all** pushes (single/cluster/mall) when the point falls inside a zone (`decision_outcome = personal_place_suppressed`); no visit recorded — the user is at home/work, not shopping. Inferred coordinates are privacy-sensitive — see [10-geo-recommendations.md § Design Gaps](10-geo-recommendations.md#design-gaps). The job is **enabled in production** (`0 2 * * *`, `appsettings.Production.json`); watch item-0 telemetry (`personal_place_suppressed` rate) to confirm the guards aren't over-suppressing. Dev stays off (manual-trigger only).
- Area sessions (item 5): `finance.geo_area_sessions` — an active `(center, radius, mode, TTL)` window. An `area_cluster` / `mall_area` arrival opens one **only once a grouped push is actually produced** (after the gates pass and at least one eligible card resolves) — opening it earlier would suppress the rest of the visit's in-area arrivals even though nothing was sent. Idempotent (skipped if an active session already covers the point). A subsequent High/single-merchant arrival inside an active session is suppressed (`decision_outcome = area_session_suppressed`) with the visit still recorded. Closed on `exit` (item 8) or TTL expiry.
- **Custom dedup key must be a stable per-stop ID, not a fresh GUID per request.** Background retries re-send the same arrival, so a per-call random ID would create duplicate notifications. The device must derive a deterministic key per physical stop and reuse it on retry — e.g. `custom:{userId}:{arrivalTimeBucket}:{roundedLatLng}:{providerPlaceId}`. The server dedups on `(provider, eventId)`.

## Cache Strategy

**No caching layer in MVP — the database tables are the source of truth, read and written directly.**

- Place matching reads `foursquare.places` directly (PostGIS nearby + trigram). On a miss the provider result is **persisted** to the table, not cached — the next read is authoritative from the DB, not a copy.
- No in-memory or server-side cache for places, reward profile, or merchant resolution in this cut; each request hits the tables.
- Inbox delivery and any inbox invalidation are owned by the shared notification pipeline ([notification-production.md](notification-production.md)), not by this workflow.

## Sync vs Async Decisions

- Detection and ingress are device/provider-driven; the server handler writes synchronously so the caller gets a fast ack.
- Push delivery and inbox cache invalidation run inline post-commit (MVP), matching [10-geo-recommendations.md](10-geo-recommendations.md).
- Google Places lookup is on-device and synchronous within the background arrival task.

## Invalidation Triggers

| Trigger | Invalidate |
|---|---|
| Provider config change (`EXPO_PUBLIC_GEO_PROVIDER` / `Geo:Provider`) | Re-run selector on next bootstrap; register the other client |
| Live-lookup miss resolved | Upsert into `foursquare.places` (`on_demand_lookup`); place now served from tables |
| `FoursquarePlacesCatalogSyncJob` run | Refreshes/deactivates `foursquare.places` rows; on-demand rows reconciled against the provider |
| Arrival ingested (either endpoint) | Per-user inbox cache + unread count |
| `geofencing_enabled` off / `best_card_alert` off | Tracking stops (client) or handler gate skips notification |
| `finance.user_card.created/updated/deleted` | User reward profile re-evaluated on next arrival |

## Loading And Error States

- Provider not configured (neither path available): no tracking starts; geo-arrival disabled and the state is logged (not silent).
- Provider drift (app uses a provider whose server endpoint is disabled/rejects it): client logs a health signal; arrival is dropped, not retried into a black hole. Keep both endpoints enabled during rollout to avoid this.
- `custom` local-table miss: fall through to the provider lookup, upsert the result (`on_demand_lookup`) if its category is allowed, then continue. Next arrival at that place serves from the tables.
- `custom` `area_cluster` / `mall_area` (ambiguous but actionable): **one grouped/area push** (top nearby best cards, deduped) + opens an area session so per-store re-pushes inside are suppressed. `near_but_not_at`: foreground list only, no push.
- Inside a personal place (recurring home/work dwell zone): all pushes suppressed (`personal_place_suppressed`), no visit recorded — the user lives/works here, not shopping.
- `custom` `exit` event (left a fired stop): closes any covering area session so re-entry later counts as a new visit; no push. Emitted by the continuous task and by native-geofence region exit (item 8).
- `custom` low-confidence match (dense lot, accuracy > 75 m, or fails an accuracy/distance/category/margin gate): skip notification, log only — prefer a missed nudge over a wrong one.
- `custom` provider fallback also fails (no local match and no provider result): log location event only, skip notification, ack `200` (mirrors `merchant_not_resolved`).
- `custom` body asserts a different user than the JWT: ignore body identity, use the token's user; never fan out to the body-claimed user.
- Duplicate arrival (`(provider, eventId)` already seen): ack `WebhookAckResponse { received:true, deduplicated:true }`.
- Background permission downgraded to `authorized_when_in_use`: arrival detection disabled; foreground recommendations unaffected.
- Gate fails (master/type off, quiet hours, daily geo cap, geofencing disabled): skip notification, ack `200` — all owned by the shared handler.
- Push delivery failure: handled by the existing dispatch path.

## Design Gaps

| Status | Type | Source Doc | Current Design | Proposed Adjustment | Reason |
|---|---|---|---|---|---|
| Pending | External Provider Wiring | Workflow | Movement SDK not installed (paid); `foursquareMovementClient` returns null and the selector fails over to `custom` | Install `@foursquare/movement-sdk-react-native` + Foursquare account, wire the adapter, build the EAS dev client | The Foursquare path can't be exercised end-to-end without the paid SDK |
| Pending | External Provider Wiring | Service | Catalog sync `bulk` mode (Foursquare Open Source Places Parquet) is not wired — `FoursquarePlacesCatalogSyncBusiness` runs `api` mode only and logs when `bulk` is requested | Implement the Parquet object-storage import for `bulk` mode before relying on it for full-region preload | Long-tail coverage at scale needs the dataset import; `api` tiling is enough for launch regions |
