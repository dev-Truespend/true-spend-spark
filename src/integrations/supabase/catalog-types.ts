/**
 * catalog-types
 *
 * Strongly-typed Row/Insert/Update shapes for the rewards source-of-truth
 * tables introduced in migrations 20260526090001 (codex foundation) and
 * 20260527000100 (catalog extras). These tables are not yet present in the
 * auto-generated types.ts file from Supabase CLI, so every consumer was
 * previously casting `supabase as any`. This module replaces those casts.
 *
 * When `supabase gen types typescript --linked` is run, these can be deleted
 * and the generated Database type used directly.
 */

import type { Json } from "./types";

// ── card_catalog ────────────────────────────────────────────────────────────
export interface CardCatalogRow {
  id: string;
  issuer: string;
  card_name: string;
  card_slug: string;
  network: "visa" | "mastercard" | "amex" | "discover" | "other" | null;
  card_type: "personal" | "business";
  rewards_currency: "cashback" | "points" | "miles" | "none" | null;
  rewards_program: string | null;
  annual_fee_cents: number;
  foreign_transaction_fee: boolean;
  base_reward_rate: number;
  base_reward_unit: "percent" | "points_per_dollar" | "miles_per_dollar";
  recommended_credit_score_min: number | null;
  official_product_url: string | null;
  official_terms_url: string | null;
  is_active: boolean;
  verification_status: "unverified" | "needs_review" | "verified" | "deprecated";
  last_verified_at: string | null;
  last_checked_at: string | null;
  last_extraction_status: string | null;
  last_extraction_error: string | null;
  last_extraction_confidence: number | null;
  pending_change_count: number | null;
  created_at: string;
  updated_at: string;
}

export type CardCatalogInsert = Partial<CardCatalogRow> &
  Pick<CardCatalogRow, "issuer" | "card_name" | "card_slug">;
export type CardCatalogUpdate = Partial<CardCatalogRow>;

// ── card_reward_rules ───────────────────────────────────────────────────────
export interface CardRewardRuleRow {
  id: string;
  card_catalog_id: string;
  category: string;
  reward_rate: number;
  reward_unit: "percent" | "points_per_dollar" | "miles_per_dollar";
  applies_to: string | null;
  merchant_scope: string;
  cap_amount_cents: number | null;
  cap_period: "monthly" | "quarterly" | "yearly" | "lifetime" | "none" | null;
  after_cap_rate: number | null;
  requires_activation: boolean;
  valid_from: string | null;
  valid_until: string | null;
  exclusion_notes: string | null;
  source_url: string;
  confidence_score: number;
  status: "draft" | "proposed" | "verified" | "needs_review" | "retired";
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type CardRewardRuleInsert = Partial<CardRewardRuleRow> &
  Pick<CardRewardRuleRow, "card_catalog_id" | "category" | "reward_rate" | "reward_unit" | "source_url">;
export type CardRewardRuleUpdate = Partial<CardRewardRuleRow>;

// ── user_credit_cards ───────────────────────────────────────────────────────
export interface UserCreditCardRow {
  id: string;
  user_id: string;
  card_catalog_id: string | null;
  display_name: string;
  issuer: string | null;
  network: string | null;
  last4: string | null;
  is_active: boolean;
  rewards_confirmed_by_user: boolean;
  plaid_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export type UserCreditCardInsert = Partial<UserCreditCardRow> &
  Pick<UserCreditCardRow, "user_id" | "display_name">;
export type UserCreditCardUpdate = Partial<UserCreditCardRow>;

// ── user_card_reward_overrides ─────────────────────────────────────────────
export interface UserCardRewardOverrideRow {
  id: string;
  user_id: string;
  user_credit_card_id: string;
  category: string;
  reward_rate: number;
  reward_unit: "percent" | "points_per_dollar" | "miles_per_dollar";
  applies_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── card_signup_bonuses (added in 20260527000100) ──────────────────────────
export interface CardSignupBonusRow {
  id: string;
  card_catalog_id: string;
  bonus_description: string;
  bonus_value_cents: number | null;
  spend_requirement_cents: number | null;
  window_days: number | null;
  status: "proposed" | "verified" | "retired";
  source_url: string | null;
  extracted_by: string | null;
  verified_by: string | null;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
}

// ── card_user_feedback (added in 20260527000100) ───────────────────────────
export type CardFeedbackType = "correct" | "incorrect" | "outdated" | "special_offer" | "other";

export interface CardUserFeedbackRow {
  id: string;
  user_id: string;
  card_catalog_id: string | null;
  card_reward_rule_id: string | null;
  feedback_type: CardFeedbackType;
  note: string | null;
  status: "new" | "reviewed" | "applied" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ── catalog_update_reviews ──────────────────────────────────────────────────
export type CatalogChangeType =
  | "reward_rate_change"
  | "cap_change"
  | "applies_to_change"
  | "new_rule"
  | "removed_rule"
  | "fee_change"
  | "bonus_change";

export interface CatalogUpdateReviewRow {
  id: string;
  card_catalog_id: string | null;
  change_type: CatalogChangeType | string;
  old_data: Json | null;
  new_data: Json;
  source_url: string | null;
  detected_by: "manual" | "ai_agent" | "admin" | "system";
  status: "proposed" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ── merchant_domains ────────────────────────────────────────────────────────
export interface MerchantDomainRow {
  id: string;
  domain: string;
  merchant_name: string;
  normalized_category: string;
  subcategory: string | null;
  confidence_score: number;
  detection_source: "manual" | "ai" | "plaid" | "google_places" | "user_report" | "seed";
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ── extension_events ────────────────────────────────────────────────────────
export interface ExtensionEventRow {
  id: string;
  user_id: string | null;
  domain: string;
  merchant_name: string | null;
  normalized_category: string | null;
  event_type: string;
  recommendation_id: string | null;
  metadata: Json;
  created_at: string;
}
