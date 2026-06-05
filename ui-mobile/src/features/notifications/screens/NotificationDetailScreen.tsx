import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { useNotificationDetail } from "@/features/notifications/hooks/useNotificationDetail";
import { useMarkNotificationRead } from "@/features/notifications/hooks/useMarkNotificationRead";
import { useCreateNotificationReminder } from "@/features/notifications/hooks/useCreateNotificationReminder";
import { useMarkNotAMiss } from "@/features/transactions/hooks/useMarkNotAMiss";

export function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const notificationId = Number(id);
  const { detail, isLoading, error } = useNotificationDetail(notificationId);
  const markRead = useMarkNotificationRead();
  const createReminder = useCreateNotificationReminder();
  const markNotAMiss = useMarkNotAMiss();

  useEffect(() => {
    if (detail && !detail.notification.isRead) {
      markRead.mutate(notificationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.notification.id]);

  const [showReminder, setShowReminder] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (detail?.notification && !reminderTitle && !reminderBody) {
      setReminderTitle(detail.notification.title);
      setReminderBody(detail.notification.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.notification.id]);

  async function handleCreateReminder() {
    setFormError(null);
    const parsed = remindAt ? new Date(remindAt) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      setFormError("Enter a valid future date (e.g. 2026-06-10T09:00).");
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      setFormError("Reminder must be in the future.");
      return;
    }
    try {
      await createReminder.mutateAsync({
        sourceNotificationId: notificationId,
        remindAt: parsed.toISOString(),
        title: reminderTitle.trim() || detail?.notification.title || "Reminder",
        body: reminderBody.trim() || detail?.notification.body || ""
      });
      Alert.alert("Reminder set", "We will remind you at the chosen time.");
      setShowReminder(false);
      setRemindAt("");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  function handleOpenTransaction() {
    const txId = detail?.relatedTransaction?.id;
    if (txId) router.push(`/(app)/transactions/${txId}`);
  }

  async function handleMarkNotAMiss() {
    const missedId = detail?.relatedMissedReward?.id;
    if (!missedId) return;
    Alert.alert("Mark not a miss?", "This dismisses the reward miss alert for this transaction.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          await markNotAMiss.mutateAsync(missedId);
        }
      }
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !detail ? null : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{detail.notification.title}</Text>
          <Text style={styles.meta}>{new Date(detail.notification.createdAt).toLocaleString()}</Text>
          <Text style={styles.body}>{detail.notification.body}</Text>

          {detail.relatedTransaction ? (
            <TouchableOpacity onPress={handleOpenTransaction} style={styles.section}>
              <Text style={styles.sectionLabel}>Related transaction</Text>
              <Text style={styles.sectionValue}>
                {detail.relatedTransaction.merchantName} · {detail.relatedTransaction.amount.formatted}
              </Text>
              <Text style={styles.sectionAction}>View transaction →</Text>
            </TouchableOpacity>
          ) : null}

          {detail.relatedMissedReward ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Missed reward</Text>
              <Text style={styles.sectionValue}>
                {detail.relatedMissedReward.merchantName}
              </Text>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareTitle}>You used</Text>
                  <Text style={styles.compareCard}>
                    {detail.relatedMissedReward.actualCard?.displayName ?? "Card"}
                  </Text>
                  <Text style={styles.compareValue}>
                    {detail.relatedMissedReward.actualReward.formatted}
                  </Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={styles.compareTitle}>Better choice</Text>
                  <Text style={styles.compareCard}>
                    {detail.relatedMissedReward.betterCard?.displayName ?? "Card"}
                  </Text>
                  <Text style={[styles.compareValue, styles.compareValueBetter]}>
                    {detail.relatedMissedReward.potentialReward.formatted}
                  </Text>
                </View>
              </View>
              <Text style={styles.missedDelta}>
                Missed reward: {detail.relatedMissedReward.missedReward.formatted}
              </Text>
              {!detail.relatedMissedReward.isDismissed ? (
                <Button
                  disabled={markNotAMiss.isPending}
                  label="Mark not a miss"
                  onPress={handleMarkNotAMiss}
                  variant="secondary"
                />
              ) : (
                <Text style={styles.dismissed}>Marked as not a miss</Text>
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Reminder</Text>
            {showReminder ? (
              <View style={styles.reminderForm}>
                <Text style={styles.label}>Remind me at</Text>
                <TextInput
                  onChangeText={setRemindAt}
                  placeholder="YYYY-MM-DDTHH:MM"
                  value={remindAt}
                />
                <Text style={styles.label}>Title</Text>
                <TextInput onChangeText={setReminderTitle} placeholder="Title" value={reminderTitle} />
                <Text style={styles.label}>Body</Text>
                <TextInput onChangeText={setReminderBody} placeholder="Body" value={reminderBody} />
                {formError ? <Text style={styles.error}>{formError}</Text> : null}
                <Button
                  disabled={createReminder.isPending}
                  label={createReminder.isPending ? "Saving…" : "Set reminder"}
                  onPress={handleCreateReminder}
                />
              </View>
            ) : (
              <Button label="Set a reminder" onPress={() => setShowReminder(true)} variant="secondary" />
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md
  },
  back: {
    color: colors.primary,
    fontSize: 15
  },
  loader: {
    marginTop: spacing.xl
  },
  error: {
    color: colors.danger,
    textAlign: "center"
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  meta: {
    color: colors.muted,
    fontSize: 12
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  sectionValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs
  },
  compareRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  compareCol: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: spacing.sm
  },
  compareTitle: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  compareCard: { color: colors.text, fontSize: 13, fontWeight: "600" },
  compareValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  compareValueBetter: { color: colors.primary },
  missedDelta: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: spacing.xs },
  dismissed: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  reminderForm: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600" }
});
