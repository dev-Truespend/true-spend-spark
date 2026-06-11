import { Pressable, StyleSheet, View } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";

type SwitchProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export function Switch({ value, onChange, disabled }: SwitchProps) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      track: { width: 40, height: 24, borderRadius: 14, padding: 2, justifyContent: "center" },
      off: { backgroundColor: t.colors.surfaceAlt },
      on: { backgroundColor: t.colors.teal },
      knob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: t.palette.white,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 2
      },
      knobOn: { alignSelf: "flex-end" }
    })
  );
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.track, value ? styles.on : styles.off, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}
