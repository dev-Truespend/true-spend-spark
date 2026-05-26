import { Card, CardContent } from "@/components/ui/card";
import { RewardRateBadge } from "./RewardRateBadge";
import type { RewardUnit } from "@/shared/types/rewards";

export interface RewardRuleListItem {
  id?: string;
  category: string;
  reward_rate: number;
  reward_unit: RewardUnit;
  cap_amount_cents?: number | null;
  cap_period?: string | null;
  requires_activation?: boolean | null;
  status?: string | null;
}

export function RewardRuleList({ rules }: { rules: RewardRuleListItem[] }) {
  if (!rules.length) {
    return <p className="text-sm text-muted-foreground">No reward rules are configured yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {rules.map((rule, index) => (
        <Card key={rule.id ?? `${rule.category}-${index}`} className="border-muted">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium capitalize">{rule.category}</p>
              <p className="text-sm text-muted-foreground">
                {rule.requires_activation ? "Activation required" : "Automatic"} · {rule.status ?? "needs_review"}
              </p>
            </div>
            <RewardRateBadge rate={Number(rule.reward_rate)} unit={rule.reward_unit} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
