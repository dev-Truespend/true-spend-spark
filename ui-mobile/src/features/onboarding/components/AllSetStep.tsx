import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/shared/components/Button";
import { Switch } from "@/shared/components/Switch";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  isLoading: boolean;
  onComplete: (allowNotifications: boolean) => void;
};

export function AllSetStep({ isLoading, onComplete }: Props) {
  const [allowNotifications, setAllowNotifications] = useState(true);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      wrap: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24
      },
      hero: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12
      },
      check: {
        width: 96,
        height: 96,
        borderRadius: 28,
        backgroundColor: t.colors.onBrandSurface,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8
      },
      checkGlyph: { color: t.palette.white, fontSize: scaleFont(42), fontFamily: fontFamily.heavy, fontWeight: "800" },
      title: {
        color: t.palette.white,
        fontFamily: fontFamily.heavy,
        fontWeight: "800",
        fontSize: scaleFont(28),
        letterSpacing: -0.5,
        textAlign: "center"
      },
      desc: {
        color: t.colors.onBrandMuted,
        fontFamily: fontFamily.regular,
        fontSize: scaleFont(14),
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: 12,
        maxWidth: 320
      },
      badges: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 6,
        marginTop: 12
      },
      badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: t.colors.onBrandSurface
      },
      badgeText: { color: t.palette.white, fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(11) },
      actions: { gap: 12 },
      notifCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        width: "100%",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: t.colors.onBrandSurface,
        borderWidth: 1,
        borderColor: t.colors.onBrandBorder
      },
      notifText: { flex: 1, gap: 2 },
      notifTitle: { color: t.palette.white, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(14) },
      notifBody: { color: t.colors.onBrandMuted, fontFamily: fontFamily.regular, fontSize: scaleFont(12), lineHeight: 16 }
    })
  );

  return (
    <LinearGradient
      colors={[...theme.gradients.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
    >
      <View style={styles.hero}>
        <View style={styles.check}>
          <Text style={styles.checkGlyph}>✓</Text>
        </View>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.desc}>
          Cards linked · location on · trial active. Toggle notifications below for timely card nudges.
        </Text>
        <View style={styles.badges}>
          {["✓ Cards", "✓ Location", "✓ Trial", allowNotifications ? "✓ Notifications" : "Notifications"].map((label) => (
            <View key={label} style={styles.badge}>
              <Text style={styles.badgeText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.notifCard}>
          <View style={styles.notifText}>
            <Text style={styles.notifTitle}>Allow notifications</Text>
            <Text style={styles.notifBody}>Best card alerts, missed rewards, and weekly summaries.</Text>
          </View>
          <Switch value={allowNotifications} onChange={setAllowNotifications} disabled={isLoading} />
        </View>

        <Button label="Open my wallet →" onPress={() => onComplete(allowNotifications)} disabled={isLoading} variant="light" />
      </View>
    </LinearGradient>
  );
}
