import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { onboardingPanelStyles as styles } from "@/features/onboarding/components/onboardingStyles";
import { CardProductPicker } from "@/features/catalog/components/CardProductPicker";
import { IssuerPicker } from "@/features/catalog/components/IssuerPicker";
import { CardProduct, Issuer } from "@/features/catalog/types/catalog.types";

type Props = {
  isLoading: boolean;
  issuers: Issuer[];
  products: CardProduct[];
  onSaveCard: (productId: number, issuerId: number, nickname: string, lastFour: string, isPrimary: boolean) => void;
  onRequestMissing: (issuerName: string, cardName: string, nickname: string, lastFour: string, isPrimary: boolean) => void;
};

export function ManualCardForm({ isLoading, issuers, products, onSaveCard, onRequestMissing }: Props) {
  const [issuerId, setIssuerId] = useState<number>(issuers[0]?.id ?? 1);
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 1);
  const [nickname, setNickname] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [missingIssuer, setMissingIssuer] = useState("");
  const [missingCard, setMissingCard] = useState("");

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Manual card</Text>
      <Text style={styles.label}>Issuer</Text>
      <IssuerPicker issuers={issuers} selectedId={issuerId} onSelect={setIssuerId} />
      <Text style={styles.label}>Card product</Text>
      <CardProductPicker products={products} selectedId={productId} onSelect={setProductId} />
      <TextInput onChangeText={setNickname} placeholder="Nickname" value={nickname} />
      <TextInput keyboardType="number-pad" maxLength={4} onChangeText={setLastFour} placeholder="Last four digits" value={lastFour} />
      <View style={styles.switchRow}>
        <Text style={styles.body}>Primary card</Text>
        <Switch onValueChange={setIsPrimary} value={isPrimary} />
      </View>
      <Button
        disabled={isLoading}
        label="Save manual card"
        onPress={() => onSaveCard(productId, issuerId, nickname, lastFour, isPrimary)}
      />
      <Text style={styles.label}>Missing card</Text>
      <TextInput onChangeText={setMissingIssuer} placeholder="Issuer name" value={missingIssuer} />
      <TextInput onChangeText={setMissingCard} placeholder="Card name" value={missingCard} />
      <Button
        disabled={isLoading || !missingIssuer || !missingCard}
        label="Request and continue"
        onPress={() => onRequestMissing(missingIssuer, missingCard, nickname, lastFour, isPrimary)}
        variant="secondary"
      />
    </View>
  );
}
