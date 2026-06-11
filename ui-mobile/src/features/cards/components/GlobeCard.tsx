import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  onPress: () => void;
};

// Visual entry point to the globe (Flighty-style). Decorative — no data.
export function GlobeCard({ onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: t.radii.xl,
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border
      },
      globe: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center"
      },
      title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14), color: t.colors.text },
      body: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: t.colors.mutedFg, marginTop: 2, lineHeight: 16 },
      pressed: { opacity: 0.85 }
    })
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Explore the globe"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[...theme.gradients.cool]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.globe}
      >
        <Ionicons name="globe-outline" size={24} color={theme.palette.white} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Explore the globe</Text>
        <Text style={styles.body}>Maximize every swipe — wherever you are.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedFg} />
    </Pressable>
  );
}
