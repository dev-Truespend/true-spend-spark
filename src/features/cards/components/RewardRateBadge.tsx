import { Badge } from "@/components/ui/badge";
import { formatRewardRate } from "@/shared/lib/rewardsMath";
import type { RewardUnit } from "@/shared/types/rewards";

export function RewardRateBadge({ rate, unit }: { rate: number; unit: RewardUnit }) {
  return <Badge variant="secondary">{formatRewardRate(rate, unit)}</Badge>;
}
