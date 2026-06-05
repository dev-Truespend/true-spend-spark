import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { Transaction } from "@/features/transactions/types/transactions.types";

type Props = {
  transaction: Transaction;
  onPress: (id: number) => void;
};

export function TransactionListItem({ transaction, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(transaction.id)}>
      <View style={styles.left}>
        <Text style={styles.merchant} numberOfLines={1}>{transaction.merchantName}</Text>
        <Text style={styles.meta}>
          {transaction.categoryName ?? transaction.categoryCode ?? "Uncategorized"} · {transaction.transactionDate}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{transaction.amount.formatted}</Text>
        {transaction.missedReward ? (
          <Text style={styles.missed}>−{transaction.missedReward.formatted}</Text>
        ) : transaction.earnedReward ? (
          <Text style={styles.earned}>+{transaction.earnedReward.formatted}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  left: {
    flex: 1,
    gap: spacing.xs,
    marginRight: spacing.sm
  },
  right: {
    alignItems: "flex-end",
    gap: spacing.xs
  },
  merchant: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600"
  },
  meta: {
    color: colors.muted,
    fontSize: 13
  },
  amount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  earned: {
    color: colors.primary,
    fontSize: 12
  },
  missed: {
    color: colors.danger,
    fontSize: 12
  }
});
