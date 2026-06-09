import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { ProLockBadge } from "@/shared/components/ProLockBadge";
import { ProUpsell } from "@/shared/components/ProUpsell";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  onAddManual: () => void;
  onConnectPlaid: () => void;
  onBrowseCatalog: () => void;
  onUpgrade: () => void;
  plaidEnabled: boolean;
};

export function CardEmptyState({ onAddManual, onConnectPlaid, onBrowseCatalog, onUpgrade, plaidEnabled }: Props) {
  return (
    <View style={{ gap: 14 }}>
      <EmptyState
        iconLabel="💳"
        title="No cards yet"
        description="Add at least one card to start getting smart recommendations."
        action={
          <View style={{ gap: 8 }}>
            <Button label="＋ Add manually" onPress={onAddManual} />
            {plaidEnabled ? (
              <Button label="Connect bank with Plaid" onPress={onConnectPlaid} variant="outline" />
            ) : (
              <Button label="Browse card catalog" onPress={onBrowseCatalog} variant="outline" />
            )}
          </View>
        }
      />

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

const styles = StyleSheet.create({
  bullet: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletDot: { fontFamily: fontFamily.bold, color: colors.mutedFg, width: 12 },
  bulletText: { flex: 1, fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.text, lineHeight: 18 }
});
