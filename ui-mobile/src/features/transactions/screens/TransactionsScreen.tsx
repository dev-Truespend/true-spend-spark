import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/components/Card";
import { Chip } from "@/shared/components/Chip";
import { EmptyState } from "@/shared/components/EmptyState";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { TextInput } from "@/shared/components/TextInput";
import { Toast } from "@/shared/components/Toast";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useTransactionsList } from "@/features/transactions/hooks/useTransactionsList";
import { TransactionListItem } from "@/features/transactions/components/TransactionListItem";
import { Transaction } from "@/features/transactions/types/transactions.types";
import { useCardsList } from "@/features/cards/hooks/useCardsList";
import { useTransactionCategories } from "@/features/transactions/hooks/useTransactionCategories";
import { useSyncPlaidTransactions } from "@/features/plaid/hooks/useSyncPlaidTransactions";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { QueryKeys } from "@/shared/constants/QueryKeys";
import { useDebounce } from "@/shared/hooks/useDebounce";

type Props = { embedded?: boolean };

type Filters = { q?: string; categoryCode?: string; cardId?: number };

function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const buckets = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = t.transactionDate;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }
  return Array.from(buckets.entries());
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

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

  const { transactions: rawTransactions, emptyState, isLoading, error } = useTransactionsList(
    Object.keys(filters).length ? filters : undefined
  );
  const { cards } = useCardsList();
  const categoriesQuery = useTransactionCategories();
  const categories = categoriesQuery.data?.data?.categories ?? [];
  const syncTransactions = useSyncPlaidTransactions();
  const gate = useEntitlementGate();
  const plaidViewEnabled = gate.has("plaid_transactions_view_enabled");

  // Defensive client filter: when the user lacks plaid_transactions_view_enabled
  // (e.g. trial ended mid-session, stale cache), drop any plaid-sourced rows so
  // Basic users never see Pro-only data even if the server response includes them.
  const transactions = useMemo(
    () => (plaidViewEnabled ? rawTransactions : rawTransactions.filter((t) => t.source !== "plaid")),
    [rawTransactions, plaidViewEnabled]
  );

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Plaid sync is a Pro-only side effect — skip silently when the user
      // doesn't have plaid_transactions_view_enabled rather than hitting a
      // server-side 403 that would route them to billing on a pull-to-refresh.
      if (plaidViewEnabled) {
        try {
          await syncTransactions.mutateAsync({});
        } catch {
          // ignore provider failure
        }
      }
      await queryClient.invalidateQueries({ queryKey: QueryKeys.Transactions() });
    } finally {
      setRefreshing(false);
    }
  }, [syncTransactions, queryClient, plaidViewEnabled]);

  const handlePress = useCallback((id: number) => {
    router.push(`/(app)/transactions/${id}`);
  }, [router]);

  const grouped = useMemo(() => groupByDate(transactions), [transactions]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, embedded && styles.embedded]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {!embedded ? (
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
        </View>
      ) : null}

      <TextInput
        placeholder="Search merchant or description…"
        value={search}
        onChangeText={setSearch}
        leftIcon={<Ionicons name="search" size={16} color={colors.mutedFg} />}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        <Chip label="All" active={!categoryCode} onPress={() => setCategoryCode(undefined)} />
        {categories.map((c) => (
          <View key={c.code} style={styles.chipSpacer}>
            <Chip
              label={c.displayName}
              active={categoryCode === c.code}
              onPress={() => setCategoryCode(categoryCode === c.code ? undefined : c.code)}
            />
          </View>
        ))}
      </ScrollView>

      {cards.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <Chip label="Any card" active={!cardId} onPress={() => setCardId(undefined)} />
          {cards.map((c) => (
            <View key={c.id} style={styles.chipSpacer}>
              <Chip
                label={c.lastFour ? `${c.displayName} ••${c.lastFour}` : c.displayName}
                active={cardId === c.id}
                onPress={() => setCardId(cardId === c.id ? undefined : c.id)}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}

      {!plaidViewEnabled ? (
        <Toast
          tone="info"
          message="Bank-imported transactions are a Pro feature. Connect a card on Pro to see synced transactions here."
        />
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <Toast tone="error" message={error} />
      ) : transactions.length === 0 ? (
        <EmptyState
          iconLabel="🧾"
          title={emptyState && Object.keys(filters).length === 0 ? "No transactions yet" : "No matches"}
          description={
            emptyState && Object.keys(filters).length === 0
              ? "Connect a card on Pro to import transactions."
              : "Try a different search or filter."
          }
        />
      ) : (
        grouped.map(([date, items]) => (
          <View key={date} style={{ gap: 6 }}>
            <SectionLabel>{formatDateHeader(date)}</SectionLabel>
            <Card padded={false}>
              <View style={{ paddingHorizontal: 14 }}>
                {items.map((t) => (
                  <TransactionListItem key={t.id} transaction={t} onPress={handlePress} />
                ))}
              </View>
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

export function TransactionsScreen() {
  return (
    <Screen padded={false}>
      <View style={{ padding: 14, gap: 10, flex: 1 }}>
        <TransactionsContent />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingBottom: 100 },
  embedded: { paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontFamily: fontFamily.heavy, fontSize: scaleFont(24), fontWeight: "800", letterSpacing: -0.4 },
  chipScroll: { flexDirection: "row", paddingVertical: 4, gap: 6, paddingRight: 14 },
  chipSpacer: { marginRight: 0 }
});

/* region: archive — manual transaction add FAB (removed from MVP)
 *
 * The "+" floating action button below the transaction list previously linked
 * to /transactions/new, the manual transaction entry screen. The FAB and its
 * supporting styles/imports (Pressable, LinearGradient, gradients, palette,
 * radii, shadows) are archived along with the route.
 *
 *   import { Pressable } from "react-native";
 *   import { LinearGradient } from "expo-linear-gradient";
 *   import { gradients, palette } from "@/shared/theme/colors";
 *   import { radii } from "@/shared/theme/spacing";
 *   import { shadows } from "@/shared/theme/shadows";
 *
 *   // Inside the return, after the grouped list:
 *   <View style={styles.fabSpacer} />
 *   <Pressable
 *     accessibilityRole="button"
 *     onPress={() => router.push("/(app)/transactions/new")}
 *     style={styles.fabAnchor}
 *   >
 *     <LinearGradient
 *       colors={[...gradients.brand]}
 *       start={{ x: 0, y: 0 }}
 *       end={{ x: 1, y: 1 }}
 *       style={[styles.fab, shadows.fab]}
 *     >
 *       <Ionicons name="add" size={26} color={palette.white} />
 *     </LinearGradient>
 *   </Pressable>
 *
 *   // styles:
 *   fabSpacer: { height: 12 },
 *   fabAnchor: { position: "absolute", right: 6, bottom: 18 },
 *   fab: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }
 *
 * endregion */
