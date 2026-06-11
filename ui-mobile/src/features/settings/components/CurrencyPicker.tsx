import { scaleFont } from "@/shared/theme/typography";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { spacing } from "@/shared/theme/spacing";
import { TextInput } from "@/shared/components/TextInput";
import { useCurrencies } from "@/features/lookups/hooks/useCurrencies";

type Props = {
  value?: string | null;
  onChange: (code: string) => void;
};

export function CurrencyPicker({ value, onChange }: Props) {
  const styles = useStyles();
  const { data: currencies = [], isLoading } = useCurrencies();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return currencies;
    return currencies.filter((c) =>
      c.code.toLowerCase().includes(term) || c.displayName.toLowerCase().includes(term)
    );
  }, [currencies, query]);

  const selected = currencies.find((c) => c.code === value);
  const label = selected ? `${selected.code} — ${selected.displayName}` : value ?? "Select a currency";

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
        testID="currency-picker.trigger"
      >
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>{label}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setOpen(false)} transparent={false} visible={open}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Choose currency</Text>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
          <TextInput
            autoCapitalize="characters"
            onChangeText={setQuery}
            placeholder="Search ISO code or name"
            value={query}
          />
          {isLoading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : (
            <FlatList
              data={filtered}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  testID={`currency-picker.option.${item.code}`}
                >
                  <Text style={styles.optionCode}>{item.code}</Text>
                  <Text style={styles.optionName} numberOfLines={1}>{item.displayName}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.muted}>No currencies match “{query}”.</Text>}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const useStyles = () =>
  useThemedStyles((t) =>
    StyleSheet.create({
      field: {
        alignItems: "center",
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 48,
        paddingHorizontal: spacing.md
      },
      pressed: {
        opacity: 0.85
      },
      fieldText: {
        color: t.colors.text,
        flex: 1,
        fontSize: scaleFont(16)
      },
      placeholder: {
        color: t.colors.muted
      },
      chevron: {
        color: t.colors.muted,
        fontSize: scaleFont(18),
        marginLeft: spacing.sm
      },
      modal: {
        backgroundColor: t.colors.background,
        flex: 1,
        gap: spacing.sm,
        padding: spacing.lg
      },
      header: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md
      },
      headerText: {
        color: t.colors.text,
        fontSize: scaleFont(18),
        fontWeight: "700"
      },
      cancel: {
        color: t.colors.primary,
        fontSize: scaleFont(16),
        fontWeight: "600"
      },
      muted: {
        color: t.colors.muted,
        marginTop: spacing.md,
        textAlign: "center"
      },
      option: {
        alignItems: "center",
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        marginTop: spacing.sm,
        padding: spacing.md
      },
      optionCode: {
        color: t.colors.text,
        fontSize: scaleFont(16),
        fontWeight: "700"
      },
      optionName: {
        color: t.colors.muted,
        flex: 1,
        fontSize: scaleFont(14)
      }
    })
  );