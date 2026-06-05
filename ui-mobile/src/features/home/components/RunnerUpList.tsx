import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type RunnerUp = {
  card: { id: number; displayName: string };
  expectedReward: { display: string };
  rank: number;
};

type Props = { runnerUps: RunnerUp[] };

export function RunnerUpList({ runnerUps }: Props) {
  if (runnerUps.length === 0) return null;
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Runner-up cards</Text>
      {runnerUps.map((runnerUp) => (
        <Text key={runnerUp.card.id} style={styles.body}>
          {runnerUp.rank}. {runnerUp.card.displayName} · {runnerUp.expectedReward.display}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 }
});
