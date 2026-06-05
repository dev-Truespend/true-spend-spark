import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { onboardingPanelStyles as panelStyles } from "@/features/onboarding/components/onboardingStyles";
import { NotificationTypeList } from "@/features/notification-settings/components/NotificationTypeList";
import { NotificationType } from "@/features/notification-settings/api/notification-settings.api";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  isLoading: boolean;
  types: NotificationType[];
  onSave: (push: boolean, email: boolean) => void;
};

export function NotificationsStep({ isLoading, types, onSave }: Props) {
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);

  return (
    <View style={panelStyles.panel}>
      <Text style={panelStyles.heading}>Notifications</Text>
      <Text style={panelStyles.body}>
        Choose how you want to hear about best-card alerts, missed rewards, weekly summaries, and account notices. You can change this anytime in Settings.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Push notifications</Text>
          <Text style={styles.rowBody}>Real-time alerts on this device.</Text>
        </View>
        <Switch value={push} onValueChange={setPush} disabled={isLoading} />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Email notifications</Text>
          <Text style={styles.rowBody}>Summaries and account notices.</Text>
        </View>
        <Switch value={email} onValueChange={setEmail} disabled={isLoading} />
      </View>

      <NotificationTypeList types={types} />

      <Button disabled={isLoading} label="Save and continue" onPress={() => onSave(push, email)} />
      <Button disabled={isLoading} label="Not now" onPress={() => onSave(false, false)} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  rowBody: { color: colors.muted, fontSize: 13 }
});
