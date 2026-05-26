# TrueSpend — Complete Rebuild Plan for Claude Code
> **Version:** 2.0 · **Last updated:** May 2026  
> **Purpose:** This document is the single source of truth for rebuilding TrueSpend from its current over-engineered 119-function Lovable.dev scaffold into a lean, AI-agent-first credit card optimization platform. Hand this document to Claude Code as the primary build prompt.

---

## Table of Contents
1. [Vision & Competitive Positioning](#1-vision--competitive-positioning)
2. [Competitive Landscape Analysis](#2-competitive-landscape-analysis)
3. [Current Architecture Audit](#3-current-architecture-audit)
4. [Target Architecture](#4-target-architecture)
5. [Database Schema (Source of Truth)](#5-database-schema-source-of-truth)
6. [The AI Agent Design](#6-the-ai-agent-design)
7. [Phased Deployment Plan](#7-phased-deployment-plan)
8. [Production Readiness Checklist](#8-production-readiness-checklist)
9. [What to Delete](#9-what-to-delete)
10. [Documentation Standards](#10-documentation-standards)

---

## 1. Vision & Competitive Positioning

### What TrueSpend is
A cross-platform (web + iOS + Android + browser extension) financial co-pilot that tells users **exactly which credit card to use, right now** — and over time, which cards to apply for to maximize rewards on their actual spending.

### The core loop
```
Plaid syncs transactions → AI agent analyses card × category → 
User gets real-time suggestions (geo push / extension popup / chat) → 
User earns more rewards → User upgrades / refers
```

### Differentiation from every existing competitor
| Feature | MaxRewards | CardPointers | AwardWallet | Monarch/Copilot | **TrueSpend** |
|---|---|---|---|---|---|
| Best card suggestion | ✅ static rules | ✅ static rules | ❌ | ❌ | ✅ **AI agent, personalised** |
| Geo push notification | ❌ | ❌ | ❌ | ❌ | ✅ |
| Browser extension card tip | ❌ | ❌ | ❌ | ❌ | ✅ |
| Missed rewards calc | ❌ | ❌ | ❌ | ❌ | ✅ |
| Apply card AI recommendation | ❌ | ❌ | ❌ | ❌ | ✅ |
| Natural language chat | ❌ | ❌ | ❌ | Monarch only | ✅ |
| Points expiry alerts | ❌ | ❌ | ✅ | ❌ | ✅ |
| Annual fee ROI calc | ❌ | partial | ❌ | ❌ | ✅ |
| Android support | ✅ | web-only | ✅ | ✅ | ✅ |

### Pricing strategy (informed by competitive research)
- MaxRewards charges $156/year · CardPointers $90/year · both have major gaps
- TrueSpend free tier: 3 cards, basic suggestions
- TrueSpend Pro: $79/year — full AI agent, geo alerts, extension, apply recommendations
- TrueSpend Family: $119/year — up to 5 members, household dashboard
- Affiliate revenue: card application referrals (secondary, disclosed)

---

## 2. Competitive Landscape Analysis

### MaxRewards — closest competitor
**Strengths:** Auto-activates Amex/Chase offers, Plaid-linked, native iOS + Android  
**Weaknesses:** Static rule engine (no AI), no geo notifications, no browser extension, no "what card to apply for" feature, $156/year is expensive  
**Our attack:** AI personalisation + geo push + extension + lower price

### CardPointers — second closest
**Strengths:** Deep iOS/Siri integration, 5,000+ cards in DB, polished Apple design  
**Weaknesses:** Android is a web wrapper, no transaction linking (no Plaid), no missed-rewards calc, free tier is crippled  
**Our attack:** Real transaction data via Plaid (not manual entry) = actual personalised advice, not generic category lookup

### AwardWallet — points tracking niche
**Strengths:** 90/60/30-day expiry alerts, broad loyalty program support  
**Weaknesses:** Cannot connect United/Delta/Southwest directly, no card-use suggestions, no spending analysis, terrible itinerary tracking  
**Our attack:** Points expiry + spending intelligence in one place

### Monarch Money / Copilot — budgeting incumbents
**Strengths:** Polished design, AI categorization (Copilot), couples/family (Monarch)  
**Weaknesses:** Not credit-card-rewards focused, no geo, no extension, not telling you which card to use  
**Our attack:** We are not a budgeting app — we are a rewards maximization co-pilot. Different job to be done.

### What none of them do (our blue ocean)
1. **Real-time geo push** — "You just walked into Whole Foods. Use Amex Gold (4x)."
2. **Browser extension card tip** — "Shopping on Amazon. Use Chase Freedom Flex (5x this quarter)."
3. **AI-powered apply recommendations** — "Your $800/month dining spend is worth $288/year on Capital One Savor. Here's the link."
4. **Missed rewards monthly digest** — "You left $47.20 on the table in April."
5. **Conversational interface** — "What's my best card for flights to Japan?"

---

## 3. Current Architecture Audit

### The problem
The project was scaffolded by Lovable.dev's AI. Every feature request caused the AI to add more edge functions without removing old ones. The result is **119 Supabase edge functions** — an enterprise microservices stack for a pre-revenue startup.

### Functions to DELETE immediately (saves ~$200/month in compute, removes 80% of complexity)

#### Custom ML pipeline — DELETE ALL (replaced by LLM)
- `modal-training-trigger` · `modal-training-callback` · `prepare-training-data`
- `schedule-retraining` · `deploy-shadow-model` · `ml-inference`
- `huggingface-categorize` · `ab-testing-manager` · `thompson-sampling-budget`
- `workflow-executor` · `dlq-review` · `retry-processor`

**Why:** GPT-4o / Claude handles categorization, anomaly detection, and recommendations better than a custom-trained HuggingFace model, with zero training infrastructure.

#### Custom observability — DELETE ALL (use Sentry + Supabase dashboard)
- `metrics-aggregator` · `metrics-collector` · `trace-collector` · `log-collector`
- `incident-detector` · `incident-manager` · `slo-manager` · `alert-manager`
- `performance-analyzer` · `backup-verification` · `service-health-check`
- `redis-metrics` · `extension-telemetry`

**Why:** Sentry ($26/month) handles errors, Supabase dashboard handles DB metrics. You don't need custom SLO infrastructure until 100k+ users.

#### Custom event streaming — DELETE ALL (use Supabase Realtime)
- `event-batch-processor` · `event-consumer` · `publish-event`

**Why:** Supabase Realtime handles this natively with zero configuration.

#### Duplicate auth functions — DELETE (Supabase Auth handles natively)
- `mfa-cancel-setup` · `mfa-disable` · `mfa-enable` · `mfa-generate-secret`
- `mfa-verify-totp` · `mfa-verify-backup-code` · `mfa-regenerate-backup-codes`
- `check-login-attempts` · `increment-login-failures` · `record-login-attempt`
- `audit-google-login` · `check-auth-provider` · `check-mfa-status`

**Why:** Supabase Auth includes MFA, rate limiting, and audit logs built-in.

#### Duplicate maps (pick ONE — use Google) — DELETE Foursquare
- `foursquare-cache-cleanup` · `foursquare-enrich-geofence` · `foursquare-place-details`
- `foursquare-places-search` · `foursquare-sync-categories`
- `google-maps-directions` (not needed) · `google-maps-autocomplete` (not needed for MVP)

#### Unnecessary for MVP — DELETE
- `generate-timeline-image` · `deploy-shadow-model` · `widget-data`
- `seed-admin-user` · `csp-reporter` · `feature-flag-evaluator`
- `location-analytics-bff` · `optimize-geofences` · `sign-location-payload`
- `verify-location-payload` · `bff-dashboard` · `bff-transactions`
- `security-headers` · `security-audit` · `rate-limiter` (use Supabase native)

### Functions to KEEP
```
plaid-create-link-token     plaid-exchange-token
plaid-sync-transactions     plaid-disconnect-item
plaid-refresh-accounts      webhook-plaid
stripe-webhook              stripe-create-checkout-session
stripe-create-portal-session  stripe-update-subscription
send-push-notification      send-email-notification
geofence-processor          ocr-process-receipt
google-vision-ocr           google-places-details
google-geolocation          process-transaction
health-check                resend-webhook-handler
```

**New functions to CREATE:**
```
ai-agent                    (the single intelligence hub — see Section 6)
card-rewards-seed           (one-time: seed rewards DB with top 100 cards)
notify-best-card            (triggered by geofence-processor)
extension-card-suggest      (called by browser extension popup)
apply-recommendations       (weekly cron: generate card apply suggestions)
```

---

## 4. Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  Web App (React/Vite)  │  Mobile (Capacitor)         │
│  Browser Extension     │  Push Notifications         │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS / Supabase Realtime
┌────────────────▼────────────────────────────────────┐
│              SUPABASE (backend)                      │
│                                                      │
│  Auth (native MFA, RLS)                             │
│  Database (Postgres + pgvector)                     │
│  Realtime (websockets)                              │
│  Storage (receipt images)                           │
│                                                      │
│  Edge Functions (~20 total):                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  DATA INGESTION                              │  │
│  │  plaid-* (5)  │  webhook-plaid              │  │
│  │  process-transaction  │  ocr-process-receipt │  │
│  ├──────────────────────────────────────────────┤  │
│  │  AI INTELLIGENCE  ← THE CORE                │  │
│  │  ai-agent (Claude/GPT-4 with tool use)      │  │
│  │  notify-best-card  │  extension-card-suggest│  │
│  │  apply-recommendations (weekly cron)         │  │
│  ├──────────────────────────────────────────────┤  │
│  │  NOTIFICATIONS                               │  │
│  │  send-push-notification  │  send-email       │  │
│  │  geofence-processor  │  resend-webhook       │  │
│  ├──────────────────────────────────────────────┤  │
│  │  BILLING                                     │  │
│  │  stripe-* (4)                               │  │
│  ├──────────────────────────────────────────────┤  │
│  │  GEO                                         │  │
│  │  google-geolocation  │  google-places-details│  │
│  └──────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│           EXTERNAL SERVICES                          │
│  Plaid (bank data)     │  Stripe (billing)           │
│  Anthropic Claude API  │  Google Places API          │
│  Resend (email)        │  Sentry (error tracking)    │
└─────────────────────────────────────────────────────┘
```

---

## 5. Database Schema (Source of Truth)

> **IMPORTANT for Claude Code:** Run these migrations in order. Do not modify existing `credit_cards` or `transactions` tables structure — only ADD columns.

### 5.1 Add rewards structure to credit_cards table
```sql
-- Migration: add_rewards_to_credit_cards
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS card_network TEXT; -- visa, mastercard, amex, discover
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS card_product_name TEXT; -- "Chase Sapphire Preferred"
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS rewards_type TEXT DEFAULT 'cashback'; -- cashback | points | miles
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS points_program TEXT; -- "Chase Ultimate Rewards", "Amex Membership Rewards"
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS base_rewards_rate DECIMAL(5,3) DEFAULT 1.0; -- 1.0 = 1%
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS annual_fee INTEGER DEFAULT 0; -- in cents
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS rewards_confirmed_by_user BOOLEAN DEFAULT false;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS rewards_last_updated TIMESTAMPTZ;
```

### 5.2 New table: card_rewards_categories
```sql
-- Stores per-category multipliers for each card
CREATE TABLE IF NOT EXISTS card_rewards_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Spending category (matches transaction.category values)
  category TEXT NOT NULL,  -- 'dining', 'groceries', 'travel', 'gas', 'streaming', 'other'
  
  rewards_rate DECIMAL(5,3) NOT NULL,  -- 4.0 = 4x points or 4% cashback
  rewards_cap_monthly INTEGER,         -- NULL = no cap; value in cents
  is_rotating_category BOOLEAN DEFAULT false,
  rotating_valid_from DATE,
  rotating_valid_until DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(credit_card_id, category)
);

-- RLS
ALTER TABLE card_rewards_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_rewards" ON card_rewards_categories
  USING (user_id = auth.uid());
```

### 5.3 New table: card_catalog (pre-seeded, public)
```sql
-- Public reference data for 100+ common US credit cards
-- Used to auto-populate rewards when user connects a known card
CREATE TABLE IF NOT EXISTS card_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_product_name TEXT NOT NULL UNIQUE,
  card_network TEXT NOT NULL,
  issuer TEXT NOT NULL,
  rewards_type TEXT NOT NULL,
  points_program TEXT,
  annual_fee INTEGER DEFAULT 0,
  base_rewards_rate DECIMAL(5,3) DEFAULT 1.0,
  
  -- JSON structure: {"dining": 3.0, "groceries": 4.0, "travel": 3.0, "gas": 1.0}
  category_rates JSONB NOT NULL DEFAULT '{}',
  
  -- For apply recommendations
  signup_bonus_points INTEGER,
  signup_bonus_spend_required INTEGER,  -- in cents
  signup_bonus_days INTEGER,
  recommended_credit_score_min INTEGER,
  
  apply_url TEXT,  -- affiliate link
  apply_url_is_affiliate BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  last_verified DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS — this is public reference data
GRANT SELECT ON card_catalog TO anon, authenticated;
```

### 5.4 New table: ai_recommendations
```sql
-- Stores AI-generated recommendations (cached, shown in UI)
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  recommendation_type TEXT NOT NULL,
  -- 'best_card_now'        → use this card for this merchant
  -- 'missed_rewards'       → you left $X this month
  -- 'apply_suggestion'     → apply for this card
  -- 'spending_insight'     → general AI insight
  -- 'subscription_alert'   → recurring charge detected
  -- 'duplicate_charge'     → possible duplicate
  
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- References
  credit_card_id UUID REFERENCES credit_cards(id),     -- card being recommended
  catalog_card_id UUID REFERENCES card_catalog(id),    -- card to apply for
  transaction_id UUID REFERENCES transactions(id),
  
  -- Data payload for UI rendering
  metadata JSONB DEFAULT '{}',
  -- e.g. {"merchant": "Whole Foods", "amount": 4500, "best_card": "Amex Gold", "rewards_rate": 4.0, "earned": 180}
  
  estimated_value_cents INTEGER,  -- projected $ value of following this recommendation
  
  status TEXT DEFAULT 'active',   -- active | dismissed | actioned
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_ai_recs_user_type (user_id, recommendation_type, status)
);

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recs" ON ai_recommendations USING (user_id = auth.uid());
```

### 5.5 New table: missed_rewards_summary
```sql
-- Monthly rollup: how much the user left on the table
CREATE TABLE IF NOT EXISTS missed_rewards_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,  -- first day of month: 2026-05-01
  
  total_rewards_earned_cents INTEGER DEFAULT 0,
  total_rewards_possible_cents INTEGER DEFAULT 0,
  missed_rewards_cents INTEGER DEFAULT 0,  -- possible - earned
  
  -- Per-card breakdown
  card_breakdown JSONB DEFAULT '[]',
  -- [{"card_id": "...", "card_name": "Chase Sapphire", "earned": 2340, "possible": 4200}]
  
  -- Per-category breakdown
  category_breakdown JSONB DEFAULT '[]',
  -- [{"category": "dining", "earned": 1200, "possible": 2400, "best_card_id": "..."}]
  
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_month)
);

ALTER TABLE missed_rewards_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_summary" ON missed_rewards_summary USING (user_id = auth.uid());
```

### 5.6 New table: user_devices (already exists — verify columns)
```sql
-- Ensure these columns exist for push notifications
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS platform TEXT;  -- ios | android | web
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
```

### 5.7 Extend transactions table
```sql
-- Add card attribution and rewards tracking
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rewards_earned_cents INTEGER;   -- actual rewards earned
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rewards_possible_cents INTEGER; -- best possible rewards
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS best_card_id UUID REFERENCES credit_cards(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_category TEXT;  -- google places category
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_place_id TEXT;  -- google place_id for geo
```

### 5.8 Card catalog seed data (top 20 to start)
```sql
-- Run this as a one-time seed. Claude Code: expand to 100 cards.
INSERT INTO card_catalog (card_product_name, card_network, issuer, rewards_type, points_program, annual_fee, base_rewards_rate, category_rates, signup_bonus_points, signup_bonus_spend_required, signup_bonus_days, recommended_credit_score_min, apply_url) VALUES
('Amex Gold Card', 'amex', 'American Express', 'points', 'Amex Membership Rewards', 25000, 1.0, '{"dining": 4.0, "groceries": 4.0, "travel": 3.0, "other": 1.0}', 60000, 400000, 180, 700, 'https://americanexpress.com/gold'),
('Chase Sapphire Preferred', 'visa', 'Chase', 'points', 'Chase Ultimate Rewards', 9500, 1.0, '{"dining": 3.0, "travel": 3.0, "streaming": 3.0, "groceries": 3.0, "other": 1.0}', 60000, 400000, 90, 690, 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred'),
('Chase Sapphire Reserve', 'visa', 'Chase', 'points', 'Chase Ultimate Rewards', 55000, 1.0, '{"dining": 3.0, "travel": 10.0, "other": 1.0}', 60000, 400000, 90, 720, 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve'),
('Chase Freedom Flex', 'mastercard', 'Chase', 'cashback', NULL, 0, 1.0, '{"dining": 3.0, "drugstore": 3.0, "rotating": 5.0, "other": 1.0}', 20000, 50000, 90, 670, 'https://creditcards.chase.com/cash-back-credit-cards/freedom/flex'),
('Capital One Venture X', 'visa', 'Capital One', 'miles', 'Capital One Miles', 39500, 2.0, '{"travel": 10.0, "hotels": 10.0, "other": 2.0}', 75000, 400000, 90, 720, 'https://capitalone.com/venture-x'),
('Capital One Savor', 'mastercard', 'Capital One', 'cashback', NULL, 9500, 1.0, '{"dining": 3.0, "entertainment": 3.0, "groceries": 3.0, "streaming": 3.0, "other": 1.0}', 30000, 300000, 90, 690, 'https://capitalone.com/savor'),
('Citi Double Cash', 'mastercard', 'Citi', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 660, 'https://online.citi.com/double-cash'),
('Amex Blue Cash Preferred', 'amex', 'American Express', 'cashback', NULL, 9500, 1.0, '{"groceries": 6.0, "streaming": 6.0, "transit": 3.0, "gas": 3.0, "other": 1.0}', 25000, 300000, 180, 680, 'https://americanexpress.com/blue-cash-preferred'),
('Discover it Cash Back', 'discover', 'Discover', 'cashback', NULL, 0, 1.0, '{"rotating": 5.0, "other": 1.0}', 0, 0, 0, 650, 'https://discover.com/it-cashback'),
('Wells Fargo Active Cash', 'visa', 'Wells Fargo', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 20000, 50000, 90, 670, 'https://wellsfargo.com/active-cash'),
('Amex Platinum', 'amex', 'American Express', 'points', 'Amex Membership Rewards', 69500, 1.0, '{"travel": 5.0, "flights": 5.0, "hotels": 5.0, "other": 1.0}', 80000, 600000, 180, 720, 'https://americanexpress.com/platinum'),
('Bank of America Customized Cash', 'visa', 'Bank of America', 'cashback', NULL, 0, 1.0, '{"chosen_category": 3.0, "groceries": 2.0, "other": 1.0}', 20000, 100000, 90, 660, 'https://bankofamerica.com/customized-cash'),
('US Bank Altitude Go', 'visa', 'US Bank', 'points', NULL, 0, 1.0, '{"dining": 4.0, "groceries": 2.0, "streaming": 2.0, "gas": 2.0, "other": 1.0}', 20000, 100000, 90, 660, 'https://usbank.com/altitude-go'),
('Bilt Mastercard', 'mastercard', 'Wells Fargo', 'points', 'Bilt Rewards', 0, 1.0, '{"rent": 1.0, "dining": 3.0, "travel": 2.0, "other": 1.0}', 0, 0, 0, 680, 'https://biltrewards.com'),
('Ink Business Preferred', 'visa', 'Chase', 'points', 'Chase Ultimate Rewards', 9500, 1.0, '{"travel": 3.0, "shipping": 3.0, "advertising": 3.0, "telecom": 3.0, "other": 1.0}', 100000, 800000, 90, 700, 'https://creditcards.chase.com/business-credit-cards/ink/preferred'),
('Amex Business Gold', 'amex', 'American Express', 'points', 'Amex Membership Rewards', 29500, 1.0, '{"top_2_categories": 4.0, "other": 1.0}', 70000, 1000000, 180, 700, 'https://americanexpress.com/business-gold'),
('Hilton Honors Amex Surpass', 'amex', 'American Express', 'points', 'Hilton Honors', 15000, 3.0, '{"hilton": 12.0, "dining": 6.0, "groceries": 6.0, "gas": 6.0, "other": 3.0}', 130000, 300000, 90, 680, 'https://americanexpress.com/hilton-surpass'),
('Delta SkyMiles Gold Amex', 'amex', 'American Express', 'miles', 'Delta SkyMiles', 9900, 1.0, '{"delta": 3.0, "dining": 2.0, "groceries": 2.0, "other": 1.0}', 70000, 300000, 180, 680, 'https://americanexpress.com/delta-gold'),
('Southwest Rapid Rewards Plus', 'visa', 'Chase', 'points', 'Southwest Rapid Rewards', 6900, 1.0, '{"southwest": 2.0, "hotels": 2.0, "other": 1.0}', 50000, 100000, 90, 670, 'https://creditcards.chase.com/travel-credit-cards/southwest'),
('Apple Card', 'mastercard', 'Goldman Sachs', 'cashback', NULL, 0, 1.0, '{"apple": 3.0, "other": 2.0}', 0, 0, 0, 670, NULL);
```

---

## 6. The AI Agent Design

### Philosophy
Replace ~80 edge functions with **one `ai-agent` edge function** that uses Claude (claude-sonnet-4-6 or claude-opus-4-6) with tool use. The agent decides which database queries to run, calculates rewards, and returns structured answers. All intelligence lives in the model prompt + tool definitions.

### Edge function: `supabase/functions/ai-agent/index.ts`

```typescript
/**
 * TrueSpend AI Agent
 * 
 * Single entry point for all AI-powered features.
 * Uses Claude claude-sonnet-4-6 with tool use (function calling).
 * 
 * Request body:
 * {
 *   intent: 'analyze_spending' | 'best_card_now' | 'missed_rewards' |
 *           'card_suggestions' | 'chat' | 'anomaly_check' | 'apply_recommendations',
 *   payload: {
 *     merchant?: string,        // for best_card_now
 *     amount?: number,          // in cents
 *     period?: 'week'|'month'|'quarter',
 *     message?: string,         // for chat
 *     location?: { lat: number, lng: number }
 *   }
 * }
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_user_cards_with_rewards',
    description: `Fetch all active credit cards for the current user, including their rewards 
    rates per spending category. Returns card name, network, annual fee, base rate, and 
    category-specific multipliers (dining, groceries, travel, gas, streaming, etc). 
    Use this before making any card recommendation.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_transactions',
    description: `Fetch the user's transactions for a given time period. 
    Returns merchant name, category, amount, timestamp, and which card was used.
    Use for spending analysis, pattern detection, and missed rewards calculation.`,
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days back to fetch (7, 30, or 90)' },
        category: { type: 'string', description: 'Optional: filter by spending category' },
        limit: { type: 'number', description: 'Max transactions to return (default 200)' },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_best_card_for_purchase',
    description: `Given a merchant name and optional amount, deterministically calculate 
    which of the user's cards earns the most rewards. Returns ranked list of cards with 
    expected rewards amount. This uses the card_rewards_categories table — always call 
    get_user_cards_with_rewards first to ensure data is loaded.`,
    input_schema: {
      type: 'object',
      properties: {
        merchant_name: { type: 'string' },
        merchant_category: { 
          type: 'string',
          enum: ['dining', 'groceries', 'travel', 'gas', 'streaming', 'shopping', 'entertainment', 'other']
        },
        amount_cents: { type: 'number', description: 'Purchase amount in cents' },
      },
      required: ['merchant_category'],
    },
  },
  {
    name: 'calculate_missed_rewards',
    description: `For a given time period, calculate how much the user earned in rewards 
    versus what they could have earned if they always used their optimal card. 
    Returns total missed amount and per-category breakdown.`,
    input_schema: {
      type: 'object',
      properties: {
        period_days: { type: 'number', description: '30 or 90' },
      },
      required: ['period_days'],
    },
  },
  {
    name: 'get_card_apply_recommendations',
    description: `Analyse the user's 90-day spending by category and compare against 
    cards in the card_catalog that the user does NOT currently have. Return top 3 cards 
    that would earn the most additional rewards based on actual spending patterns.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'detect_anomalies',
    description: `Scan recent transactions for: duplicate charges (same merchant + amount 
    within 7 days), unexpected recurring charges, unusually large transactions vs historical 
    average, and subscriptions the user may have forgotten. Returns list of flagged items.`,
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to scan (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'save_recommendation',
    description: `Persist an AI recommendation to the ai_recommendations table so it 
    appears in the user's feed. Use after generating a meaningful insight.`,
    input_schema: {
      type: 'object',
      properties: {
        recommendation_type: {
          type: 'string',
          enum: ['best_card_now', 'missed_rewards', 'apply_suggestion', 'spending_insight', 'subscription_alert', 'duplicate_charge']
        },
        title: { type: 'string' },
        body: { type: 'string' },
        estimated_value_cents: { type: 'number' },
        metadata: { type: 'object' },
        credit_card_id: { type: 'string' },
        catalog_card_id: { type: 'string' },
      },
      required: ['recommendation_type', 'title', 'body'],
    },
  },
];

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are TrueSpend's financial co-pilot AI. Your job is to help users 
maximize their credit card rewards on every purchase.

Core principles:
1. Always be specific with numbers — "you earned 3% back ($1.80)" not "you earned rewards"
2. When recommending a card, show the math: card name, rate, expected earnings
3. When calculating missed rewards, show what card they should have used and the difference
4. Keep responses concise — users read these on mobile
5. Currency is always USD. Amounts under $10 in cents, over $10 in dollars
6. Categories: dining, groceries, travel, gas, streaming, shopping, entertainment, other

Tool use order for best_card_now:
1. Call get_user_cards_with_rewards (always first)
2. Call get_best_card_for_purchase with the merchant/category
3. Return a clear recommendation with the math

Tool use order for missed_rewards:
1. Call calculate_missed_rewards
2. Call get_user_cards_with_rewards  
3. Return the total missed, top 3 categories to fix, and which card to use for each

Tool use order for apply_recommendations:
1. Call get_card_apply_recommendations
2. Return top 2 cards with: projected annual earnings increase, signup bonus value, annual fee math`;

// ─── TOOL IMPLEMENTATIONS (database queries) ──────────────────────────────────

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<unknown> {
  switch (toolName) {
    case 'get_user_cards_with_rewards': {
      const { data: cards } = await supabase
        .from('credit_cards')
        .select(`
          id, card_product_name, card_network, rewards_type,
          points_program, annual_fee, base_rewards_rate,
          card_rewards_categories (category, rewards_rate, rewards_cap_monthly, is_rotating_category)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);
      return cards;
    }

    case 'get_transactions': {
      const days = (toolInput.days as number) || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      let query = supabase
        .from('transactions')
        .select('id, description, amount, category, merchant_category, timestamp, credit_card_id, rewards_earned_cents')
        .eq('user_id', userId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit((toolInput.limit as number) || 200);
      if (toolInput.category) query = query.eq('category', toolInput.category);
      const { data } = await query;
      return data;
    }

    case 'get_best_card_for_purchase': {
      const category = toolInput.merchant_category as string;
      const amountCents = (toolInput.amount_cents as number) || 10000;

      const { data: cards } = await supabase
        .from('credit_cards')
        .select(`
          id, card_product_name, base_rewards_rate,
          card_rewards_categories!inner (category, rewards_rate)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!cards) return [];

      return cards
        .map((card: Record<string, unknown>) => {
          const categoryRewards = (card.card_rewards_categories as Array<{category: string; rewards_rate: number}>)
            ?.find((r) => r.category === category);
          const rate = categoryRewards?.rewards_rate || (card.base_rewards_rate as number) || 1.0;
          const earnedCents = Math.floor((amountCents * rate) / 100);
          return {
            card_id: card.id,
            card_name: card.card_product_name,
            rewards_rate: rate,
            earned_cents: earnedCents,
            earned_dollars: (earnedCents / 100).toFixed(2),
          };
        })
        .sort((a: {earned_cents: number}, b: {earned_cents: number}) => b.earned_cents - a.earned_cents);
    }

    case 'calculate_missed_rewards': {
      const days = (toolInput.period_days as number) || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { data: txns } = await supabase
        .from('transactions')
        .select('id, amount, category, credit_card_id, rewards_earned_cents, rewards_possible_cents')
        .eq('user_id', userId)
        .gte('timestamp', since);

      if (!txns?.length) return { missed_cents: 0, earned_cents: 0, possible_cents: 0, by_category: [] };

      const totalEarned = txns.reduce((s: number, t: {rewards_earned_cents?: number}) => s + (t.rewards_earned_cents || 0), 0);
      const totalPossible = txns.reduce((s: number, t: {rewards_possible_cents?: number}) => s + (t.rewards_possible_cents || 0), 0);

      return {
        missed_cents: totalPossible - totalEarned,
        earned_cents: totalEarned,
        possible_cents: totalPossible,
        efficiency_pct: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 100,
      };
    }

    case 'get_card_apply_recommendations': {
      const { data: spending } = await supabase.rpc('get_category_spending_90d', { p_user_id: userId });
      const { data: existingCards } = await supabase
        .from('credit_cards')
        .select('card_product_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      const existingNames = (existingCards || []).map((c: {card_product_name: string}) => c.card_product_name);

      const { data: catalog } = await supabase
        .from('card_catalog')
        .select('*')
        .eq('is_active', true)
        .not('card_product_name', 'in', `(${existingNames.map((n: string) => `'${n}'`).join(',')})`);

      return { spending_by_category: spending, catalog_cards: catalog };
    }

    case 'detect_anomalies': {
      const days = (toolInput.days as number) || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { data: txns } = await supabase
        .from('transactions')
        .select('id, description, amount, timestamp, category')
        .eq('user_id', userId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: false });

      return txns;
    }

    case 'save_recommendation': {
      const { data } = await supabase.from('ai_recommendations').insert({
        user_id: userId,
        ...toolInput,
      }).select().single();
      return data;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { intent, payload = {} } = await req.json();

    const userMessage = buildUserMessage(intent, payload);

    // Agentic loop — Claude calls tools until it has enough info
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

    let finalResponse = '';
    let structuredResult: unknown = null;
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'end_turn') {
        finalResponse = response.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as Anthropic.TextBlock).text)
          .join('');
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (toolUse) => {
            try {
              const result = await executeToolCall(toolUse.name, toolUse.input as Record<string, unknown>, supabase, user.id);
              return {
                type: 'tool_result' as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              };
            } catch (e) {
              return {
                type: 'tool_result' as const,
                tool_use_id: toolUse.id,
                content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
                is_error: true,
              };
            }
          })
        );

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    return new Response(
      JSON.stringify({ response: finalResponse, data: structuredResult, intent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI agent error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function buildUserMessage(intent: string, payload: Record<string, unknown>): string {
  switch (intent) {
    case 'best_card_now':
      return `I'm about to make a purchase at "${payload.merchant}" (category: ${payload.category}) for $${((payload.amount_cents as number || 0) / 100).toFixed(2)}. Which of my cards should I use?`;
    case 'analyze_spending':
      return `Analyze my spending for the last ${payload.period === 'week' ? '7' : payload.period === 'quarter' ? '90' : '30'} days. Give me key insights, patterns, and top categories.`;
    case 'missed_rewards':
      return `Calculate how much in rewards I missed this month. Which cards should I have used instead?`;
    case 'apply_recommendations':
      return `Based on my actual spending over the last 90 days, which new credit cards should I apply for to earn more rewards? Show me the math.`;
    case 'anomaly_check':
      return `Check my recent transactions for any anomalies: duplicate charges, forgotten subscriptions, or unusually large transactions.`;
    case 'chat':
      return payload.message as string;
    default:
      return `Help me with: ${intent}`;
  }
}
```

### Required Supabase database function
```sql
-- Called by get_card_apply_recommendations tool
CREATE OR REPLACE FUNCTION get_category_spending_90d(p_user_id UUID)
RETURNS TABLE(category TEXT, total_cents BIGINT) AS $$
  SELECT category, SUM(amount * 100)::BIGINT as total_cents
  FROM transactions
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '90 days'
    AND amount > 0
  GROUP BY category
  ORDER BY total_cents DESC;
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## 7. Phased Deployment Plan

> **Claude Code instructions:** Complete phases in strict order. Do not start Phase N+1 until all tasks in Phase N pass their acceptance criteria. Run `supabase db push` after each migration. Run the test suite after each phase.

---

### Phase 0 — Cleanup (Week 1)
**Goal:** Delete the bloat. Go from 119 → ~25 functions. No new features.

#### Tasks
- [ ] Delete all 94 functions listed in Section 3 "Functions to DELETE"
- [ ] Remove all HuggingFace imports from `_shared/hf-client.ts` and `hf-circuit-breaker.ts`
- [ ] Remove Redis references (`redis-metrics` is deleted; remove any Redis env vars)
- [ ] Remove Modal.com references and env vars (`MODAL_API_KEY`)
- [ ] Remove Foursquare references and env vars (`FOURSQUARE_API_KEY`)
- [ ] Remove Lovable AI gateway references (`LOVABLE_API_KEY`) from `ai-analyze-spending`
- [ ] Install Sentry: `npm install @sentry/deno` — add to `_shared/sentry.ts`
- [ ] Add `ANTHROPIC_API_KEY` to Supabase secrets: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
- [ ] Update `supabase/functions/deno.json` — remove unused imports
- [ ] Remove all ML-related frontend components from `src/features/ml/`
- [ ] Remove `src/features/observability/` (keep Sentry integration only)
- [ ] Update `src/App.tsx` — remove routes to deleted pages

#### Acceptance criteria
- `supabase functions list` shows ≤25 functions
- `npm run build` compiles without errors
- Auth still works (sign in, sign out, MFA via Supabase native)
- Plaid connection still works

---

### Phase 1 — Rewards Foundation (Week 2)
**Goal:** Build the data layer that makes all intelligence possible.

#### Tasks
- [ ] Run migration: `add_rewards_to_credit_cards` (Section 5.1)
- [ ] Run migration: create `card_rewards_categories` table (Section 5.2)
- [ ] Run migration: create `card_catalog` table (Section 5.3)
- [ ] Run migration: create `ai_recommendations` table (Section 5.4)
- [ ] Run migration: create `missed_rewards_summary` table (Section 5.5)
- [ ] Run migration: extend `transactions` table (Section 5.7)
- [ ] Run seed: insert top 100 US credit cards into `card_catalog` (expand the 20-card seed in Section 5.8 to 100 cards using publicly available card data)
- [ ] Create `supabase/functions/card-rewards-seed/index.ts` — matches known card names from Plaid to `card_catalog`, auto-populates `card_rewards_categories` for the user
- [ ] Build UI: `src/features/credit-cards/components/RewardsEditor.tsx` — lets users view and confirm/edit their rewards rates per card
- [ ] Update `CreditCardDetails.tsx` to show rewards rates and link to editor
- [ ] Update `CreditCardTile.tsx` to show top reward category (e.g. "4x dining")

#### Acceptance criteria
- User connects a Chase Sapphire card via Plaid → system auto-populates 3x dining, 3x travel from catalog
- User can see and edit rewards rates in the UI
- `card_catalog` contains at least 100 cards
- All migrations run cleanly on fresh Supabase project

---

### Phase 2 — AI Agent Core (Week 3)
**Goal:** Replace all AI intelligence functions with the single agent.

#### Tasks
- [ ] Create `supabase/functions/ai-agent/index.ts` using the full implementation in Section 6
- [ ] Create SQL function `get_category_spending_90d` (Section 6, bottom)
- [ ] Delete `supabase/functions/ai-analyze-spending/` (replaced by agent)
- [ ] Delete `supabase/functions/ai-categorize-transaction/` (agent handles this)
- [ ] Delete `supabase/functions/auto-categorize-transaction/` (duplicate)
- [ ] Delete `supabase/functions/detect-transaction-anomalies/` (agent handles this)
- [ ] Delete `supabase/functions/generate-budget-recommendations/` (agent handles this)
- [ ] Delete `supabase/functions/location-insights-ai/` (agent handles this)
- [ ] Update `src/features/insights/pages/Insights.tsx` — call `ai-agent` with `intent: 'analyze_spending'`
- [ ] Create `src/shared/hooks/useAIAgent.tsx` — React hook that calls the agent and manages loading/error states
- [ ] Update `src/features/transactions/pages/Transactions.tsx` — after Plaid sync, call agent with `intent: 'anomaly_check'`
- [ ] Build `src/features/recommendations/pages/Recommendations.tsx` — displays `ai_recommendations` feed
- [ ] Build `src/features/recommendations/components/RecommendationCard.tsx` — renders each recommendation type
- [ ] Add "Recommendations" tab to main navigation

#### Acceptance criteria
- User visits Insights page → sees AI analysis generated by Claude, not Gemini via Lovable
- Agent correctly identifies best card for a test purchase (dining, $50, user has Amex Gold and Chase Freedom)
- Agent missed-rewards calculation matches manual calculation within 5%
- Anomaly detection flags a manually inserted duplicate transaction in test data
- Agent responds to `intent: 'chat'` with a sensible answer to "What's my best card for Amazon purchases?"

---

### Phase 3 — Real-Time Card Suggestions (Week 4)
**Goal:** The geo push and browser extension card tip features — the core differentiator.

#### Tasks

##### 3A: Transaction-time suggestion (on every Plaid sync)
- [ ] Update `supabase/functions/process-transaction/index.ts`:
  - After inserting transaction, call `ai-agent` with `intent: 'best_card_now'`
  - Write result to `transactions.best_card_id` and `rewards_possible_cents`
  - If a better card exists: insert into `ai_recommendations` as `best_card_now`
- [ ] Update transaction list UI to show "💡 X% more with [Card]" badge on transactions where a better card existed

##### 3B: Geo push notification
- [ ] Update `supabase/functions/geofence-processor/index.ts`:
  - On geofence ENTRY event, call `ai-agent` with `intent: 'best_card_now'` + merchant from geofence metadata
  - If best card identified: call `send-push-notification` with card suggestion
  - Create `supabase/functions/notify-best-card/index.ts` as the orchestrator
- [ ] Update push notification payload format:
  ```json
  {
    "title": "You're at Whole Foods",
    "body": "Use Amex Gold for 4x points ($0.80 on a $20 spend)",
    "data": { "type": "card_suggestion", "card_id": "...", "merchant": "Whole Foods" }
  }
  ```
- [ ] Handle push tap in mobile app — deep link to card detail page

##### 3C: Browser extension card suggestion
- [ ] Create `supabase/functions/extension-card-suggest/index.ts`:
  - Accepts `{ merchant: string, url: string, user_id: string }`
  - Calls `ai-agent` with `intent: 'best_card_now'`
  - Returns top 3 cards with rates for the extension to display
- [ ] Update `extension/background/index.ts`:
  - On `MERCHANT_DETECTED` message from content script, call `extension-card-suggest`
  - Send result back to popup via `chrome.runtime.sendMessage`
- [ ] Rebuild `extension/popup/Popup.tsx`:
  - Show "Best card for [merchant]" section at top (replaces budget-only view)
  - Show top 3 cards ranked by reward rate for current merchant
  - Show budget summary below (keep existing)
  - Add "What card for groceries?" quick-ask buttons

#### Acceptance criteria
- Manually trigger geofence entry → push notification arrives on test device within 10 seconds with correct card name and math
- Visit amazon.com with extension installed → popup shows "Use Chase Freedom Flex (5x this quarter)"
- Plaid transaction sync creates `best_card_now` recommendation when a better card existed
- Extension works in Chrome and Firefox (Manifest V3)

---

### Phase 4 — Growth Features (Week 5–6)
**Goal:** Retention + monetization features.

#### Tasks

##### 4A: Missed rewards digest
- [ ] Create cron job (Supabase scheduled function): `apply-recommendations`
  - Runs first of every month at 9am UTC
  - For each active user: call agent with `intent: 'missed_rewards'`
  - Write result to `missed_rewards_summary`
  - Send email digest via Resend with the missed amount and top 3 fixes
- [ ] Build `src/features/rewards/pages/RewardsDashboard.tsx`:
  - Monthly missed rewards chart
  - Card efficiency scores (% of optimal rewards earned per card)
  - "Fix this" CTA buttons linking to card suggestion

##### 4B: Card apply recommendations
- [ ] Update `apply-recommendations` cron:
  - After missed rewards: call agent with `intent: 'apply_recommendations'`
  - Save top 2 as `apply_suggestion` recommendations
- [ ] Build `src/features/recommendations/components/ApplyCard.tsx`:
  - Shows card image, projected extra annual earnings, signup bonus
  - "Learn more" button opens affiliate link with disclosure banner
  - Affiliate disclosure shown inline: "TrueSpend may earn a commission"
- [ ] Add affiliate link tracking table `affiliate_clicks` in Supabase

##### 4C: Subscription tracker
- [ ] Update `process-transaction` function:
  - Detect recurring charges (same merchant, similar amount, 28-32 day interval)
  - Insert `subscription_alert` recommendation with merchant name and monthly cost
- [ ] Build `src/features/subscriptions/pages/Subscriptions.tsx`:
  - List of detected subscriptions with monthly/annual cost
  - "Flag for review" and "This is expected" actions
  - Total subscriptions cost per month

##### 4D: Annual fee ROI calculator
- [ ] Build `src/features/credit-cards/components/AnnualFeeROI.tsx`:
  - Pulls 12 months of rewards earned per card from `transactions`
  - Shows: rewards earned − annual fee = net value
  - If negative: "Consider cancelling or downgrading"
  - CTA: "See better alternatives" → runs apply recommendations

#### Acceptance criteria
- Monthly cron runs on 1st of month, all active users receive missed rewards email
- Apply recommendation shows correct projected annual earnings (testable with known card + known spending)
- Subscription tracker correctly flags a manually inserted monthly recurring charge
- ROI calculator shows correct net value for a card with $95 annual fee and $120 earned in rewards

---

### Phase 5 — Production Hardening (Week 7)
**Goal:** Make it safe to onboard real users.

#### Tasks

##### 5A: Error handling & observability
- [ ] Add Sentry to all edge functions via `_shared/sentry.ts`
- [ ] Add Sentry to React app (`src/main.tsx`)
- [ ] Add Sentry to browser extension (`extension/background/index.ts`)
- [ ] Create Supabase `health-check` endpoint that verifies: DB connection, Plaid API, Anthropic API, Stripe API
- [ ] Add `ANTHROPIC_API_KEY` usage monitoring — alert via email if monthly spend > $50

##### 5B: Rate limiting & cost control
- [ ] Add per-user rate limit on `ai-agent`: max 20 calls/hour using Supabase RLS + a `rate_limit_log` table
- [ ] Cache `analyze_spending` results for 24 hours in `spending_patterns` table (already exists)
- [ ] Cache `apply_recommendations` results for 7 days in `ai_recommendations` table
- [ ] Add token counting — log approximate token usage per agent call for cost tracking

##### 5C: Security
- [ ] Verify all edge functions validate `Authorization` header before any DB query
- [ ] Verify all tables have RLS enabled (use `SELECT * FROM pg_tables WHERE rowsecurity = false`)
- [ ] Ensure affiliate links open in new tab with `rel="noopener noreferrer"`
- [ ] Ensure `card_catalog.apply_url` is only served to authenticated users
- [ ] Add CORS — restrict to `truespend.org` and `chrome-extension://` origins only

##### 5D: Performance
- [ ] Add `pgvector` extension for semantic transaction search (future)
- [ ] Add indexes: `transactions(user_id, timestamp)`, `transactions(user_id, category)`, `ai_recommendations(user_id, status, created_at)`
- [ ] Ensure Plaid sync doesn't block the UI — use optimistic updates + background sync

##### 5E: Documentation
- [ ] Update `README.md` with new architecture diagram
- [ ] Create `docs/AGENT.md` — explains the AI agent design, tool definitions, and how to extend
- [ ] Create `docs/SCHEMA.md` — full DB schema with column descriptions
- [ ] Create `docs/DEPLOYMENT.md` — step-by-step deploy to Supabase + Vercel
- [ ] Create `docs/EXTENSION.md` — how to load, test, and publish the extension
- [ ] Update `extension/README.md` — new popup behaviour, how card suggestions work
- [ ] Add inline JSDoc to all new TypeScript files

#### Acceptance criteria
- Sentry captures a manually thrown error in test
- Rate limit blocks the 21st agent call within an hour
- All RLS check passes: no table accessible without auth
- Lighthouse score > 90 on mobile
- `npm run build` produces zero TypeScript errors

---

## 8. Production Readiness Checklist

Before launching to real users, verify every item:

### Infrastructure
- [ ] Supabase project on Pro plan (not free — free has row limits)
- [ ] Supabase database backups enabled (daily, 7-day retention)
- [ ] Vercel project connected to `main` branch, preview deploys on PRs
- [ ] All secrets set in Supabase: `ANTHROPIC_API_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `GOOGLE_PLACES_API_KEY`
- [ ] Custom domain configured (`truespend.org`) with SSL
- [ ] Extension submitted to Chrome Web Store and Firefox Add-ons

### Security
- [ ] Plaid environment set to `production` (not `sandbox`)
- [ ] Stripe live keys active (not test keys)
- [ ] `ANTHROPIC_API_KEY` spend limit set in Anthropic console ($200/month)
- [ ] Supabase RLS verified on every table
- [ ] No API keys in frontend bundle (check with `grep -r "sk-ant\|sk_live" dist/`)

### Legal & Compliance
- [ ] Privacy Policy updated to reflect AI agent data use
- [ ] Affiliate disclosure visible wherever `apply_url` links appear
- [ ] User consent flow covers: Plaid bank linking, location tracking, push notifications
- [ ] GDPR data deletion works end-to-end (delete account → all data purged within 30 days)
- [ ] Terms of Service reviewed by counsel

### Monitoring
- [ ] Sentry project created, DSN added to all surfaces
- [ ] Uptime monitor on `health-check` endpoint (use Better Uptime, free tier)
- [ ] Anthropic API usage alerts configured
- [ ] Stripe payment failure alerts configured

---

## 9. What to Delete

Run these commands to remove the dead code. Claude Code: execute these in Phase 0.

```bash
# Delete dead edge functions (94 functions)
cd supabase/functions

# ML pipeline
rm -rf modal-training-trigger modal-training-callback prepare-training-data
rm -rf schedule-retraining deploy-shadow-model ml-inference
rm -rf huggingface-categorize huggingface-ocr-receipt
rm -rf ab-testing-manager thompson-sampling-budget
rm -rf workflow-executor

# Custom observability
rm -rf metrics-aggregator metrics-collector trace-collector log-collector
rm -rf incident-detector incident-manager slo-manager alert-manager
rm -rf performance-analyzer backup-verification service-health-check
rm -rf redis-metrics extension-telemetry security-audit security-headers

# Custom event streaming
rm -rf event-batch-processor event-consumer publish-event
rm -rf dlq-review retry-processor

# Duplicate auth (Supabase handles natively)
rm -rf mfa-cancel-setup mfa-disable mfa-enable mfa-generate-secret
rm -rf mfa-verify-totp mfa-verify-backup-code mfa-regenerate-backup-codes
rm -rf check-login-attempts increment-login-failures record-login-attempt
rm -rf audit-google-login check-auth-provider check-mfa-status

# Foursquare (duplicate of Google)
rm -rf foursquare-cache-cleanup foursquare-enrich-geofence foursquare-place-details
rm -rf foursquare-places-search foursquare-sync-categories

# Unnecessary
rm -rf generate-timeline-image widget-data seed-admin-user csp-reporter
rm -rf feature-flag-evaluator location-analytics-bff optimize-geofences
rm -rf sign-location-payload verify-location-payload bff-dashboard bff-transactions
rm -rf rate-limiter cache-eviction cache-prewarmer
rm -rf google-maps-directions google-maps-autocomplete google-maps-geocode
rm -rf ai-analyze-spending ai-categorize-transaction auto-categorize-transaction
rm -rf detect-transaction-anomalies generate-budget-recommendations location-insights-ai
rm -rf semantic-search-transactions deploy-shadow-model

# Remove old AI gateway from spending analysis (was calling Lovable/Gemini)
# ai-analyze-spending is deleted above — replaced by ai-agent
```

```bash
# Delete dead frontend files
cd src

# ML pages (entire folder)
rm -rf features/ml/

# Observability pages (replaced by Sentry)  
rm -rf features/observability/

# Old insights hook that called Gemini
rm -f features/insights/components/LocationInsightsPanel.tsx

# Old location analytics (simplified to geofence + notification)
rm -f features/location/components/CacheAnalyticsDashboard.tsx
rm -f features/location/components/GeofenceDebugger.tsx
rm -f features/location/components/TelemetryDashboard.tsx
rm -f features/location/components/SpendingHeatmap.tsx
rm -f features/location/hooks/useCacheAnalytics.ts
rm -f features/location/hooks/useGeofenceMetrics.ts
rm -f features/location/pages/LocationMetrics.tsx
```

---

## 10. Documentation Standards

> All new code written after Phase 0 must meet these standards.

### Edge functions
Every edge function must have a header comment:
```typescript
/**
 * @function function-name
 * @description One sentence what this function does.
 * @trigger HTTP POST | Plaid webhook | Supabase cron (every day at 09:00 UTC)
 * @auth Required — validates Supabase JWT
 * @input { field: type } — describe request body
 * @output { field: type } — describe response shape
 * @calls ai-agent (if applicable) | plaid | stripe | resend
 * @sideEffects writes to: table_name
 */
```

### React components
```typescript
/**
 * RewardsDashboard
 * 
 * Shows monthly rewards earned vs. possible, card efficiency scores,
 * and actionable "Fix this" suggestions.
 * 
 * @requires useAIAgent hook
 * @requires ai_recommendations table (RLS: user sees own rows)
 */
```

### Database migrations
Every migration file must be named: `YYYYMMDD_description.sql`  
First line must be a comment: `-- Migration: description | Author: | Date: | Reversible: yes/no`

### Git commit format
```
type(scope): short description

type: feat | fix | refactor | delete | docs | test
scope: agent | plaid | extension | schema | ui | auth

Examples:
feat(agent): add missed rewards calculation tool
delete(ml): remove modal training pipeline (119→25 functions)
refactor(extension): replace budget view with card suggestions
```

---

## Appendix A: Environment Variables (complete list after cleanup)

```bash
# Supabase (auto-provided in edge functions)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI — The core intelligence
ANTHROPIC_API_KEY          # claude-sonnet-4-6 / claude-opus-4-6

# Bank data
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV                  # sandbox | production

# Billing
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_PRO
STRIPE_PRICE_ID_FAMILY

# Email
RESEND_API_KEY

# Geo
GOOGLE_PLACES_API_KEY

# Error tracking
SENTRY_DSN

# App URL (for extension auth redirect)
VITE_APP_URL               # https://truespend.org
```

## Appendix B: Competitive Moat Summary

| Moat layer | What it is | Why it's hard to copy |
|---|---|---|
| Real transaction data | Plaid-linked, not manual entry | Users won't re-enter cards in a competitor |
| Personalised AI | Agent trained on YOUR actual spending | Static rule engines can't match this |
| Geo push | Right-place, right-time card tip | Requires mobile app + geofencing + AI pipeline |
| Browser extension | Card tip while shopping online | Requires extension review + merchant detection |
| Missed rewards history | Monthly "you left $X" digest | Requires 90 days of transaction history |
| Network effects (later) | Anonymous benchmarks: "Users like you earn X more" | Requires scale |

---

*End of BUILD_PLAN.md — v2.0*
