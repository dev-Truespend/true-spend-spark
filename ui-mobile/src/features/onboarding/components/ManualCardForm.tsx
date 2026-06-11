import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Switch } from "@/shared/components/Switch";
import { TextInput } from "@/shared/components/TextInput";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { OnboardingHero } from "./OnboardingHero";
import { CardProductPicker } from "@/features/catalog/components/CardProductPicker";
import { IssuerPicker } from "@/features/catalog/components/IssuerPicker";
import { CardProduct, Issuer } from "@/features/catalog/types/catalog.types";

type Props = {
  isLoading: boolean;
  issuers: Issuer[];
  products: CardProduct[];
  onSaveCard: (productId: number, issuerId: number, nickname: string, lastFour: string, isPrimary: boolean) => void;
  onRequestMissing: (issuerName: string, cardName: string, nickname: string, lastFour: string, isPrimary: boolean) => void;
  onBack?: () => void;
  onSkip?: () => void;
};

export function ManualCardForm({ isLoading, issuers, products, onSaveCard, onRequestMissing, onBack, onSkip }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const [issuerId, setIssuerId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const selectedIssuer = issuers.find((i) => i.id === issuerId) ?? null;
  const [nickname, setNickname] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [missingIssuer, setMissingIssuer] = useState("");
  const [missingCard, setMissingCard] = useState("");
  // Last 4 is required for both the catalog card and the "card not listed" request, since both
  // create a manual user card that a future Plaid link must be able to match and adopt.
  const lastFourValid = /^\d{4}$/.test(lastFour.trim());

  return (
    <View style={{ gap: 14 }}>
      {onBack ? (
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Text style={styles.topTitle}>Add card</Text>
          <View style={styles.backBtn} />
        </View>
      ) : null}
      <OnboardingHero
        iconLabel="💳"
        title="Add card manually"
        description="We need the issuer, product, and the last 4 digits — never the full card number."
        gradient="purple"
        size="sm"
      />

      <Card>
        <View style={styles.formStack}>
          <View>
            <Text style={styles.fieldLabel}>Issuer</Text>
            <IssuerPicker
              issuers={issuers}
              selectedId={issuerId}
              onSelect={(id) => {
                setIssuerId(id);
                setProductId(null);
              }}
            />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Card product</Text>
            <CardProductPicker
              products={products}
              selectedId={productId}
              onSelect={setProductId}
              issuer={selectedIssuer}
            />
          </View>
          <TextInput label="Nickname (optional)" placeholder="Travel card" value={nickname} onChangeText={setNickname} />
          <TextInput
            label="Last 4"
            placeholder="4821"
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

      <Button
        disabled={isLoading || issuerId === null || productId === null || !lastFourValid}
        label="Add card"
        onPress={() => {
          if (issuerId === null || productId === null || !lastFourValid) return;
          onSaveCard(productId, issuerId, nickname, lastFour.trim(), isPrimary);
        }}
      />
      {onSkip ? (
        <Button disabled={isLoading} label="Skip — add later" onPress={onSkip} variant="outline" />
      ) : null}
      <Text style={styles.hint}>Free: 1 manual card · Basic: 3 manual + 3 Plaid · Pro: unlimited.</Text>

      <SectionLabel>Card not listed?</SectionLabel>
      <Card tone="muted">
        <View style={{ gap: 10 }}>
          <TextInput label="Issuer" placeholder="Issuer name" value={missingIssuer} onChangeText={setMissingIssuer} />
          <TextInput label="Card" placeholder="Card name" value={missingCard} onChangeText={setMissingCard} />
          <Button
            disabled={isLoading || !missingIssuer || !missingCard || !lastFourValid}
            label="Request and continue"
            onPress={() => onRequestMissing(missingIssuer, missingCard, nickname, lastFour.trim(), isPrimary)}
            variant="outline"
          />
        </View>
      </Card>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    formStack: { gap: 14 },
    fieldLabel: { fontFamily: fontFamily.semibold, fontSize: scaleFont(12), color: t.colors.mutedFg, fontWeight: "600", marginBottom: 6 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    switchLabel: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.text },
    hint: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, textAlign: "center" },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 2, minWidth: 60 },
    backLabel: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: t.colors.text },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14), color: t.colors.text }
  });
