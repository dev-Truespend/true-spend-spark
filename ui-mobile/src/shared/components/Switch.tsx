import { Pressable, StyleSheet, View } from "react-native";
import { colors, palette } from "@/shared/theme/colors";

type SwitchProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export function Switch({ value, onChange, disabled }: SwitchProps) {
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

const styles = StyleSheet.create({
  track: { width: 40, height: 24, borderRadius: 14, padding: 2, justifyContent: "center" },
  off: { backgroundColor: colors.surfaceAlt },
  on: { backgroundColor: colors.teal },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.white,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2
  },
  knobOn: { alignSelf: "flex-end" }
});
