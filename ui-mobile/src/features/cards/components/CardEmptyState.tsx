import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { GradientHeroCard } from "@/shared/components/GradientHeroCard";
import { ProLockBadge } from "@/shared/components/ProLockBadge";
import { ProUpsell } from "@/shared/components/ProUpsell";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { GlobeCard } from "@/features/cards/components/GlobeCard";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  onAddManual: () => void;
  onConnectPlaid: () => void;
  onBrowseCatalog: () => void;
  onUpgrade: () => void;
  onOpenMap: () => void;
  plaidEnabled: boolean;
};

export function CardEmptyState({
  onAddManual,
  onConnectPlaid,
  onBrowseCatalog,
  onUpgrade,
  onOpenMap,
  plaidEnabled
}: Props) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      bullet: { flexDirection: "row", alignItems: "center", gap: 8 },
      bulletDot: { fontFamily: fontFamily.bold, color: t.colors.primary, width: 12 },
      bulletText: { flex: 1, fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.text, lineHeight: 18 }
    })
  );

  return (
    <View style={{ gap: 14 }}>
      <GradientHeroCard
        tag="✦ Get started"
        title="Add your first card"
        subtitle="TrueSpend tells you the best card to swipe at every store — and what you'd miss with the wrong one."
        gradient="brand"
      />

      <View style={{ gap: 8 }}>
        <Button label="＋ Add manually" onPress={onAddManual} />
        {plaidEnabled ? (
          <Button label="Connect bank with Plaid" onPress={onConnectPlaid} variant="outline" />
        ) : (
          <Button label="Browse card catalog" onPress={onBrowseCatalog} variant="outline" />
        )}
      </View>

      <GlobeCard onPress={onOpenMap} />

      <ProUpsell
        title={plaidEnabled ? "Basic includes Plaid" : "Upgrade to connect a bank"}
        body={
          plaidEnabled
            ? "Connect up to 3 Plaid accounts and add 2 manual cards. Upgrade to Pro for unlimited links."
            : "Bank linking unlocks live syncs and missed-rewards alerts. Available on Pro."
        }
        ctaLabel={plaidEnabled ? "Get Pro" : "Upgrade to Pro"}
        onPress={onUpgrade}
      />

      <View style={{ gap: 6 }}>
        <SectionLabel>What you'll get with a card linked</SectionLabel>
        <View style={{ gap: 6 }}>
          {[
            'Real-time "best card to swipe" at any store',
            '"Why this card?" reasoning vs. your others',
            "Online merchant search & URL detection"
          ].map((b) => (
            <View key={b} style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
          <View style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Missed-rewards alerts after each purchase</Text>
            <ProLockBadge />
          </View>
        </View>
      </View>
    </View>
  );
}
