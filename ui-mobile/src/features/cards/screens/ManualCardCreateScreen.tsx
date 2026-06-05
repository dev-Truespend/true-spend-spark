import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { CardProductPicker } from "@/features/catalog/components/CardProductPicker";
import { IssuerPicker } from "@/features/catalog/components/IssuerPicker";
import { useCatalogIssuers } from "@/features/catalog/hooks/useCatalogIssuers";
import { useCatalogProducts } from "@/features/catalog/hooks/useCatalogProducts";
import { useCreateCatalogRequest } from "@/features/catalog/hooks/useCreateCatalogRequest";
import { useCreateManualCard } from "@/features/cards/hooks/useCreateManualCard";

type Mode = "catalog" | "missing";

export function ManualCardCreateScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("catalog");

  const issuersQuery = useCatalogIssuers();
  const issuers = issuersQuery.data?.data?.issuers ?? [];
  const [issuerId, setIssuerId] = useState<number | null>(null);
  const effectiveIssuerId = issuerId ?? issuers[0]?.id ?? null;

  const productsQuery = useCatalogProducts(effectiveIssuerId ?? undefined);
  const products = productsQuery.data?.data?.products ?? [];
  const [productId, setProductId] = useState<number | null>(null);
  const effectiveProductId = productId ?? products[0]?.id ?? null;

  const [nickname, setNickname] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const [missingIssuer, setMissingIssuer] = useState("");
  const [missingCard, setMissingCard] = useState("");

  const createCard = useCreateManualCard();
  const createRequest = useCreateCatalogRequest();

  const formError = useMemo(() => {
    if (lastFour.length > 0 && !/^\d{4}$/.test(lastFour)) return "Last four must be 4 digits.";
    return null;
  }, [lastFour]);

  async function handleSaveCatalog() {
    if (!effectiveIssuerId || !effectiveProductId) return;
    if (formError) return;
    await createCard.mutateAsync({
      issuerId: effectiveIssuerId,
      cardProductId: effectiveProductId,
      nickname: nickname.trim() || undefined,
      lastFour: lastFour.trim() || undefined,
      isPrimary
    });
    router.back();
  }

  async function handleSaveMissing() {
    if (!missingIssuer.trim() || !missingCard.trim()) return;
    if (formError) return;
    await createRequest.mutateAsync({
      issuerName: missingIssuer.trim(),
      cardName: missingCard.trim(),
      createUserCard: true,
      nickname: nickname.trim() || undefined,
      lastFour: lastFour.trim() || undefined,
      isPrimary
    });
    router.back();
  }

  const submitting = createCard.isPending || createRequest.isPending;
  const submitErr =
    createCard.error ? (createCard.error as Error).message :
    createRequest.error ? (createRequest.error as Error).message :
    null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add a card</Text>

        <View style={styles.tabs}>
          <Tab label="From catalog" active={mode === "catalog"} onPress={() => setMode("catalog")} />
          <Tab label="Missing card" active={mode === "missing"} onPress={() => setMode("missing")} />
        </View>

        {mode === "catalog" ? (
          <View style={styles.section}>
            <Text style={styles.label}>Issuer</Text>
            {issuersQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <IssuerPicker
                issuers={issuers}
                selectedId={effectiveIssuerId ?? 0}
                onSelect={(id) => {
                  setIssuerId(id);
                  setProductId(null);
                }}
              />
            )}

            <Text style={styles.label}>Card product</Text>
            {productsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <CardProductPicker
                products={products}
                selectedId={effectiveProductId ?? 0}
                onSelect={setProductId}
              />
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>Issuer name</Text>
            <TextInput onChangeText={setMissingIssuer} placeholder="e.g. Acme Bank" value={missingIssuer} />
            <Text style={styles.label}>Card name</Text>
            <TextInput onChangeText={setMissingCard} placeholder="e.g. Travel Plus" value={missingCard} />
            <Text style={styles.helper}>
              We will create your card now and review the catalog request.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Nickname (optional)</Text>
          <TextInput maxLength={40} onChangeText={setNickname} placeholder="e.g. Travel card" value={nickname} />

          <Text style={styles.label}>Last four (optional)</Text>
          <TextInput
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={setLastFour}
            placeholder="1234"
            value={lastFour}
          />

          <View style={styles.switchRow}>
            <Text style={styles.body}>Primary card</Text>
            <Switch onValueChange={setIsPrimary} value={isPrimary} />
          </View>
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {submitErr ? <Text style={styles.error}>{submitErr}</Text> : null}

        <Button
          disabled={submitting}
          label={mode === "catalog" ? "Add card" : "Request and add card"}
          onPress={mode === "catalog" ? handleSaveCatalog : handleSaveMissing}
        />
      </ScrollView>
    </Screen>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={[styles.tab, active && styles.tabActive]} onTouchEnd={onPress}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  tabs: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden"
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  tabLabelActive: { color: colors.primaryText },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  body: { color: colors.text, fontSize: 14 },
  helper: { color: colors.muted, fontSize: 12 },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  error: { color: colors.danger, fontSize: 13 }
});
