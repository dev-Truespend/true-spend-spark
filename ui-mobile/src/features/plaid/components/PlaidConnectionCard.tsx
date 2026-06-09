import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { PlaidConnection } from "@/features/plaid/types/plaid.types";
import { colors, palette, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  connection: PlaidConnection;
  onSync: (connectionId: number) => void;
  onReconnect: (connectionId: number) => void;
  onDisconnect: (connectionId: number) => void;
  isSyncing?: boolean;
  isDisconnecting?: boolean;
};

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export function PlaidConnectionCard({
  connection,
  onSync,
  onReconnect,
  onDisconnect,
  isSyncing,
  isDisconnecting
}: Props) {
  const needsReconnect = connection.status === "disconnected" || connection.status === "error";
  const syncLabel = connection.lastSyncAt
    ? `Synced ${new Date(connection.lastSyncAt).toLocaleDateString()}`
    : "Never synced";

  return (
    <View style={[styles.card, needsReconnect && styles.cardWarn]}>
      <View style={styles.headerRow}>
        <View style={[styles.logo, { backgroundColor: needsReconnect ? colors.destructive : colors.primary }]}>
          <Text style={styles.logoText}>{initials(connection.institutionName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{connection.institutionName}</Text>
          <Text style={styles.meta}>
            {connection.cardCount} card{connection.cardCount !== 1 ? "s" : ""} · {syncLabel}
          </Text>
        </View>
        {needsReconnect ? (
          <Badge tone="amber" label="Re-auth needed" />
        ) : (
          <Badge tone="green" label="Healthy" />
        )}
      </View>

      <View style={styles.actions}>
        {needsReconnect ? (
          <Button label="Reconnect" onPress={() => onReconnect(connection.id)} size="sm" />
        ) : (
          <Button
            label={isSyncing ? "Syncing…" : "Sync now"}
            loading={!!isSyncing}
            onPress={() => onSync(connection.id)}
            variant="outline"
            size="sm"
          />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => onDisconnect(connection.id)}
          disabled={isDisconnecting}
          style={styles.disconnect}
        >
          <Text style={styles.disconnectText}>Disconnect</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xxl,
    padding: 14,
    gap: 10
  },
  cardWarn: { borderColor: tints.amber.border },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  logoText: { color: palette.white, fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(12), letterSpacing: 0.4 },
  name: { fontFamily: fontFamily.bold, fontSize: scaleFont(14), fontWeight: "700", color: colors.text },
  meta: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.mutedFg, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  disconnect: { paddingHorizontal: 12, paddingVertical: 8, marginLeft: "auto" },
  disconnectText: {
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
    fontSize: scaleFont(12),
    color: tints.red.fg
  }
});
