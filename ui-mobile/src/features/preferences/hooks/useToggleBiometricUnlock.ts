import { useCallback } from "react";
import { authenticateWithBiometric } from "@/shared/native/biometrics";
import { useUpdatePreferences } from "@/features/preferences/hooks/useUpdatePreferences";

export function useToggleBiometricUnlock() {
  const updatePreferences = useUpdatePreferences();

  const toggle = useCallback(async (next: boolean): Promise<{ success: boolean; reason?: "cancelled" | "error" }> => {
    if (next) {
      const authenticated = await authenticateWithBiometric("Confirm biometric unlock");
      if (!authenticated) return { success: false, reason: "cancelled" };
    }
    try {
      await updatePreferences.mutateAsync({ biometricUnlockEnabled: next });
      return { success: true };
    } catch {
      return { success: false, reason: "error" };
    }
  }, [updatePreferences]);

  return { toggle, isSaving: updatePreferences.isPending };
}
