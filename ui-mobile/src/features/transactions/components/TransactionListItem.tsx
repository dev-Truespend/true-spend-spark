import { StyleSheet, Text, View } from "react-native";
import { Transaction } from "@/features/transactions/types/transactions.types";
import { ListItem } from "@/shared/components/ListItem";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { TintName } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  transaction: Transaction;
  onPress: (id: number) => void;
};

const CATEGORY_TONE: Record<string, { tone: TintName; icon: string }> = {
  dining:    { tone: "amber",  icon: "🍽️" },
  coffee:    { tone: "blue",   icon: "☕" },
  groceries: { tone: "purple", icon: "🥦" },
  travel:    { tone: "teal",   icon: "✈️" },
  rideshare: { tone: "teal",   icon: "🚗" },
  gas:       { tone: "red",    icon: "⛽" },
  online:    { tone: "amber",  icon: "📦" },
  electronics: { tone: "blue", icon: "📱" },
  streaming: { tone: "purple", icon: "🎬" },
  default:   { tone: "muted",  icon: "💳" }
};

function tone(code?: string | null) {
  if (!code) return CATEGORY_TONE.default!;
  return CATEGORY_TONE[code] ?? CATEGORY_TONE.default!;
}

export function TransactionListItem({ transaction, onPress }: Props) {
  const styles = useStyles();
  const t = tone(transaction.categoryCode);
  const cardLabel = transaction.card.lastFour
    ? `${transaction.card.displayName} ••${transaction.card.lastFour}`
    : transaction.card.displayName;
  const time = transaction.transactionTime ?? "";
  const missed = transaction.missedReward;
  const earned = transaction.earnedReward;

  return (
    <View style={transaction.isPending && styles.pending}>
      <ListItem
        title={transaction.merchantName}
        subtitle={`${cardLabel}${time ? ` · ${time}` : ""}`}
        meta={
          missed
            ? `Missed +${missed.formatted} in rewards`
            : earned
              ? `+${earned.formatted}`
              : transaction.categoryName ?? ""
        }
        amount={transaction.amount.formatted}
        amountTone={missed ? "destructive" : "default"}
        iconLabel={t.icon}
        iconTone={missed ? "amber" : t.tone}
        onPress={() => onPress(transaction.id)}
      />
      {transaction.isPending ? <Text style={styles.pendingLabel}>Pending sync</Text> : null}
    </View>
  );
}

const useStyles = () =>
  useThemedStyles((theme) =>
    StyleSheet.create({
      pending: { opacity: 0.65 },
      pendingLabel: {
        fontFamily: fontFamily.medium,
        fontSize: scaleFont(10),
        color: theme.colors.mutedFg,
        marginLeft: 46,
        marginTop: -6,
        marginBottom: 4
      }
    })
  );
