import { scaleFont } from "@/shared/theme/typography";
import { StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Status = "checking" | "available" | "unavailable";

type Props = {
  enabled: boolean;
  status: Status;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export function BiometricToggle({ enabled, status, disabled, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>Biometric unlock</Text>
        <Text style={styles.help}>{statusHelp(status)}</Text>
      </View>
      <Switch
        accessibilityLabel="Biometric unlock toggle"
        disabled={disabled || status !== "available"}
        onValueChange={onChange}
        thumbColor={enabled ? colors.primary : colors.surface}
        trackColor={{ false: colors.border, true: colors.primary }}
        value={enabled}
      />
    </View>
  );
}

function statusHelp(status: Status): string {
  switch (status) {
    case "checking":
      return "Checking device support…";
    case "unavailable":
      return "Set up Face ID, Touch ID, or fingerprint in system settings.";
    case "available":
    default:
      return "Use Face ID, Touch ID, or fingerprint to open TrueSpend.";
  }
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  text: {
    flex: 1
  },
  label: {
    color: colors.text,
    fontSize: scaleFont(16),
    fontWeight: "600"
  },
  help: {
    color: colors.muted,
    fontSize: scaleFont(13),
    marginTop: 2
  }
});