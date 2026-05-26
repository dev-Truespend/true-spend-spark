# AI Agent UX Guide

The dashboard should make users feel guided, not managed. TrueSpend should not show every feature at once; it should surface the next best action based on the user's setup state and spending data.

## Product Principle

One screen, one decision:

- Before cards are connected: help the user connect or add a card.
- After cards are connected but rewards are unknown: help the user confirm rewards.
- After transaction data exists: show best-card and missed-rewards insight.
- After value is proven: ask for upgrade, extension install, or mobile permission.

## Recommended Dashboard Priority

### 1. Primary Action Card

Show only one top action:

| User state | Top action |
| --- | --- |
| No cards | Connect your first card |
| Cards but no rewards | Confirm card rewards |
| Rewards but no transactions | Sync transactions |
| Transactions available | See best card recommendations |
| Premium opportunity | Unlock real-time alerts |

Avoid showing six equal cards. Equal visual weight makes users think the app has no opinion.

### 2. AI Agent Summary

Use a short, explainable AI nudge:

```text
You spent most on dining this month. If this pattern continues, Amex Gold-style dining rewards would likely outperform your current default card.
```

Rules:

- Max 2 sentences.
- Include the reason.
- Include one action button.
- Never claim certainty if reward data is missing.

### 3. Rewards Snapshot

Show three numbers:

- Estimated rewards earned this month.
- Estimated rewards missed.
- Best category opportunity.

Do not show detailed charts before the user has enough data.

### 4. Feature Entry Points

Use progressive disclosure:

| Feature | When to show |
| --- | --- |
| Transactions | Always after first transaction |
| Budgets | After at least 5 transactions or user manually opts in |
| Insights | After enough spending history |
| Recommendations | After card rewards are known |
| Extension | After user shops online or has cards/rewards configured |
| Mobile geo alerts | After app has proven card value; ask for permission later |

## Mobile And Usage Improvements

- Make the dashboard card stack short on mobile: primary action, AI nudge, rewards snapshot, latest activity.
- Use bottom navigation only for the main app areas: Dashboard, Cards, Transactions, Insights, Settings.
- Ask for push/geolocation permission only when the user understands the benefit.
- Defer advanced/internal/admin routes from mobile navigation.
- Add a "What should I use here?" quick action for mobile and extension.

## Empty States

Good empty states should explain the next step, not the feature.

Examples:

- Credit cards: "Connect or add one card so TrueSpend can compare rewards."
- Transactions: "Sync transactions or add one manually to start finding missed rewards."
- Insights: "Insights need spending history. Add or sync transactions first."
- Recommendations: "Recommendations unlock after your cards and rewards are known."

## Failure States

Provider failures should be calm and specific:

| Provider | User-facing message |
| --- | --- |
| Plaid unavailable | "Card sync is temporarily unavailable. Your existing data is safe." |
| Stripe unavailable | "Billing is temporarily unavailable. Your current access is unchanged." |
| AI unavailable | "Recommendations are temporarily using rules-based fallback." |
| Maps unavailable | "Location suggestions are paused. Card and transaction features still work." |

## AI Agent Guardrails

- Do not recommend applying for a card unless the data supports annual-fee ROI.
- Always disclose when card recommendations may include affiliate links.
- Store card reward structures and citations in the database; do not re-fetch every time.
- Require user confirmation before writing AI-parsed rewards to a canonical card catalog.
- Keep geolocation recommendations limited to reward-relevant categories like dining, grocery, gas, travel, and shopping.

## Next UX Improvements To Build

1. Dashboard setup-state selector that chooses the single primary action.
2. Rewards confirmation flow for newly connected cards.
3. "Best card now" quick action using `ai-agent`.
4. Recommendations feed filters: best now, missed rewards, apply card, alert.
5. First-time onboarding checklist with 3 steps: connect card, confirm rewards, sync transactions.
