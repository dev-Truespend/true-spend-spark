import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type SegmentedControlProps<T extends string> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      bar: {
        flexDirection: "row",
        backgroundColor: t.colors.surfaceAlt,
        borderRadius: t.radii.md,
        padding: 3,
        gap: 2
      },
      seg: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
      segActive: {
        backgroundColor: t.colors.surface,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1
      },
      label: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12) },
      activeLabel: { color: t.colors.text },
      inactiveLabel: { color: t.colors.mutedFg }
    })
  );
  return (
    <View style={styles.bar}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.seg, active && styles.segActive]}
          >
            <Text style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
