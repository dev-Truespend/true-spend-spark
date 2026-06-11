import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
};

export function OtpInput({ length = 6, value, onChange, autoFocus = true }: OtpInputProps) {
  const ref = useRef<TextInput>(null);
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      row: { flexDirection: "row", gap: 6, marginVertical: 10 },
      cell: {
        flex: 1,
        height: 50,
        borderRadius: t.radii.md,
        borderWidth: 1.5,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
        alignItems: "center",
        justifyContent: "center"
      },
      filled: { borderColor: t.colors.primary },
      cursor: { borderColor: t.colors.primary, backgroundColor: t.tints.blue.wash },
      cellText: { fontFamily: fontFamily.bold, fontSize: scaleFont(20), fontWeight: "700", color: t.colors.text },
      cellTextFilled: { color: t.colors.primary },
      hidden: { position: "absolute", opacity: 0, width: 1, height: 1 }
    })
  );
  useEffect(() => {
    if (autoFocus) {
      const id = setTimeout(() => ref.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [autoFocus]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, length);
    onChange(digits);
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const ch = value[i] ?? "";
        const filled = !!ch;
        const cursor = i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              filled && styles.filled,
              cursor && styles.cursor
            ]}
          >
            <Text style={[styles.cellText, filled && styles.cellTextFilled]}>{ch}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoComplete={Platform.select({ ios: "one-time-code", android: "sms-otp" }) as never}
        textContentType="oneTimeCode"
        style={styles.hidden}
      />
    </View>
  );
}
