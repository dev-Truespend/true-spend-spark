import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useTransactionDetail } from "@/features/transactions/hooks/useTransactionDetail";
import { useDeleteTransaction } from "@/features/transactions/hooks/useDeleteTransaction";
import { useMarkNotAMiss } from "@/features/transactions/hooks/useMarkNotAMiss";
import { MissedRewardBanner } from "@/features/transactions/components/MissedRewardBanner";

export function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const router = useRouter();
  const { transaction, rewardResult, missedReward, isLoading, error } = useTransactionDetail(transactionId);
  const deleteMutation = useDeleteTransaction();
  const markNotAMiss = useMarkNotAMiss();

  function handleDelete() {
    Alert.alert("Delete transaction", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMutation.mutateAsync(transactionId);
          router.back();
        }
      }
    ]);
  }

  if (isLoading) return <Screen><ActivityIndicator color={colors.primary} style={styles.loader} /></Screen>;
  if (error || !transaction) return <Screen><Text style={styles.error}>{error ?? "Transaction not found."}</Text></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.merchant}>{transaction.merchantName}</Text>
        <Text style={styles.amount}>{transaction.amount.formatted}</Text>
        <Text style={styles.meta}>{transaction.transactionDate} · {transaction.card.displayName}</Text>
        {transaction.categoryName ? <Text style={styles.meta}>{transaction.categoryName}</Text> : null}
        {transaction.locationLabel ? <Text style={styles.meta}>{transaction.locationLabel}</Text> : null}
        {transaction.isPending ? <Text style={styles.pending}>Pending</Text> : null}

        {rewardResult ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward earned</Text>
            <Text style={styles.rewardAmount}>{rewardResult.earnedAmount.formatted}</Text>
            <Text style={styles.meta}>{rewardResult.earnedRate.toFixed(rewardResult.earnedRate % 1 === 0 ? 0 : 1)}x earn rate</Text>
          </View>
        ) : null}

        {missedReward && !missedReward.isDismissed ? (
          <MissedRewardBanner
            missedReward={missedReward}
            onDismiss={(mid) => markNotAMiss.mutate(mid)}
          />
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/(app)/transactions/${transactionId}/edit`)}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xl },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  merchant: { color: colors.text, fontSize: 24, fontWeight: "800" },
  amount: { color: colors.text, fontSize: 32, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 14 },
  pending: { color: colors.muted, fontSize: 13, fontStyle: "italic" },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  rewardAmount: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  editBtn: { backgroundColor: colors.primary, borderRadius: 8, flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  editBtnText: { color: colors.primaryText, fontWeight: "700" },
  deleteBtn: { backgroundColor: colors.surface, borderColor: colors.danger, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  deleteBtnText: { color: colors.danger, fontWeight: "700" },
  error: { color: colors.danger }
});
