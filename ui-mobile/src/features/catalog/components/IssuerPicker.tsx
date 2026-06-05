import { ScrollView, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { spacing } from "@/shared/theme/spacing";
import { Issuer } from "@/features/catalog/types/catalog.types";

type Props = {
  issuers: Issuer[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function IssuerPicker({ issuers, selectedId, onSelect }: Props) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
      {issuers.map((issuer) => (
        <Button
          key={issuer.id}
          label={issuer.displayName}
          onPress={() => onSelect(issuer.id)}
          variant={selectedId === issuer.id ? "primary" : "secondary"}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm
  }
});
