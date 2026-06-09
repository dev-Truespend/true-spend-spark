import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ProgressBar } from "@/shared/components/ProgressBar";
import { ReasonCard } from "@/shared/components/ReasonCard";
import { Screen } from "@/shared/components/Screen";
import { SectionLabel } from "@/shared/components/SectionLabel";
import { Switch } from "@/shared/components/Switch";
import { TextInput } from "@/shared/components/TextInput";
import { Toast } from "@/shared/components/Toast";
import { colors, gradients, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { shadows } from "@/shared/theme/shadows";
import { useNotificationDetail } from "@/features/notifications/hooks/useNotificationDetail";
import { useMarkNotificationRead } from "@/features/notifications/hooks/useMarkNotificationRead";
import { useCreateNotificationReminder } from "@/features/notifications/hooks/useCreateNotificationReminder";
import { useMarkNotAMiss } from "@/features/transactions/hooks/useMarkNotAMiss";
import { NotificationDetail } from "@/features/notifications/types/notifications.types";

type HeroVariant = "missed" | "reward" | "security" | "default";

function heroVariantFor(detail: NotificationDetail): HeroVariant {
  if (detail.relatedMissedReward) return "missed";
  const lower = detail.notification.typeCode.toLowerCase();
  if (lower.includes("missed")) return "missed";
  if (lower.includes("unusual") || lower.includes("security")) return "security";
  if (lower.includes("reward") || lower.includes("earn")) return "reward";
  return "default";
}

function heroTitleFor(detail: NotificationDetail): string {
  const missed = detail.relatedMissedReward;
  if (missed) return `You lost ${missed.missedReward.formatted}`;
  return detail.notification.title;
}

function heroMetaFor(detail: NotificationDetail): string {
  const missed = detail.relatedMissedReward;
  if (missed) {
    const merchant = missed.merchantName || detail.relatedTransaction?.merchantName || "Recent purchase";
    return merchant;
  }
  return new Date(detail.notification.createdAt).toLocaleString();
}

function topBarTitleFor(detail: NotificationDetail | null | undefined): string {
  if (!detail) return "Notification";
  if (detail.relatedMissedReward) return "Missed rewards";
  const lower = detail.notification.typeCode.toLowerCase();
  if (lower.includes("unusual") || lower.includes("security")) return "Security alert";
  if (lower.includes("summary")) return "Summary";
  return "Notification";
}

const HERO_STYLES: Record<HeroVariant, { gradient: keyof typeof gradients; glyph: string; shadow: keyof typeof shadows | null }> = {
  missed: { gradient: "warm", glyph: "💸", shadow: "brandWarm" },
  reward: { gradient: "warm", glyph: "⭐", shadow: "brandWarm" },
  security: { gradient: "warm", glyph: "🚨", shadow: "brandWarm" },
  default: { gradient: "brand", glyph: "💡", shadow: "brandBlue" }
};

function plusOneWeek(): string {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  now.setHours(9, 0, 0, 0);
  return now.toISOString();
}

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

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [quickReminderSet, setQuickReminderSet] = useState(false);

  useEffect(() => {
    if (detail?.notification && !reminderTitle && !reminderBody) {
      setReminderTitle(detail.notification.title);
      setReminderBody(detail.notification.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.notification.id]);

  const variant = useMemo(() => (detail ? heroVariantFor(detail) : "default"), [detail]);
  const heroStyle = HERO_STYLES[variant];
  const heroTitle = detail ? heroTitleFor(detail) : "";
  const heroMeta = detail ? heroMetaFor(detail) : "";
  const merchantName = detail?.relatedMissedReward?.merchantName || detail?.relatedTransaction?.merchantName || null;

  const captureRatio = useMemo(() => {
    const missed = detail?.relatedMissedReward;
    if (!missed) return null;
    const actual = missed.actualReward.amount;
    const potential = missed.potentialReward.amount;
    if (potential <= 0) return null;
    return Math.max(0, Math.min(1, actual / potential));
  }, [detail]);

  async function handleCustomReminder() {
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
      setShowCustomForm(false);
      setRemindAt("");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function handleQuickReminder(next: boolean) {
    setQuickReminderSet(next);
    if (!next || !detail) return;
    const merchantText = merchantName ?? "this card";
    try {
      await createReminder.mutateAsync({
        sourceNotificationId: notificationId,
        remindAt: plusOneWeek(),
        title: `Use the right card at ${merchantText}`,
        body: detail.notification.body
      });
    } catch (err) {
      setQuickReminderSet(false);
      Alert.alert("Could not set reminder", (err as Error).message);
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
      { text: "Confirm", onPress: async () => { await markNotAMiss.mutateAsync(missedId); } }
    ]);
  }

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>{topBarTitleFor(detail)}</Text>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <Toast tone="error" message={error} />
      ) : !detail ? null : (
        <>
          <View style={styles.hero}>
            <LinearGradient
              colors={[...gradients[heroStyle.gradient]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconBox, heroStyle.shadow ? shadows[heroStyle.shadow] : undefined]}
            >
              <Text style={styles.iconGlyph}>{heroStyle.glyph}</Text>
            </LinearGradient>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroMeta}>{heroMeta}</Text>
            {detail.relatedMissedReward ? (
              <Badge tone="amber" label={`Missed ${detail.relatedMissedReward.missedReward.formatted}`} style={{ marginTop: 6 }} />
            ) : null}
          </View>

          {!detail.relatedMissedReward ? (
            <Card>
              <Text style={styles.body}>{detail.notification.body}</Text>
            </Card>
          ) : null}

          {detail.relatedMissedReward ? (
            <Card>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>You used</Text>
                  <Text style={styles.compareCard}>{detail.relatedMissedReward.actualCard?.displayName ?? "Card"}</Text>
                  <Text style={[styles.compareValue, { color: colors.primary }]}>
                    {detail.relatedMissedReward.actualReward.formatted}
                  </Text>
                </View>
                <View style={[styles.compareCol, styles.compareColBetter]}>
                  <Text style={styles.compareLabel}>Should have used</Text>
                  <Text style={styles.compareCard}>{detail.relatedMissedReward.betterCard?.displayName ?? "Card"}</Text>
                  <Text style={[styles.compareValue, { color: colors.destructive }]}>
                    {detail.relatedMissedReward.potentialReward.formatted}
                  </Text>
                </View>
              </View>
              {captureRatio !== null ? (
                <View style={{ marginTop: 12 }}>
                  <ProgressBar value={captureRatio} />
                  <Text style={styles.captureCaption}>
                    {Math.round(captureRatio * 100)}% of available rewards captured
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {detail.relatedMissedReward ? (
            <ReasonCard
              title="🧠 Why this matters"
              body={`Use ${detail.relatedMissedReward.betterCard?.displayName ?? "the better card"} for ${merchantName ?? "this merchant"} next time to capture the full reward.`}
            />
          ) : null}

          {detail.relatedTransaction ? (
            <Card onPress={handleOpenTransaction}>
              <SectionLabel>Related transaction</SectionLabel>
              <View style={styles.relatedRow}>
                <Text style={styles.relatedTitle}>{detail.relatedTransaction.merchantName}</Text>
                <Text style={styles.relatedAmount}>{detail.relatedTransaction.amount.formatted}</Text>
              </View>
              <Text style={styles.relatedAction}>View transaction →</Text>
            </Card>
          ) : null}

          <SectionLabel>Set a future reminder</SectionLabel>
          {merchantName ? (
            <Card padded={false} style={styles.reminderGroup}>
              <ToggleRow
                title={`Remind me about ${merchantName} next week`}
                disabled={createReminder.isPending}
                value={quickReminderSet}
                onChange={(v) => void handleQuickReminder(v)}
                divider={false}
              />
            </Card>
          ) : null}

          {showCustomForm ? (
            <Card>
              <View style={{ gap: 10 }}>
                <TextInput
                  label="Remind me at"
                  placeholder="2026-06-10T09:00"
                  value={remindAt}
                  onChangeText={setRemindAt}
                />
                <TextInput label="Title" value={reminderTitle} onChangeText={setReminderTitle} />
                <TextInput label="Body" value={reminderBody} onChangeText={setReminderBody} />
                {formError ? <Toast tone="error" message={formError} /> : null}
                <Button
                  disabled={createReminder.isPending}
                  loading={createReminder.isPending}
                  label="Set custom reminder"
                  onPress={handleCustomReminder}
                />
              </View>
            </Card>
          ) : (
            <Button
              label={merchantName ? "Set a custom time instead" : "Set a custom reminder"}
              onPress={() => setShowCustomForm(true)}
              variant="outline"
            />
          )}

          {detail.relatedTransaction ? (
            <Button label="View related transaction" onPress={handleOpenTransaction} />
          ) : null}
          {detail.relatedMissedReward && !detail.relatedMissedReward.isDismissed ? (
            <Button label="Mark as not a miss" onPress={handleMarkNotAMiss} variant="outline" />
          ) : detail.relatedMissedReward?.isDismissed ? (
            <Text style={styles.dismissed}>Marked as not a miss</Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function ToggleRow({
  title,
  value,
  onChange,
  disabled,
  divider = true
}: {
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, divider && styles.toggleDivider]}>
      <Text style={styles.toggleLabel}>{title}</Text>
      <Switch value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(15), color: colors.text },
  hero: { alignItems: "center", paddingVertical: 16, gap: 6 },
  iconBox: { width: 84, height: 84, borderRadius: radii.hero, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  iconGlyph: { fontSize: scaleFont(36) },
  heroTitle: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(20), color: colors.text, textAlign: "center", letterSpacing: -0.4 },
  heroMeta: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg, textAlign: "center" },
  body: { fontFamily: fontFamily.regular, fontSize: scaleFont(14), color: colors.text, lineHeight: 21 },
  compareRow: { flexDirection: "row", gap: 8 },
  compareCol: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 10,
    gap: 4
  },
  compareColBetter: { backgroundColor: tints.red.wash, borderColor: tints.red.border, borderWidth: 1 },
  compareLabel: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(10), color: colors.mutedFg, letterSpacing: 0.6, textTransform: "uppercase" },
  compareCard: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), color: colors.text },
  compareValue: { fontFamily: fontFamily.heavy, fontWeight: "800", fontSize: scaleFont(18), letterSpacing: -0.3 },
  captureCaption: { fontFamily: fontFamily.regular, fontSize: scaleFont(11), color: colors.mutedFg, marginTop: 6, textAlign: "center" },
  relatedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  relatedTitle: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(14), color: colors.text },
  relatedAmount: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(13), color: colors.text },
  relatedAction: { color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(12), marginTop: 6 },
  reminderGroup: { paddingHorizontal: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  toggleDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { flex: 1, fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(13), color: colors.text },
  dismissed: { fontFamily: fontFamily.regular, fontSize: scaleFont(12), color: colors.mutedFg, textAlign: "center", marginTop: 4 }
});
