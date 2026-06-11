import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Toast } from "@/shared/components/Toast";
import { PlaidConnectionCard } from "@/features/plaid/components/PlaidConnectionCard";
import {
  PlaidLinkCancelledError,
  useAddPlaidConnection,
  useDisconnectConnection,
  usePlaidConnections,
  useReconnectConnection,
  useSyncConnection
} from "@/features/plaid/hooks/usePlaidConnections";
import { useResyncQuota } from "@/features/plaid/hooks/useResyncQuota";
import { useEntitlementGate } from "@/shared/navigation/useEntitlementGate";
import { friendlyMessage } from "@/shared/errors/friendlyMessage";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

export function PlaidConnectionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  const gate = useEntitlementGate();
  const { connections, isLoading, error } = usePlaidConnections();
  const addMutation = useAddPlaidConnection();
  const syncMutation = useSyncConnection();
  const reconnectMutation = useReconnectConnection();
  const disconnectMutation = useDisconnectConnection();
  const { quota } = useResyncQuota({ enabled: gate.has("plaid_linking_enabled") });

  if (!gate.has("plaid_linking_enabled")) {
    return (
      <Screen scroll>
        <Header onBack={() => router.back()} />
        <EmptyState
          iconLabel="🔒"
          title="Bank linking is a Pro feature"
          description="Connect Plaid accounts to import transactions automatically. Upgrade to Pro to unlock bank linking."
          action={
            <Button
              label="Upgrade to Pro"
              onPress={() => router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } })}
            />
          }
        />
      </Screen>
    );
  }

  async function handleSync(connectionId: number) {
    // Manual sync is a Pro feature; route non-Pro users to the paywall instead of a failed request.
    if (!gate.isPro) {
      router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } });
      return;
    }
    try {
      await syncMutation.mutateAsync({ connectionId });
    } catch (err) {
      Alert.alert("Sync unavailable", friendlyMessage(err));
    }
  }

  async function handleReconnect(connectionId: number) {
    try {
      await reconnectMutation.mutateAsync({ connectionId });
    } catch (err) {
      if (err instanceof PlaidLinkCancelledError) return;
      Alert.alert("Couldn't reconnect", friendlyMessage(err, "plaid"));
    }
  }

  async function handleAddConnection() {
    try {
      await addMutation.mutateAsync();
    } catch (err) {
      if (err instanceof PlaidLinkCancelledError) return;
      Alert.alert("Couldn't link bank", friendlyMessage(err, "plaid"));
    }
  }

  function handleDisconnect(connectionId: number) {
    Alert.alert("Disconnect account", "This will stop syncing transactions from this account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          try {
            await disconnectMutation.mutateAsync({ connectionId });
            if (connections.length <= 1) router.back();
          } catch (err) {
            Alert.alert("Couldn't disconnect", friendlyMessage(err));
          }
        }
      }
    ]);
  }

  const healthyCount = connections.filter((c) => c.status !== "disconnected" && c.status !== "error").length;

  return (
    <Screen scroll>
      <Header onBack={() => router.back()} />

      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <Toast tone="error" message={error} /> : null}

      {!isLoading && connections.length > 0 ? (
        <Toast
          tone="success"
          message={`${healthyCount} institution${healthyCount === 1 ? "" : "s"} linked${connections.length > healthyCount ? ` · ${connections.length - healthyCount} need re-auth` : ""}`}
        />
      ) : null}

      {!isLoading && connections.length > 0 && gate.isPro && quota ? (
        <Toast
          tone={quota.remaining > 0 ? "info" : "warn"}
          message={
            quota.remaining > 0
              ? `${quota.remaining} of ${quota.limit} manual syncs left today`
              : `You've used all ${quota.limit} manual syncs today · resets tomorrow`
          }
        />
      ) : null}

      {!isLoading && connections.length > 0 && !gate.isPro ? (
        <Toast tone="info" message="Manual sync is a Pro feature. Your accounts still sync automatically every day." />
      ) : null}

      {!isLoading && !error && connections.length === 0 ? (
        <EmptyState
          iconLabel="🏦"
          title="No connected banks yet"
          description="Link a bank to import cards and transactions automatically."
        />
      ) : null}

      {connections.length > 0 ? (
        <>
          <SectionLabel>Connected banks</SectionLabel>
          <View style={{ gap: 8 }}>
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
          </View>
        </>
      ) : null}

      <Button
        label={connections.length === 0 ? "＋ Connect your bank" : "＋ Connect another bank"}
        variant="outline"
        disabled={addMutation.isPending}
        onPress={handleAddConnection}
      />

      <Text style={styles.fineprint}>Plaid access is read-only.</Text>
    </Screen>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} style={styles.iconBtn} accessibilityRole="button">
        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
      </Pressable>
      <Text style={styles.topTitle}>Plaid connections</Text>
      <View style={styles.iconBtn} />
    </View>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconBtn: { width: 36, height: 36, borderRadius: t.radii.md, alignItems: "center", justifyContent: "center" },
    topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: t.colors.text },
    fineprint: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, textAlign: "center" }
  });
}
