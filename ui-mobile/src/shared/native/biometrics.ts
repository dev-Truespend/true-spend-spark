import * as LocalAuthentication from "expo-local-authentication";

export async function isBiometricSupported(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync()
  ]);
  return hasHardware && enrolled;
}

export async function authenticateWithBiometric(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel"
  });
  return result.success;
}
