import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Screen } from "@/shared/components/Screen";
import { Switch } from "@/shared/components/Switch";
import { TextInput } from "@/shared/components/TextInput";
import { Toast } from "@/shared/components/Toast";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { CardProductPicker } from "@/features/catalog/components/CardProductPicker";
import { IssuerPicker } from "@/features/catalog/components/IssuerPicker";
import { useCatalogIssuers } from "@/features/catalog/hooks/useCatalogIssuers";
import { useCatalogProducts } from "@/features/catalog/hooks/useCatalogProducts";
import { useCreateManualCard } from "@/features/cards/hooks/useCreateManualCard";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";

export function ManualCardCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cardProductId?: string }>();
  const preselectedProductId = params.cardProductId ? Number(params.cardProductId) : null;
  const gate = useEntitlementGate();
  const isUnlimited = gate.unlimitedCards || gate.isPro;

  const issuersQuery = useCatalogIssuers();
  const issuers = issuersQuery.data?.data?.issuers ?? [];
  const [issuerId, setIssuerId] = useState<number | null>(null);
  const effectiveIssuerId = issuerId ?? issuers[0]?.id ?? null;

  const productsQuery = useCatalogProducts(effectiveIssuerId ?? undefined);
  const products = productsQuery.data?.data?.products ?? [];
  const [productId, setProductId] = useState<number | null>(preselectedProductId);
  const effectiveProductId = productId ?? products[0]?.id ?? null;

  useEffect(() => {
    if (preselectedProductId == null || issuerId != null) return;
    const match = products.find((p) => p.id === preselectedProductId);
    if (!match) return;
    const issuer = issuers.find((i) => i.displayName === match.issuerName);
    if (issuer) setIssuerId(issuer.id);
  }, [preselectedProductId, issuerId, products, issuers]);

  const [nickname, setNickname] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const createCard = useCreateManualCard();

  const formError = useMemo(() => {
    if (!/^\d{4}$/.test(lastFour.trim())) return "Last four must be 4 digits.";
    return null;
  }, [lastFour]);

  async function handleSave() {
    if (!effectiveIssuerId || !effectiveProductId) return;
    if (formError) return;
    await createCard.mutateAsync({
      issuerId: effectiveIssuerId,
      cardProductId: effectiveProductId,
      nickname: nickname.trim() || undefined,
      lastFour: lastFour.trim(),
      isPrimary
    });
    router.back();
  }

  const submitting = createCard.isPending;
  const submitErr = createCard.error ? (createCard.error as Error).message : null;

  return (
    <Screen scroll>
      <Text style={styles.title}>Add a card</Text>

      <Card>
        <View style={styles.formStack}>
          <View>
            <Text style={styles.fieldLabel}>Issuer</Text>
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
          </View>
          <View>
            <Text style={styles.fieldLabel}>Card product</Text>
            {productsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <CardProductPicker
                products={products}
                selectedId={effectiveProductId ?? 0}
                onSelect={setProductId}
                issuer={issuers.find((i) => i.id === effectiveIssuerId) ?? null}
              />
            )}
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.formStack}>
          <TextInput label="Nickname (optional)" placeholder="Travel card" value={nickname} onChangeText={setNickname} maxLength={40} />
          <TextInput
            label="Last 4"
            placeholder="1234"
            value={lastFour}
            onChangeText={setLastFour}
            keyboardType="number-pad"
            maxLength={4}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Set as primary card</Text>
            <Switch value={isPrimary} onChange={setIsPrimary} />
          </View>
        </View>
      </Card>

      {formError ? <Toast tone="warn" message={formError} /> : null}
      {submitErr ? <Toast tone="error" message={submitErr} /> : null}

      <Button
        disabled={submitting}
        loading={submitting}
        label="Add card"
        onPress={handleSave}
      />
      <Button
        disabled={submitting}
        label="Skip — add later"
        onPress={() => router.back()}
        variant="outline"
      />
      <Text style={styles.limitHint}>
        {isUnlimited
          ? "Pro: unlimited manual and linked cards."
          : "Basic: up to 2 manual cards. Pro: unlimited."}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(22), letterSpacing: -0.4 },
  formStack: { gap: 14 },
  fieldLabel: { fontFamily: fontFamily.semibold, fontSize: scaleFont(12), color: colors.mutedFg, fontWeight: "600", marginBottom: 6 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.text },
  limitHint: {
    color: colors.mutedFg,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(11),
    textAlign: "center",
    marginTop: 4
  }
});
