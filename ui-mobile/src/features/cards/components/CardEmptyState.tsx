import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  onAddManual: () => void;
  onConnectPlaid: () => void;
  onBrowseCatalog: () => void;
  onUpgrade: () => void;
  plaidEnabled: boolean;
};

export function CardEmptyState({ onAddManual, onConnectPlaid, onBrowseCatalog, onUpgrade, plaidEnabled }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add your first card</Text>
      <Text style={styles.body}>
        {plaidEnabled
          ? "Connect a bank account via Plaid or add a card manually to start tracking rewards."
          : "Add a card manually to start tracking rewards. Bank linking is available on Pro."}
      </Text>
      {plaidEnabled ? (
        <Button label="Connect bank account" onPress={onConnectPlaid} />
      ) : (
        <Button label="Upgrade to Pro to connect bank" onPress={onUpgrade} />
      )}
      <Button label="Add card manually" onPress={onAddManual} variant="secondary" />
      <Button label="Add from catalog" onPress={onBrowseCatalog} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xl
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center"
  }
});
