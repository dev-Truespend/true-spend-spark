import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Category = { code: string; displayName: string };

type Props = {
  categories: Category[];
  activeCode: string;
  onChange: (code: string) => void;
};

export function CategoryChips({ categories, activeCode, onChange }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Compare categories</Text>
      <View style={styles.row}>
        {categories.map((category) => (
          <Button
            key={category.code}
            label={category.displayName}
            onPress={() => onChange(category.code)}
            variant={activeCode === category.code ? "primary" : "secondary"}
          />
        ))}
      </View>
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }
});
