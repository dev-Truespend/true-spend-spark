import { ReactNode, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ViewStyle
} from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

export type TextInputProps = RNTextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightAccessory?: ReactNode;
  containerStyle?: ViewStyle;
};

export function TextInput({
  label,
  hint,
  error,
  leftIcon,
  rightAccessory,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...rest
}: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const t = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      label: {
        fontFamily: fontFamily.semibold,
        fontSize: scaleFont(12),
        fontWeight: "600",
        color: t.colors.mutedFg,
        marginBottom: 6
      },
      field: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: t.colors.surface,
        borderRadius: t.radii.lg,
        borderWidth: 1,
        minHeight: 48,
        paddingHorizontal: 14
      },
      focusedRing: {
        shadowColor: t.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 2
      },
      input: {
        flex: 1,
        color: t.colors.text,
        fontFamily: fontFamily.regular,
        fontSize: scaleFont(15),
        paddingVertical: t.spacing.sm
      },
      icon: { marginHorizontal: 6 },
      hintText: { fontSize: scaleFont(12), color: t.colors.mutedFg, marginTop: 6, fontFamily: fontFamily.regular },
      errorText: { fontSize: scaleFont(12), color: t.colors.destructive, marginTop: 6, fontFamily: fontFamily.medium }
    })
  );
  const borderColor = error ? t.colors.destructive : focused ? t.colors.primary : t.colors.border;

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          { borderColor },
          focused && !error && styles.focusedRing
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <NativeTextInput
          placeholderTextColor={t.colors.mutedFg}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightAccessory ? <View style={styles.icon}>{rightAccessory}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}
