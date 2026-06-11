import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/components/Badge";
import { EmptyState } from "@/shared/components/EmptyState";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { Toast } from "@/shared/components/Toast";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { useCatalogIssuers } from "@/features/catalog/hooks/useCatalogIssuers";
import {
  useCatalogProductSearch,
  useCatalogProducts
} from "@/features/catalog/hooks/useCatalogProducts";
import { CardProduct, Issuer } from "@/features/catalog/types/catalog.types";

export function CatalogBrowseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const [query, setQuery] = useState("");
  const [issuerId, setIssuerId] = useState<number | null>(null);

  const issuersQuery = useCatalogIssuers();
  const issuers: Issuer[] = issuersQuery.data?.data?.issuers ?? [];

  const trimmed = query.trim();
  const searchActive = trimmed.length > 1;
  const productsQuery = useCatalogProducts(issuerId ?? undefined);
  const searchQuery = useCatalogProductSearch(trimmed, issuerId ?? undefined);

  const products: CardProduct[] = searchActive
    ? searchQuery.data?.data?.products ?? []
    : productsQuery.data?.data?.products ?? [];

  const isLoading = searchActive ? searchQuery.isLoading : productsQuery.isLoading;
  const error = searchActive
    ? (searchQuery.error as Error | undefined)?.message
    : (productsQuery.error as Error | undefined)?.message;

  const allIssuers = useMemo(() => [{ id: 0, displayName: "All issuers" } as Issuer, ...issuers], [issuers]);

  function handleSelect(product: CardProduct) {
    router.push({
      pathname: "/(app)/cards/new",
      params: { cardProductId: String(product.id) }
    });
  }

  return (
    <Screen padded={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Card catalog</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.search}>
        <TextInput
          placeholder="Search Chase Sapphire, Amex Gold…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          leftIcon={<Ionicons name="search" size={16} color={colors.mutedFg} />}
        />
      </View>

      {issuers.length > 0 ? (
        <FlatList
          horizontal
          data={allIssuers}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.issuerRow}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = (issuerId ?? 0) === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIssuerId(item.id === 0 ? null : item.id)}
                style={[styles.issuerChip, active && styles.issuerChipActive]}
              >
                <Text style={[styles.issuerChipText, active && styles.issuerChipTextActive]}>
                  {item.displayName}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}

      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
      {error ? <Toast tone="error" message={error} /> : null}

      {!isLoading && !error && products.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            iconLabel="🔎"
            title={searchActive ? "No matches" : "No products available"}
            description={
              searchActive
                ? "Try a different search or clear the issuer filter."
                : "Pick an issuer to see their cards."
            }
          />
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelect(item)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <Text style={styles.rowIconText}>{initialsFor(item)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.displayName}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.issuerName}
                {item.rewardCurrencyName ? ` · ${item.rewardCurrencyName}` : ""}
              </Text>
            </View>
            {typeof item.annualFee === "number" ? (
              <Badge
                tone={item.annualFee === 0 ? "green" : "muted"}
                label={item.annualFee === 0 ? "No annual fee" : `$${item.annualFee}/yr`}
              />
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.mutedFg} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

function initialsFor(product: CardProduct): string {
  const source = product.issuerName || product.displayName;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm
    },
    iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
    search: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    issuerRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
    issuerChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderColor: t.colors.border,
      borderWidth: 1,
      backgroundColor: t.colors.surface,
      marginRight: 6
    },
    issuerChipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    issuerChipText: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), color: t.colors.text },
    issuerChipTextActive: { color: t.palette.white },
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: t.colors.surface,
      borderColor: t.colors.border,
      borderWidth: 1,
      borderRadius: radii.xl,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    rowPressed: { opacity: 0.85 },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: t.colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center"
    },
    rowIconText: { fontFamily: fontFamily.heavy, fontSize: scaleFont(12), color: t.colors.text, letterSpacing: 0.4 },
    rowTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14), color: t.colors.text },
    rowMeta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 2 },
    empty: { paddingHorizontal: spacing.md, paddingTop: spacing.md }
  });
