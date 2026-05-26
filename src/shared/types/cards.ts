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
