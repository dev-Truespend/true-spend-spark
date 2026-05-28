/**
 * catalog
 *
 * Typed table accessors for the rewards source-of-truth tables that aren't
 * yet present in the auto-generated supabase/types.ts. Use these instead of
 * `supabase.from('card_catalog' as any)` so the query result is strongly
 * typed.
 *
 * Example:
 *   const { data } = await catalogTable.cardCatalog()
 *     .select('id, card_name, issuer')
 *     .eq('verification_status', 'verified');
 *   // data is CardCatalogRow[] | null
 */

import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { supabase } from "./client";
import type {
  CardCatalogRow,
  CardRewardRuleRow,
  UserCreditCardRow,
  UserCardRewardOverrideRow,
  CardSignupBonusRow,
  CardUserFeedbackRow,
  CatalogUpdateReviewRow,
  MerchantDomainRow,
  ExtensionEventRow,
} from "./catalog-types";

// The Supabase client is typed to the auto-generated Database, which does not
// include the rewards tables yet. We cast once here so consumers get fully
// typed query builders for the new tables.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Builder<Row> = PostgrestFilterBuilder<Record<string, never>, Row, Row[], string, unknown>;

export const catalogTable = {
  cardCatalog: () => db.from("card_catalog") as Builder<CardCatalogRow>,
  cardRewardRules: () => db.from("card_reward_rules") as Builder<CardRewardRuleRow>,
  userCreditCards: () => db.from("user_credit_cards") as Builder<UserCreditCardRow>,
  userCardRewardOverrides: () =>
    db.from("user_card_reward_overrides") as Builder<UserCardRewardOverrideRow>,
  cardSignupBonuses: () => db.from("card_signup_bonuses") as Builder<CardSignupBonusRow>,
  cardUserFeedback: () => db.from("card_user_feedback") as Builder<CardUserFeedbackRow>,
  catalogUpdateReviews: () =>
    db.from("catalog_update_reviews") as Builder<CatalogUpdateReviewRow>,
  merchantDomains: () => db.from("merchant_domains") as Builder<MerchantDomainRow>,
  extensionEvents: () => db.from("extension_events") as Builder<ExtensionEventRow>,
};

export type * from "./catalog-types";
