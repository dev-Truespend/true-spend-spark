import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, palette, tints } from "@/shared/theme/colors";
import { radii, spacing } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

export type DropdownOption<T> = {
  label: string;
  value: T;
};

type DropdownProps<T> = {
  label?: string;
  placeholder?: string;
  value: T | null;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  sheetTitle?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

export function Dropdown<T extends string | number>({
  label,
  placeholder = "Select…",
  value,
  options,
  onChange,
  sheetTitle,
  disabled,
  searchable,
  searchPlaceholder = "Search…",
  emptyLabel = "No matches"
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || query.trim().length === 0) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? "Open picker"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed
        ]}
      >
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedFg} />
      </Pressable>

      <Modal transparent visible={open} animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <Pressable style={styles.overlay} onPress={close}>
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetSpacer} />
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {sheetTitle ?? label ?? "Select"}
                </Text>
                <Pressable
                  onPress={close}
                  hitSlop={10}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressedSubtle]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color={colors.mutedFg} />
                </Pressable>
              </View>
              {searchable ? (
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={18} color={colors.mutedFg} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={colors.mutedFg}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    accessibilityLabel={searchPlaceholder}
                    autoFocus
                  />
                  {query.length > 0 ? (
                    <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
                      <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {filteredOptions.length === 0 ? (
                  <Text style={styles.empty}>{emptyLabel}</Text>
                ) : null}
                {filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      onPress={() => {
                        onChange(opt.value);
                        close();
                      }}
                      style={({ pressed }) => [
                        styles.row,
                        isSelected && styles.rowSelected,
                        pressed && styles.rowPressed
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]} numberOfLines={1}>
                        {opt.label}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: colors.mutedFg,
    marginBottom: 6
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    paddingHorizontal: 14,
    gap: 8
  },
  disabled: { opacity: 0.5 },
  pressed: { borderColor: colors.primary },
  value: { flex: 1, color: colors.text, fontFamily: fontFamily.regular, fontSize: scaleFont(15) },
  placeholder: { color: colors.mutedFg },

  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    paddingTop: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: "85%"
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 12
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sheetSpacer: { width: 32, height: 32 },
  sheetTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontWeight: "700",
    fontSize: scaleFont(17),
    color: colors.text,
    textAlign: "center"
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt
  },
  pressedSubtle: { opacity: 0.6 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(15),
    padding: 0
  },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: spacing.sm },
  empty: {
    textAlign: "center",
    color: colors.mutedFg,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(13),
    paddingVertical: 20
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    gap: 8,
    marginBottom: 2
  },
  rowSelected: { backgroundColor: tints.blue.bg },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { flex: 1, color: colors.text, fontFamily: fontFamily.regular, fontSize: scaleFont(15) },
  rowLabelSelected: { fontFamily: fontFamily.semibold, fontWeight: "600", color: colors.primary }
});
