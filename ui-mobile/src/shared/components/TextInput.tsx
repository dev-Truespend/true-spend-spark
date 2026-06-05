import { TextInput as NativeTextInput, StyleSheet, TextInputProps } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export function TextInput(props: TextInputProps) {
  return <NativeTextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md
  }
});
