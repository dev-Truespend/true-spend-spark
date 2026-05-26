import { Badge } from "@/components/ui/badge";
import { formatRewardValue } from "@/shared/lib/rewardsMath";

export function AnnualFeeBadge({ cents }: { cents: number }) {
  return (
    <Badge variant={cents > 0 ? "outline" : "secondary"}>
      {cents > 0 ? `${formatRewardValue(cents)} annual fee` : "No annual fee"}
    </Badge>
  );
}
