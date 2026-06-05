import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { PlaidConnectionCard } from "@/features/plaid/components/PlaidConnectionCard";
import {
  PlaidLinkCancelledError,
  useDisconnectConnection,
  usePlaidConnections,
  useReconnectConnection,
  useSyncConnection
} from "@/features/plaid/hooks/usePlaidConnections";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export function PlaidConnectionsScreen() {
  const router = useRouter();
  const gate = useEntitlementGate();
  const { connections, isLoading, error } = usePlaidConnections();
  const syncMutation = useSyncConnection();
  const reconnectMutation = useReconnectConnection();
  const disconnectMutation = useDisconnectConnection();

  if (!gate.has("plaid_linking_enabled")) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Connected accounts</Text>
          <View style={styles.gateBanner}>
            <Text style={styles.gateHeading}>Bank linking is a Pro feature</Text>
            <Text style={styles.gateBody}>
              Connect Plaid bank accounts to import transactions automatically. Upgrade to Pro to unlock bank linking.
            </Text>
            <Button
              label="Upgrade to Pro"
              onPress={() => router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } })}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  async function handleSync(connectionId: number) {
    await syncMutation.mutateAsync({ connectionId });
  }

  async function handleReconnect(connectionId: number) {
    try {
      await reconnectMutation.mutateAsync({ connectionId });
    } catch (err) {
      if (err instanceof PlaidLinkCancelledError) return;
      throw err;
    }
  }

  function handleDisconnect(connectionId: number) {
    Alert.alert("Disconnect account", "This will stop syncing transactions from this account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await disconnectMutation.mutateAsync({ connectionId });
          if (connections.length <= 1) {
            router.back();
          }
        }
      }
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Connected accounts</Text>

        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!isLoading && !error && connections.length === 0 ? (
          <Text style={styles.empty}>No connected bank accounts.</Text>
        ) : null}

        {connections.map((connection) => (
          <PlaidConnectionCard
            key={connection.id}
            connection={connection}
            onSync={handleSync}
            onReconnect={handleReconnect}
            onDisconnect={handleDisconnect}
            isSyncing={syncMutation.isPending}
            isDisconnecting={disconnectMutation.isPending}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center"
  },
  error: {
    color: colors.danger,
    fontSize: 14
  },
  gateBanner: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  gateHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  gateBody: {
    color: colors.muted,
    fontSize: 14
  }
});
