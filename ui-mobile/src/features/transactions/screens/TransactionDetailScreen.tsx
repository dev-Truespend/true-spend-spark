import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/components/Badge";
import { Card } from "@/shared/components/Card";
import { Screen } from "@/shared/components/Screen";
import { RewardRow } from "@/shared/components/RewardRow";
import { Toast } from "@/shared/components/Toast";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useTransactionDetail } from "@/features/transactions/hooks/useTransactionDetail";
import { useMarkNotAMiss } from "@/features/transactions/hooks/useMarkNotAMiss";
import { MissedRewardBanner } from "@/features/transactions/components/MissedRewardBanner";

export function TransactionDetailScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const router = useRouter();
  const { transaction, rewardResult, missedReward, isLoading, error } = useTransactionDetail(transactionId);
  const markNotAMiss = useMarkNotAMiss();

  if (isLoading) {
    return <Screen><ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} /></Screen>;
  }
  if (error || !transaction) {
    return <Screen><Toast tone="error" message={error ?? "Transaction not found."} /></Screen>;
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Transaction</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.hero}>
        <View style={styles.iconBox}>
          <Text style={styles.iconGlyph}>🛍️</Text>
        </View>
        <Text style={styles.merchant}>{transaction.merchantName}</Text>
        <Text style={styles.meta}>
          {transaction.transactionDate}
          {transaction.transactionTime ? ` · ${transaction.transactionTime}` : ""}
          {transaction.locationLabel ? ` · ${transaction.locationLabel}` : ""}
        </Text>
        <Text style={styles.amount}>{transaction.amount.formatted}</Text>
        {missedReward ? (
          <View style={{ marginTop: 6 }}>
            <Badge tone="amber" label={`Missed +${missedReward.missedReward.formatted} in rewards`} />
          </View>
        ) : null}
        {transaction.isPending ? (
          <View style={{ marginTop: 6 }}>
            <Badge tone="muted" label="Pending" />
          </View>
        ) : null}
      </View>

      <Card padded={false}>
        <View style={{ paddingHorizontal: 14 }}>
          <RewardRow
            iconLabel="💳"
            iconTone="blue"
            label="Card used"
            multiplier={
              transaction.card.lastFour
                ? `${transaction.card.displayName} ••${transaction.card.lastFour}`
                : transaction.card.displayName
            }
            multiplierTone="muted"
          />
          <RewardRow
            iconLabel="🏷️"
            iconTone="purple"
            label="Category"
            multiplier={transaction.categoryName ?? "Uncategorized"}
            multiplierTone="muted"
          />
          {rewardResult ? (
            <RewardRow
              iconLabel="⭐"
              iconTone="amber"
              label="Earned"
              multiplier={`${rewardResult.earnedAmount.formatted} (${rewardResult.earnedRate}×)`}
              multiplierTone="amber"
            />
          ) : null}
          <RewardRow
            iconLabel="📥"
            iconTone="muted"
            label="Source"
            multiplier={transaction.source}
            multiplierTone="muted"
            divider={false}
          />
        </View>
      </Card>

      {missedReward && !missedReward.isDismissed ? (
        <MissedRewardBanner
          missedReward={missedReward}
          onDismiss={(mid) => markNotAMiss.mutate(mid)}
        />
      ) : null}
    </Screen>
  );
}

const useStyles = () =>
  useThemedStyles((t) =>
    StyleSheet.create({
      topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
      iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
      topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
      hero: { alignItems: "center", paddingVertical: 16, gap: 6 },
      iconBox: {
        width: 64,
        height: 64,
        borderRadius: radii.xxl,
        backgroundColor: t.tints.amber.bg,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4
      },
      iconGlyph: { fontSize: scaleFont(26) },
      merchant: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(18), color: t.colors.text },
      meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: t.colors.mutedFg, marginTop: 2, textAlign: "center" },
      amount: {
        fontFamily: fontFamily.heavy,
        fontWeight: "800",
        fontSize: scaleFont(32),
        color: t.colors.text,
        letterSpacing: -0.8,
        marginTop: 8
      }
    })
  );

/* region: archive — manual transaction edit/delete actions (removed from MVP)
 *
 * The "Edit" and "Delete" buttons under the detail body previously routed to
 * /transactions/[id]/edit and called useDeleteTransaction. With manual entry
 * removed, only mark-not-a-miss remains as a user action on this screen.
 *
 *   import { Alert } from "react-native";
 *   import { Button } from "@/shared/components/Button";
 *   import { SectionLabel } from "@/shared/components/SectionLabel";
 *   import { useDeleteTransaction } from "@/features/transactions/hooks/useDeleteTransaction";
 *
 *   const deleteMutation = useDeleteTransaction();
 *
 *   function handleDelete() {
 *     Alert.alert("Delete transaction", "This cannot be undone.", [
 *       { text: "Cancel", style: "cancel" },
 *       {
 *         text: "Delete",
 *         style: "destructive",
 *         onPress: async () => {
 *           await deleteMutation.mutateAsync(transactionId);
 *           router.back();
 *         }
 *       }
 *     ]);
 *   }
 *
 *   // Below the missed-reward banner:
 *   <SectionLabel>Actions</SectionLabel>
 *   <View style={styles.actionGrid}>
 *     <View style={{ flex: 1 }}>
 *       <Button
 *         label="Edit"
 *         variant="outline"
 *         onPress={() => router.push(`/(app)/transactions/${transactionId}/edit`)}
 *       />
 *     </View>
 *     <View style={{ flex: 1 }}>
 *       <Button label="Delete" variant="danger" onPress={handleDelete} disabled={deleteMutation.isPending} />
 *     </View>
 *   </View>
 *
 *   // styles:
 *   actionGrid: { flexDirection: "row", gap: 8 }
 *
 * endregion */
