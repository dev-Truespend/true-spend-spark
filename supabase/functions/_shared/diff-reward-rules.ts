/**
 * diff-reward-rules
 *
 * Compares the previously verified set of reward rules / annual fee / signup
 * bonus against a freshly extracted set. Emits typed change records that can
 * be inserted into catalog_update_reviews for admin approval.
 *
 * The diff is intentionally conservative: small numerical drift (<= 0.1 on
 * reward_rate, <= $1 on cap_amount) is ignored to avoid flooding the queue
 * with noise from copy edits.
 */

export type RewardUnit = "percent" | "points_per_dollar" | "miles_per_dollar";

export interface ExtractedRule {
  category: string;
  reward_rate: number;
  reward_unit: RewardUnit;
  applies_to?: string | null;
  cap_amount_cents?: number | null;
  cap_period?: "monthly" | "quarterly" | "yearly" | "lifetime" | null;
  is_base_rate?: boolean;
  source_url?: string | null;
  notes?: string | null;
}

export interface ExtractedBonus {
  description: string;
  estimated_value_cents?: number | null;
  spend_requirement_cents?: number | null;
  window_days?: number | null;
}

export interface ExtractionSnapshot {
  annual_fee_cents?: number | null;
  reward_rules: ExtractedRule[];
  signup_bonus?: ExtractedBonus | null;
  extraction_confidence?: number;
}

export type ChangeType =
  | "reward_rate_change"
  | "cap_change"
  | "applies_to_change"
  | "new_rule"
  | "removed_rule"
  | "fee_change"
  | "bonus_change";

export interface RuleChange {
  change_type: ChangeType;
  field_changed: string;
  category?: string;
  old_value: unknown;
  new_value: unknown;
  change_confidence: number;
  source_url?: string | null;
}

const RATE_TOLERANCE = 0.1; // 4.0 -> 4.05 is not a real change
const CAP_TOLERANCE_CENTS = 100; // $1 of wiggle room

function keyForRule(rule: ExtractedRule): string {
  return `${rule.category.toLowerCase()}::${rule.is_base_rate ? "base" : "category"}`;
}

function approxEqual(a: number | null | undefined, b: number | null | undefined, tol: number): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tol;
}

function shallowStringEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/**
 * Compares two extraction snapshots and returns a list of changes worth
 * surfacing to admins. Confidence on each change is bounded by the
 * extraction confidence — a low-confidence extraction never produces a
 * high-confidence change.
 */
export function diffRewardRules(
  oldSnapshot: ExtractionSnapshot,
  newSnapshot: ExtractionSnapshot,
): RuleChange[] {
  const confidence = Math.max(0, Math.min(1, newSnapshot.extraction_confidence ?? 0.7));
  const changes: RuleChange[] = [];
  const sourceUrl = newSnapshot.reward_rules[0]?.source_url ?? null;

  // annual fee
  if (!approxEqual(oldSnapshot.annual_fee_cents ?? null, newSnapshot.annual_fee_cents ?? null, 0)) {
    changes.push({
      change_type: "fee_change",
      field_changed: "annual_fee_cents",
      old_value: oldSnapshot.annual_fee_cents ?? null,
      new_value: newSnapshot.annual_fee_cents ?? null,
      change_confidence: confidence,
      source_url: sourceUrl,
    });
  }

  // rule-level diff (keyed by category + base-rate flag)
  const oldByKey = new Map(oldSnapshot.reward_rules.map((r) => [keyForRule(r), r] as const));
  const newByKey = new Map(newSnapshot.reward_rules.map((r) => [keyForRule(r), r] as const));

  for (const [key, newRule] of newByKey) {
    const oldRule = oldByKey.get(key);
    if (!oldRule) {
      changes.push({
        change_type: "new_rule",
        field_changed: "reward_rule",
        category: newRule.category,
        old_value: null,
        new_value: newRule,
        change_confidence: confidence,
        source_url: newRule.source_url ?? sourceUrl,
      });
      continue;
    }

    if (!approxEqual(oldRule.reward_rate, newRule.reward_rate, RATE_TOLERANCE)) {
      changes.push({
        change_type: "reward_rate_change",
        field_changed: "reward_rate",
        category: newRule.category,
        old_value: { rate: oldRule.reward_rate, unit: oldRule.reward_unit },
        new_value: { rate: newRule.reward_rate, unit: newRule.reward_unit },
        change_confidence: confidence,
        source_url: newRule.source_url ?? sourceUrl,
      });
    }

    if (
      !approxEqual(oldRule.cap_amount_cents ?? null, newRule.cap_amount_cents ?? null, CAP_TOLERANCE_CENTS) ||
      (oldRule.cap_period ?? null) !== (newRule.cap_period ?? null)
    ) {
      changes.push({
        change_type: "cap_change",
        field_changed: "cap_amount_cents",
        category: newRule.category,
        old_value: { amount_cents: oldRule.cap_amount_cents, period: oldRule.cap_period },
        new_value: { amount_cents: newRule.cap_amount_cents, period: newRule.cap_period },
        change_confidence: confidence,
        source_url: newRule.source_url ?? sourceUrl,
      });
    }

    if (!shallowStringEqual(oldRule.applies_to ?? null, newRule.applies_to ?? null)) {
      changes.push({
        change_type: "applies_to_change",
        field_changed: "applies_to",
        category: newRule.category,
        old_value: oldRule.applies_to ?? null,
        new_value: newRule.applies_to ?? null,
        change_confidence: confidence * 0.8, // wording shifts are noisier
        source_url: newRule.source_url ?? sourceUrl,
      });
    }
  }

  for (const [key, oldRule] of oldByKey) {
    if (!newByKey.has(key)) {
      changes.push({
        change_type: "removed_rule",
        field_changed: "reward_rule",
        category: oldRule.category,
        old_value: oldRule,
        new_value: null,
        change_confidence: confidence,
        source_url: sourceUrl,
      });
    }
  }

  // signup bonus
  const oldBonus = oldSnapshot.signup_bonus ?? null;
  const newBonus = newSnapshot.signup_bonus ?? null;
  if (oldBonus || newBonus) {
    const sameDescription = shallowStringEqual(oldBonus?.description ?? null, newBonus?.description ?? null);
    const sameValue = approxEqual(
      oldBonus?.estimated_value_cents ?? null,
      newBonus?.estimated_value_cents ?? null,
      500,
    );
    const sameSpend = approxEqual(
      oldBonus?.spend_requirement_cents ?? null,
      newBonus?.spend_requirement_cents ?? null,
      500,
    );
    const sameWindow = (oldBonus?.window_days ?? null) === (newBonus?.window_days ?? null);

    if (!(sameDescription && sameValue && sameSpend && sameWindow)) {
      changes.push({
        change_type: "bonus_change",
        field_changed: "signup_bonus",
        old_value: oldBonus,
        new_value: newBonus,
        change_confidence: confidence,
        source_url: sourceUrl,
      });
    }
  }

  return changes;
}
