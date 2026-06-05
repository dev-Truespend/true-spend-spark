import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useTransactionsList } from "@/features/transactions/hooks/useTransactionsList";
import { TransactionListItem } from "@/features/transactions/components/TransactionListItem";
import { Transaction } from "@/features/transactions/types/transactions.types";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useCatalogCategories } from "@/features/catalog/hooks/useCatalogCategories";
import { useSyncPlaidTransactions } from "@/features/plaid/hooks/useSyncPlaidTransactions";
import { QueryKeys } from "@/shared/constants/QueryKeys";
import { useDebounce } from "@/shared/hooks/useDebounce";

type Props = { embedded?: boolean };

type Filters = { q?: string; categoryCode?: string; cardId?: number };

export function TransactionsContent({ embedded }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryCode, setCategoryCode] = useState<string | undefined>(undefined);
  const [cardId, setCardId] = useState<number | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 300);

  const filters: Filters = useMemo(() => {
    const next: Filters = {};
    if (debouncedSearch.trim()) next.q = debouncedSearch.trim();
    if (categoryCode) next.categoryCode = categoryCode;
    if (cardId) next.cardId = cardId;
    return next;
  }, [debouncedSearch, categoryCode, cardId]);

  const { transactions, emptyState, isLoading, error } = useTransactionsList(
    Object.keys(filters).length ? filters : undefined
  );
  const { cards } = useCardsList();
  const categoriesQuery = useCatalogCategories();
  const categories = categoriesQuery.data?.data?.categories ?? [];
  const syncTransactions = useSyncPlaidTransactions();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      try {
        await syncTransactions.mutateAsync({});
      } catch {
        // ignore provider failure; continue refreshing local cache
      }
      await queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
    } finally {
      setRefreshing(false);
    }
  }, [syncTransactions, queryClient]);

  const handlePress = useCallback((id: number) => {
    router.push(`/(app)/transactions/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Transaction }) => (
    <TransactionListItem transaction={item} onPress={handlePress} />
  ), [handlePress]);

  return (
    <View style={[styles.container, embedded && styles.embedded]}>
      <View style={styles.header}>
        {!embedded ? <Text style={styles.title}>Transactions</Text> : null}
        <TouchableOpacity onPress={() => router.push("/(app)/transactions/new")} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        onChangeText={setSearch}
        placeholder="Search merchant or description"
        value={search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Chip label="All categories" active={!categoryCode} onPress={() => setCategoryCode(undefined)} />
        {categories.map((c) => (
          <Chip
            key={c.code}
            label={c.displayName}
            active={categoryCode === c.code}
            onPress={() => setCategoryCode(categoryCode === c.code ? undefined : c.code)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Chip label="All cards" active={!cardId} onPress={() => setCardId(undefined)} />
        {cards.map((c) => (
          <Chip
            key={c.id}
            label={c.lastFour ? `${c.displayName} ···${c.lastFour}` : c.displayName}
            active={cardId === c.id}
            onPress={() => setCardId(cardId === c.id ? undefined : c.id)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : emptyState && Object.keys(filters).length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transactions yet.</Text>
          <Text style={styles.emptyMeta}>Add a manual transaction or connect a card to import.</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transactions match your filters.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function TransactionsScreen() {
  return (
    <Screen>
      <TransactionsContent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  embedded: {},
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.sm
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 28,
    fontWeight: "800"
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  addBtnText: {
    color: colors.primaryText,
    fontWeight: "700"
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  chipLabelActive: { color: colors.primaryText },
  loader: {
    marginTop: spacing.xl
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl
  },
  emptyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  emptyMeta: {
    color: colors.muted,
    textAlign: "center"
  },
  error: {
    color: colors.danger
  }
});
