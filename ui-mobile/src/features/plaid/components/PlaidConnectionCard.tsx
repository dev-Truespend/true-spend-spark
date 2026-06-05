import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { PlaidConnection } from "@/features/plaid/types/plaid.types";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  connection: PlaidConnection;
  onSync: (connectionId: number) => void;
  onReconnect: (connectionId: number) => void;
  onDisconnect: (connectionId: number) => void;
  isSyncing?: boolean;
  isDisconnecting?: boolean;
};

export function PlaidConnectionCard({
  connection,
  onSync,
  onReconnect,
  onDisconnect,
  isSyncing,
  isDisconnecting
}: Props) {
  const needsReconnect = connection.status === "disconnected" || connection.status === "error";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{connection.institutionName}</Text>
        <View style={[styles.statusDot, needsReconnect ? styles.statusError : styles.statusActive]} />
      </View>
      <Text style={styles.meta}>
        {connection.cardCount} card{connection.cardCount !== 1 ? "s" : ""}
        {connection.lastSyncAt ? ` • Synced ${new Date(connection.lastSyncAt).toLocaleDateString()}` : ""}
      </Text>

      <View style={styles.actions}>
        {needsReconnect ? (
          <Button label="Reconnect" onPress={() => onReconnect(connection.id)} variant="secondary" />
        ) : (
          <Button
            label="Sync now"
            onPress={() => onSync(connection.id)}
            variant="secondary"
            disabled={isSyncing}
          />
        )}
        <Button
          label="Disconnect"
          onPress={() => onDisconnect(connection.id)}
          variant="danger"
          disabled={isDisconnecting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  statusActive: {
    backgroundColor: colors.primary
  },
  statusError: {
    backgroundColor: colors.danger
  },
  meta: {
    color: colors.muted,
    fontSize: 13
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  }
});
