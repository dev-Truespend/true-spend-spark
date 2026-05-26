import type { NormalizedCategory, RewardUnit } from './rewards';

export interface CardCatalog {
  id: string;
  issuer: string;
  card_name: string;
  card_slug: string;
  network: string | null;
  rewards_currency: string | null;
  rewards_program: string | null;
  annual_fee_cents: number;
  base_reward_rate: number;
  base_reward_unit: RewardUnit;
  verification_status: string;
}

export interface CardRewardRule {
  id: string;
  card_catalog_id: string;
  category: NormalizedCategory | string;
  reward_rate: number;
  reward_unit: RewardUnit;
  cap_amount_cents?: number | null;
  cap_period?: string | null;
  requires_activation?: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  status: string;
}

export interface UserCreditCard {
  id: string;
  user_id: string;
  card_catalog_id?: string | null;
  display_name: string;
  issuer?: string | null;
  network?: string | null;
  last4?: string | null;
  is_active: boolean;
  rewards_confirmed_by_user: boolean;
}

export interface CardSignupBonus {
  id: string;
  card_catalog_id: string;
  bonus_description: string;
  bonus_value_cents: number | null;
  spend_requirement_cents: number | null;
  window_days: number | null;
  status: 'proposed' | 'verified' | 'retired';
  source_url: string | null;
  effective_from: string | null;
  effective_until: string | null;
}

export type CardFeedbackType =
  | 'correct'
  | 'incorrect'
  | 'outdated'
  | 'special_offer'
  | 'other';

export interface CardUserFeedback {
  id: string;
  user_id: string;
  card_catalog_id: string | null;
  card_reward_rule_id: string | null;
  feedback_type: CardFeedbackType;
  note: string | null;
  status: 'new' | 'reviewed' | 'applied' | 'dismissed';
  created_at: string;
}

export interface CatalogExtractionResult {
  card_id: string;
  mode: 'extract' | 'refresh';
  page_status: number;
  page_chars: number;
  extraction_confidence: number;
  proposed_rule_count: number;
  change_count: number;
  extraction_notes: string | null;
}
