import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";

type Props = {
  title: string;
  body: string;
  upgradeMessage?: string | null;
  onAddCard: () => void;
  onConnectBank: () => void;
  onUpgrade?: () => void;
};

export function HomeEmptyState({ title, body, upgradeMessage, onAddCard, onConnectBank, onUpgrade }: Props) {
  const gate = useEntitlementGate();
  const showUpgradeCta = !gate.isPro && !!onUpgrade;
  const upgradeCopy = upgradeMessage
    ?? (gate.isPro
      ? null
      : gate.unlimitedCards
        ? null
        : `Pro unlocks unlimited cards beyond the ${gate.cardLinkLimit ?? 3}-card limit.`);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {upgradeCopy ? <Text style={styles.callout}>{upgradeCopy}</Text> : null}
      <Button label="Add a card" onPress={onAddCard} />
      <Button label="Connect a bank" onPress={onConnectBank} variant="secondary" />
      {showUpgradeCta ? <Button label="Upgrade to Pro" onPress={onUpgrade!} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  callout: { color: colors.primary, fontWeight: "700" }
});
