import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, palette, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
};

export function OtpInput({ length = 6, value, onChange, autoFocus = true }: OtpInputProps) {
  const ref = useRef<TextInput>(null);
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

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginVertical: 10 },
  cell: {
    flex: 1,
    height: 50,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center"
  },
  filled: { borderColor: colors.primary },
  cursor: { borderColor: colors.primary, backgroundColor: tints.blue.wash },
  cellText: { fontFamily: fontFamily.bold, fontSize: scaleFont(20), fontWeight: "700", color: colors.text },
  cellTextFilled: { color: colors.primary },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 }
});
