import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { spacing } from "@/shared/theme/spacing";
import { RewardOverride } from "@/features/cards/types/cards.types";

type Props = {
  overrides: RewardOverride[];
  isLoading: boolean;
  error?: string | null;
  onSave: (input: { categoryCode: string; multiplier: number; notes?: string }) => Promise<void>;
  onDelete: (categoryCode: string) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
};

export function RewardOverrideEditor({
  overrides,
  isLoading,
  error,
  onSave,
  onDelete,
  isSaving,
  isDeleting
}: Props) {
  const [categoryCode, setCategoryCode] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = useThemedStyles(buildStyles);

  async function handleSave() {
    setFormError(null);
    const code = categoryCode.trim();
    const parsed = parseFloat(multiplier);
    if (!code) {
      setFormError("Category code is required.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError("Multiplier must be a number greater than zero.");
      return;
    }
    await onSave({ categoryCode: code, multiplier: parsed, notes: notes.trim() || undefined });
    setCategoryCode("");
    setMultiplier("");
    setNotes("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Reward overrides</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : overrides.length === 0 ? (
        <Text style={styles.empty}>No overrides yet.</Text>
      ) : (
        overrides.map((o) => (
          <View key={o.categoryCode} style={styles.overrideRow}>
            <View style={styles.overrideText}>
              <Text style={styles.overrideCategory}>{o.categoryName || o.categoryCode}</Text>
              <Text style={styles.overrideMultiplier}>{o.multiplier}x</Text>
              {o.notes ? <Text style={styles.overrideNotes}>{o.notes}</Text> : null}
            </View>
            <TouchableOpacity
              disabled={isDeleting}
              onPress={() => onDelete(o.categoryCode)}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={styles.form}>
        <Text style={styles.formHeading}>Add or update an override</Text>
        <Text style={styles.label}>Category code</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={setCategoryCode}
          placeholder="e.g. dining"
          value={categoryCode}
        />
        <Text style={styles.label}>Multiplier</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setMultiplier}
          placeholder="e.g. 3"
          value={multiplier}
        />
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput maxLength={200} onChangeText={setNotes} placeholder="" value={notes} />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button disabled={isSaving} label={isSaving ? "Saving…" : "Save override"} onPress={handleSave} />
      </View>
    </View>
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: t.colors.surface,
      borderColor: t.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md
    },
    sectionTitle: {
      color: t.colors.muted,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase"
    },
    empty: { color: t.colors.muted, fontSize: 13 },
    overrideRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing.xs
    },
    overrideText: { flex: 1 },
    overrideCategory: { color: t.colors.text, fontSize: 14, fontWeight: "600" },
    overrideMultiplier: { color: t.colors.primary, fontSize: 13, fontWeight: "700" },
    overrideNotes: { color: t.colors.muted, fontSize: 12 },
    deleteBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    deleteBtnText: { color: t.colors.danger, fontSize: 13, fontWeight: "600" },
    form: { gap: spacing.xs, marginTop: spacing.sm },
    formHeading: { color: t.colors.text, fontSize: 14, fontWeight: "700" },
    label: { color: t.colors.muted, fontSize: 12, fontWeight: "600" },
    error: { color: t.colors.danger, fontSize: 12 }
  });
