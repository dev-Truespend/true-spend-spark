import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, GradientName, palette } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";

type CreditCardVariant = Extract<GradientName, "brand" | "purple" | "cool" | "gold" | "dark">;

type CreditCardProps = {
  name: string;
  last4: string;
  network?: string;
  issuer?: string;
  variant?: CreditCardVariant;
  size?: "sm" | "md" | "lg";
  // Peek-stack layout used on the Cards tab — name/icon on top row, large
  // monospaced last4 below, slim subtle top border. Matches mockup .card-stack.
  stackMode?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

const shadowFor = (variant: CreditCardVariant) => {
  switch (variant) {
    case "purple":
      return shadows.brandPurple;
    case "gold":
      return shadows.brandWarm;
    default:
      return shadows.brandBlue;
  }
};

export function CreditCard({
  name,
  last4,
  network,
  issuer,
  variant = "brand",
  size = "md",
  stackMode,
  onPress,
  style
}: CreditCardProps) {
  const dims = stackMode
    ? { minHeight: 115, padding: 14, radius: 16 }
    : size === "sm"
      ? { minHeight: 88, padding: 12, radius: 12 }
      : size === "lg"
        ? { minHeight: 150, padding: 16, radius: 16 }
        : { minHeight: 130, padding: 14, radius: 16 };

  const content = (
    <LinearGradient
      colors={[...gradients[variant]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.base,
        { minHeight: dims.minHeight, padding: dims.padding, borderRadius: dims.radius },
        stackMode && styles.stackBorder,
        stackMode && styles.stackJustify,
        shadowFor(variant),
        style
      ]}
    >
      {stackMode ? (
        <>
          <View style={styles.topRow}>
            <Text style={styles.stackName} numberOfLines={1}>{name}</Text>
            <Text style={styles.chip}>💳</Text>
          </View>
          <Text style={styles.stackNum}>•••• {last4}</Text>
        </>
      ) : (
        <>
          <View style={styles.topRow}>
            <Text style={styles.network}>{network ?? "TrueSpend"}</Text>
            <Text style={styles.chip}>◾</Text>
          </View>
          <View>
            <Text style={[styles.num, size === "sm" && styles.numSm]}>•••• {last4}</Text>
            <View style={styles.bottomRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Cardholder</Text>
                <Text style={[styles.name, size === "sm" && styles.nameSm]} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              {issuer ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.label}>Issuer</Text>
                  <Text style={[styles.name, size === "sm" && styles.nameSm]} numberOfLines={1}>
                    {issuer}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </>
      )}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  base: {
    justifyContent: "space-between",
    overflow: "hidden",
    borderRadius: radii.xxl
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  network: { color: palette.white, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), letterSpacing: 0.2 },
  chip: { color: "rgba(255,255,255,0.8)", fontSize: scaleFont(18) },
  num: { color: palette.white, fontFamily: fontFamily.mono, fontSize: scaleFont(16), letterSpacing: 2, marginTop: 8 },
  numSm: { fontSize: scaleFont(13), letterSpacing: 1.5 },
  bottomRow: { flexDirection: "row", marginTop: 10, gap: 12 },
  label: { color: "rgba(255,255,255,0.75)", fontSize: scaleFont(9), fontFamily: fontFamily.bold, letterSpacing: 0.8, textTransform: "uppercase" },
  name: { color: palette.white, fontSize: scaleFont(13), fontFamily: fontFamily.semibold, fontWeight: "600", marginTop: 2 },
  nameSm: { fontSize: scaleFont(11) },
  stackBorder: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)" },
  stackJustify: { justifyContent: "flex-start", gap: 6 },
  stackName: { color: palette.white, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), flexShrink: 1 },
  stackNum: { color: palette.white, fontFamily: fontFamily.mono, fontSize: scaleFont(16), letterSpacing: 1.8, fontWeight: "600", marginTop: 6 },
  pressed: { transform: [{ scale: 0.98 }] }
});
