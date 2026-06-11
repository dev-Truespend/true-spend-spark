import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { Screen } from "@/shared/components/Screen";
import { TextInput } from "@/shared/components/TextInput";
import { Toast } from "@/shared/components/Toast";
import { useTheme } from "@/providers/ThemeProvider";
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
  const { colors } = useTheme();
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
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      </Screen>
    );
  }

  const avatarErrorMessage = avatarPicker.result.status === "error" ? avatarPicker.result.message : null;
  const hasPhoneMethod = signInMethodsQuery.data?.some((m) => m.provider === "phone") ?? false;

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Edit profile" }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <AvatarPicker
          errorMessage={avatarErrorMessage}
          isUploading={avatarPicker.isUploading}
          onPick={() => void handlePickAvatar()}
          profile={profile}
        />

        <SectionHeader title="Account details" />
        <Card>
          <View style={{ gap: 12 }}>
            <TextInput
              label="Display name"
              accessibilityLabel="Display name"
              autoCapitalize="words"
              onChangeText={setDisplayName}
              placeholder="Your name"
              value={displayName}
            />
            <TextInput
              label="Email"
              accessibilityLabel="Email (read-only)"
              accessibilityHint="Email is read-only. Contact support to change."
              editable={false}
              onChangeText={() => {}}
              value={profile.email}
            />
            <TextInput
              label="Phone"
              accessibilityLabel="Phone number"
              autoComplete="tel"
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+1 555 010 0123"
              value={phone}
            />
            <View>
              <CurrencyPicker onChange={setCurrencyCode} value={currencyCode} />
            </View>
          </View>
        </Card>

        <SectionHeader title="Security" />
        <Card>
          <BiometricToggle
            disabled={biometricToggle.isSaving}
            enabled={!!preferences?.biometricUnlockEnabled}
            onChange={(next) => void handleBiometric(next)}
            status={biometricStatus}
          />
        </Card>

        <SectionHeader title="Sign-in methods" />
        <Card>
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
        </Card>

        {error ? <Toast tone="error" message={error} /> : null}
        {savedAt && !error ? <Toast tone="success" message="Profile saved." /> : null}

        <View style={styles.actions}>
          <Button
            disabled={updateProfile.isPending}
            loading={updateProfile.isPending}
            label="Save changes"
            onPress={() => void submit()}
          />
          <Button label="Done" onPress={() => router.back()} variant="outline" />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8, marginTop: 16 }
});
