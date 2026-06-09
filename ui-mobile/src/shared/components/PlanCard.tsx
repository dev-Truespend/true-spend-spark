import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, palette, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type PlanCardProps = {
  name: string;
  price: string;
  cadence?: string;
  features: string[];
  featured?: boolean;
  ribbon?: string;
  footer?: ReactNode;
};

export function PlanCard({ name, price, cadence = "/mo", features, featured, ribbon = "BEST VALUE", footer }: PlanCardProps) {
  return (
    <View style={[styles.card, featured && styles.featured]}>
      {featured ? (
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ribbon}
        >
          <Text style={styles.ribbonText}>{ribbon}</Text>
        </LinearGradient>
      ) : null}
      <Text style={styles.name}>{name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.cadence}>{cadence}</Text>
      </View>
      <View style={styles.features}>
        {features.map((f) => (
          <View key={f} style={styles.featRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featText}>{f}</Text>
          </View>
        ))}
      </View>
      {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: radii.xxl,
    padding: 16,
    position: "relative"
  },
  // Mockup `.plan-card.featured` is a white card with a 2px purple border and a
  // faint purple wash. We use the flat `tints.purple.wash` token instead of a
  // LinearGradient so the floating BEST VALUE ribbon (top: -10) is not clipped
  // by an overflow:hidden boundary.
  featured: {
    borderColor: colors.accent,
    backgroundColor: tints.purple.wash
  },
  ribbon: {
    position: "absolute",
    top: -10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  ribbonText: { color: palette.white, fontFamily: fontFamily.heavy, fontSize: scaleFont(10), fontWeight: "800", letterSpacing: 1.2 },
  name: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: colors.text },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  price: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(26), color: colors.text, letterSpacing: -0.6 },
  cadence: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg },
  features: { marginTop: 8, gap: 4 },
  featRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  check: { color: colors.successText, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(13), marginTop: 1 },
  featText: { flex: 1, fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.text, lineHeight: 18 },
  footerWrap: { marginTop: 12 }
});
