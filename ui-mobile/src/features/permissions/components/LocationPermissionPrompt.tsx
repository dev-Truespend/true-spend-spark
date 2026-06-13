import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
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

function isGranted(state: PermissionState): boolean {
  return state === "authorized_when_in_use" || state === "authorized_always";
}

export function LocationPermissionPrompt({ disabled, scope = "foreground", onReport }: Props) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [needsSettings, setNeedsSettings] = useState(false);
  const [foregroundGranted, setForegroundGranted] = useState(false);

  // For background access iOS uses a two-step flow: grant When-In-Use first (with the precise toggle),
  // then a separate "Always" prompt (which iOS may also defer until after background use). We mirror
  // that — step 1 asks While-Using, step 2 escalates to Always.
  const staged = scope === "background";

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      if (staged && !foregroundGranted) {
        const fg = await requestLocationPermission("foreground");
        if (isGranted(fg.state)) {
          // Stay on this step so the user can escalate to "Always". Reporting here would
          // advance onboarding past the screen before the Always prompt is ever offered.
          setForegroundGranted(true);
          setNeedsSettings(false);
        } else {
          // Declined "While Using" — report so the flow can move on.
          setNeedsSettings(fg.state === "denied" && !fg.canAskAgain);
          onReport(fg.state);
        }
        return;
      }
      // Single-step foreground scope, or the Always escalation after When-In-Use was granted.
      const result = await requestLocationPermission(scope);
      setNeedsSettings(result.state === "denied" && !result.canAskAgain);
      onReport(result.state);
    } finally {
      setIsRequesting(false);
    }
  };

  const allowLabel = isRequesting
    ? "Requesting…"
    : staged
      ? foregroundGranted
        ? "Enable Always Allow"
        : "Allow while using"
      : "Allow while using app";

  // After While-Using is granted, "skip" keeps that grant rather than reporting a denial.
  const skip = () => onReport(staged && foregroundGranted ? "authorized_when_in_use" : "denied");

  return (
    <View style={styles.root}>
      {staged && foregroundGranted ? (
        <Toast
          tone="info"
          message="One more step — allow “Always” so we can flag the best card the moment you arrive at a store, even with the app closed. iOS may also ask again later."
        />
      ) : null}
      <Button
        disabled={disabled || isRequesting}
        label={allowLabel}
        onPress={() => void handleAllow()}
      />
      <Button
        disabled={disabled || isRequesting}
        label={staged && foregroundGranted ? "Keep “While Using”" : "Not now"}
        onPress={skip}
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
