import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { AvatarPicker } from "@/features/settings/components/AvatarPicker";
import { BiometricToggle } from "@/features/settings/components/BiometricToggle";
import { CurrencyPicker } from "@/features/settings/components/CurrencyPicker";
import { SectionHeader } from "@/features/settings/components/SectionHeader";
import { SignInMethodsList } from "@/features/settings/components/SignInMethodsList";
import { useBiometricStatus } from "@/features/profile/hooks/useBiometricStatus";
import { useToggleBiometricUnlock } from "@/features/preferences/hooks/useToggleBiometricUnlock";
import { usePickAvatar } from "@/features/profile/hooks/usePickAvatar";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { usePreferences } from "@/features/preferences/hooks/usePreferences";
import { useAddPhoneSignIn } from "@/features/auth/hooks/useAddPhoneSignIn";
import { useSignInMethods } from "@/features/auth/hooks/useSignInMethods";

export function EditProfileScreen() {
  const profileQuery = useProfile();
  const preferencesQuery = usePreferences();
  const updateProfile = useUpdateProfile();
  const avatarPicker = usePickAvatar();
  const biometricStatus = useBiometricStatus();
  const biometricToggle = useToggleBiometricUnlock();
  const signInMethodsQuery = useSignInMethods();
  const addPhoneSignIn = useAddPhoneSignIn();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!profileQuery.data) return;
    setDisplayName(profileQuery.data.displayName);
    setPhone(profileQuery.data.phone ?? "");
    setCurrencyCode(profileQuery.data.currencyCode ?? "");
  }, [profileQuery.data]);

  const submit = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({
        displayName: displayName.trim(),
        phone,
        currencyCode: currencyCode || undefined
      });
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message ?? "Could not save profile.");
    }
  };

  const handlePickAvatar = async () => {
    setError(null);
    const result = await avatarPicker.pickAndUpload();
    if (result.status === "permission-denied") {
      Alert.alert("Permission needed", "TrueSpend needs access to your photo library to change your profile photo.");
    } else if (result.status === "error") {
      setError(result.message);
    }
  };

  const handleBiometric = async (next: boolean) => {
    if (biometricStatus === "unavailable" && next) {
      Alert.alert("Biometrics unavailable", "Set up Face ID, Touch ID, or fingerprint unlock in your device settings, then try again.");
      return;
    }
    const result = await biometricToggle.toggle(next);
    if (!result.success && result.reason === "error") {
      setError("Could not update biometric setting.");
    }
  };

  const handleSendOtp = async () => {
    setOtpMessage(null);
    setOtpError(null);
    try {
      await addPhoneSignIn.mutateAsync({ phone: otpPhone });
      setOtpMessage("OTP sent. Verify on the sign-in screen to link your phone.");
    } catch (e) {
      setOtpError((e as Error).message ?? "Could not send OTP.");
    }
  };

  const profile = profileQuery.data;
  const preferences = preferencesQuery.data;

  if (!profile) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Edit profile" }} />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </Screen>
    );
  }

  const avatarErrorMessage = avatarPicker.result.status === "error" ? avatarPicker.result.message : null;
  const hasPhoneMethod = signInMethodsQuery.data?.some((m) => m.provider === "phone") ?? false;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Edit profile" }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AvatarPicker
            errorMessage={avatarErrorMessage}
            isUploading={avatarPicker.isUploading}
            onPick={() => void handlePickAvatar()}
            profile={profile}
          />

          <SectionHeader title="Account details" />
          <View style={styles.group}>
            <View>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                accessibilityLabel="Display name"
                autoCapitalize="words"
                onChangeText={setDisplayName}
                placeholder="Your name"
                value={displayName}
              />
            </View>
            <View>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                accessibilityLabel="Phone number"
                autoComplete="tel"
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="+1 555 010 0123"
                value={phone}
              />
            </View>
            <View>
              <Text style={styles.label}>Primary currency</Text>
              <CurrencyPicker onChange={setCurrencyCode} value={currencyCode} />
            </View>
          </View>

          <SectionHeader title="Security" />
          <BiometricToggle
            disabled={biometricToggle.isSaving}
            enabled={!!preferences?.biometricUnlockEnabled}
            onChange={(next) => void handleBiometric(next)}
            status={biometricStatus}
          />

          <SectionHeader title="Sign-in methods" />
          <SignInMethodsList
            errorMessage={otpError}
            isLoading={signInMethodsQuery.isLoading}
            isSending={addPhoneSignIn.isPending}
            message={otpMessage}
            methods={signInMethodsQuery.data}
            onChangePhone={setOtpPhone}
            onSendOtp={() => void handleSendOtp()}
            phone={otpPhone}
            showAddPhone={!hasPhoneMethod}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {savedAt && !error ? <Text style={styles.success}>Profile saved.</Text> : null}

          <View style={styles.actions}>
            <Button
              disabled={updateProfile.isPending}
              label={updateProfile.isPending ? "Saving…" : "Save changes"}
              onPress={() => void submit()}
            />
            <Button label="Done" onPress={() => router.back()} variant="secondary" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scroll: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  loader: {
    marginTop: spacing.xl
  },
  group: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.xs
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  error: {
    color: colors.danger,
    fontSize: 14
  },
  success: {
    color: colors.primary,
    fontSize: 14
  }
});
