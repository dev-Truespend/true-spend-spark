export interface CardRecommendation {
  best_card: {
    user_credit_card_id: string;
    card_name: string;
    reward_rate: number;
    reward_unit: string;
    reward_label: string;
    estimated_value_cents: number;
  } | null;
  alternatives: Array<{
    user_credit_card_id: string;
    card_name: string;
    reward_rate: number;
    reward_unit: string;
    reward_label: string;
    estimated_value_cents: number;
  }>;
  confidence_score: number;
  reason_codes: string[];
}
