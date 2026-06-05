import { ScrollView, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { spacing } from "@/shared/theme/spacing";
import { CardProduct } from "@/features/catalog/types/catalog.types";

type Props = {
  products: CardProduct[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function CardProductPicker({ products, selectedId, onSelect }: Props) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
      {products.map((product) => (
        <Button
          key={product.id}
          label={product.displayName}
          onPress={() => onSelect(product.id)}
          variant={selectedId === product.id ? "primary" : "secondary"}
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
