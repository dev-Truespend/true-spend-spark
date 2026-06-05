import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { spacing } from "@/shared/theme/spacing";
import { colors } from "@/shared/theme/colors";
import { PermissionState } from "@/features/permissions/types/permissions.types";
import { requestLocationPermission, LocationScope } from "@/shared/native/location";

type Props = {
  disabled?: boolean;
  scope?: LocationScope;
  onReport: (state: PermissionState) => void;
};

export function LocationPermissionPrompt({ disabled, scope = "foreground", onReport }: Props) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [needsSettings, setNeedsSettings] = useState(false);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const result = await requestLocationPermission(scope);
      setNeedsSettings(result.state === "denied" && !result.canAskAgain);
      onReport(result.state);
    } finally {
      setIsRequesting(false);
    }
  };

  const allowLabel =
    scope === "background"
      ? isRequesting
        ? "Requesting…"
        : "Allow always"
      : isRequesting
        ? "Requesting…"
        : "Allow while using app";

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Button disabled={disabled || isRequesting} label={allowLabel} onPress={() => void handleAllow()} />
        <Button disabled={disabled || isRequesting} label="Not now" onPress={() => onReport("denied")} variant="secondary" />
      </View>
      {needsSettings ? (
        <View style={styles.settingsRow}>
          <Text style={styles.settingsText}>Location is blocked. Open system settings to enable it.</Text>
          <Button label="Open settings" onPress={() => void Linking.openSettings()} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  settingsRow: {
    gap: spacing.xs
  },
  settingsText: {
    color: colors.muted,
    fontSize: 13
  }
});
