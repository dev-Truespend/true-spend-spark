# TrueSpend — Edge Case Registry

First-pass catalog of edge cases (from the location-intelligence / edge-case design docs) mapped to current app behavior. Grouped by functionality. `Handled?` = **Yes** / **Partial** / **No** (**N/A** = not applicable).

## A. Location & venue

| Edge case | Example | Current behavior | Suggested approach | Handled? |
|---|---|---|---|---|
| Big-box / multi-category store | Walmart spans grocery + general merchandise | Multi-category detected; user picker + "coding can vary" note | Keep; could default to user's most-used category | Yes |
| Card network acceptance | Costco takes Visa only; some merchants reject Amex | Ranks by reward only; no network filter | Filter candidate cards by merchant-accepted networks before ranking | No |
| Gas pump vs in-store | Gas card at the pump, not for snacks inside | Gas stations exempt from drive-by demotion; no pump/in-store split | Add "store purchases may code differently" hint at fuel venues | Partial |
| Restaurant inside a store | Starbucks inside Target codes as Target | Flat name match; no parent-store awareness | Detect in-store sub-venues → use parent category + disclaimer | No |
| Closed / stale venue | Cached "Olive Garden" is now a nail salon | Places have `is_active` + `last_seen`; no expiry/re-verify | Staleness TTL + re-verify on next visit (decay confidence) | Partial |
| Indoor / multi-floor GPS | Food court reads as ground-floor jewelry store | Dwell + accuracy + proximity gates in scoring | Keep; in malls prefer category-level over store-level | Yes |
| Adjacent venues fire together | Chipotle + Starbucks 20m apart both trigger | Dedup per stop `(provider,eventId)`; no cross-venue debounce | Short debounce window; group or pick highest-confidence | Partial |
| Foreign transaction fees | 3x card with 3% FX fee nets ~0 abroad | No FTF / home-country awareness in ranking | Add FTF flag per card; subtract abroad; prefer no-FTF | No |
| Predicted vs actual category | We guess "grocery", processor codes "discount" | No reconciliation against real transactions | Compare predicted vs Plaid category; adjust confidence | No |

## B. Card data (what cards does the user have?)

| Edge case | Example | Current behavior | Suggested approach | Handled? |
|---|---|---|---|---|
| Plaid returns generic card name | "CHASE CREDIT CARD" not "Sapphire Preferred" | Fuzzy auto-match; unmatched → no product; no user confirm | Post-link "which card is this?" confirmation step | Partial |
| Manually-added (unlinked) cards | User adds an Amex they didn't link via Plaid | Manual cards fully participate in recommendations | Keep | Yes |
| Reward-rate data source | "Amex Gold = 4x dining" has to come from somewhere | RewardsCC catalog sync; `start/end_date` validity enforced | Keep; periodic review | Yes |
| Stale Plaid connection (re-auth) | Bank forces re-login; wallet data goes stale | Status tracked + UI badge; stale cards still in recs | Pause/flag recs for cards on `login_required` items | Partial |
| Joint / authorized-user / corporate cards | Plaid shows a spouse's card you don't carry | Subtype stored; no deselect UI | Post-link "which cards do you carry?" deselect | No |
| MCC differs per issuer | Costco: 5300 on Visa, 5411 on Amex | Unified category; no per-network rules | Defer (low ROI); note as known limitation | No |

## C. Reward math (what will it actually earn?)

| Edge case | Example | Current behavior | Suggested approach | Handled? |
|---|---|---|---|---|
| Rotating category activation | Freedom Flex 5% only if activated this quarter | `requires_activation` stored but ignored in ranking | Track activation; show "5% if activated", don't promise | Partial |
| Spending caps | Amex Gold 4x groceries up to $25k/yr, then 1x | Caps stored + shown in card detail; not in ranking | Track spend vs cap; demote rate near/over cap | No |
| Point value differs | 3x Chase points ≠ 3% cash back | Calc separates cash vs points; ranking uses raw rate | Normalize by cents-per-point before ranking | Partial |
| Card downgrades | Reserve → Freedom Unlimited; rewards change | No version/downgrade detection | Periodic "is this still your card?" verify | No |
| Sign-up bonus in progress | "$4k in 3mo for 80k pts" → use everywhere | Bonus data stored in catalog; never used in recs | Active-bonus flag; surface as a priority nudge | No |
| Targeted / personal offers | "10x at Amazon this month" (per-user) | No offer storage/handling | Manual offer entry later; unsolvable at scale | No |

## D. Notifications & trust

| Edge case | Example | Current behavior | Suggested approach | Handled? |
|---|---|---|---|---|
| Flat-rate / single-card user | Only a 2%-everywhere card → best never changes | No suppression; would still notify | Skip location notifs when wallet has no rate variance | No |
| Wallet changed mid-day | Added a better card after morning pings | Recs recompute next request; no resend/ack | Optional "new card would've earned more" recap | Partial |
| Daily caps / quiet hours / per-type prefs | Don't buzz 20×/day or at 2am | Fully gated (gate service + geo/day cap) | Keep | Yes |
| "Estimate" vs "guarantee" wording | "Earn 3x" reads as a promise | Copy says "Earn Nx" (unhedged); no disclaimer | Soften to "likely/est."; add terms disclaimer | No |
| Account deletion / GDPR purge | User deletes account | Full data purge + auth-user delete | Keep | Yes |
| Token encryption at rest | Stolen DB exposes Plaid access tokens | Column named `*_encrypted` but stored plaintext | Encrypt at rest (KMS / data-protection) | No |
| Affiliate conflict | Best card vs highest-commission card | No affiliate logic anywhere | Keep separation if/when monetized | N/A |

## E. Plaid / transaction sync

| Edge case | Example | Current behavior | Suggested approach | Handled? |
|---|---|---|---|---|
| Debit cards excluded | User links a checking account | Filtered to credit accounts at link | Keep | Yes |
| Per-tier bank/card limits | Free vs Pro link caps | Enforced at link; downgrade pauses sync silently | Keep; make downgrade pause explicit in UI | Partial |
| Disconnect / relink abuse | Swap banks repeatedly to game limits | No cooldown / churn limit | Swap cooldown (e.g. 2 / 30 days) | No |
| Pending transactions | Pending charge double-counts | `is_pending` stored but not excluded from calc | Exclude pending until posted | Partial |
| Refunds (negative amounts) | A $50 refund counted as spend | No sign filtering | Exclude negatives from reward/scoring | No |
| Duplicate transactions | Same txn synced twice | Dedup on `plaid_transaction_id` (unique) | Keep | Yes |
| Messy merchant names | "WHOLEFDS MKT 10394" | Brand matcher normalizes for rule match; raw name kept | Keep; extend alias table over time | Partial |
| User category correction | User fixes a wrong category | Editable + persists; sync won't overwrite override | Keep | Yes |
| Closed card | Card account closed at the bank | Marked disconnected/inactive; history kept | Keep | Yes |
| Provider downtime / 429 | Plaid 5xx or rate limit | Error logged; retried next cron; no backoff | Add backoff/retry | Partial |
| Multi-device / timezones | Phone + tablet; bank TZ vs user TZ | UTC everywhere; tz stored for display only | Keep | Yes |
