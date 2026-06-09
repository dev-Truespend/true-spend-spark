import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { Toast } from "@/shared/components/Toast";
import { spacing } from "@/shared/theme/spacing";
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
      <Button
        disabled={disabled || isRequesting}
        label={allowLabel}
        onPress={() => void handleAllow()}
      />
      <Button
        disabled={disabled || isRequesting}
        label="Not now"
        onPress={() => onReport("denied")}
        variant="outline"
      />
      {needsSettings ? (
        <View style={{ marginTop: 8, gap: 8 }}>
          <Toast tone="warn" message="Location is blocked. Open system settings to enable it." />
          <Button label="Open settings" onPress={() => void Linking.openSettings()} variant="light" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm
  }
});
