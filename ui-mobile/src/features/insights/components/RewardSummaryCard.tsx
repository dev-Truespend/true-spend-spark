import { View } from "react-native";
import { StatCard } from "@/shared/components/StatCard";
import { RewardsSummary } from "@/features/insights/types/analytics.types";

type Props = { summary: RewardsSummary };

function deltaText(display: string, amount: number): string | undefined {
  if (amount === 0) return undefined;
  return `${amount > 0 ? "+" : ""}${display} vs prior`;
}

export function RewardSummaryCard({ summary }: Props) {
  const earnedDelta = deltaText(summary.earnedDelta.display, summary.earnedDelta.amount);
  const missedDelta = deltaText(summary.missedDelta.display, summary.missedDelta.amount);

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <StatCard
        label="Earned"
        value={summary.earned.display}
        delta={earnedDelta}
        deltaTone={summary.earnedDelta.amount >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Missed"
        value={summary.missed.display}
        delta={missedDelta}
        deltaTone={summary.missedDelta.amount <= 0 ? "positive" : "negative"}
      />
    </View>
  );
}
