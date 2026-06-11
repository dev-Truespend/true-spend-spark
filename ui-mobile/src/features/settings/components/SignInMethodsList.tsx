import { scaleFont } from "@/shared/theme/typography";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { spacing } from "@/shared/theme/spacing";
import { SignInMethod } from "@/features/auth/hooks/useSignInMethods";

type Props = {
  methods: SignInMethod[] | undefined;
  isLoading: boolean;
  showAddPhone: boolean;
  phone: string;
  isSending: boolean;
  message?: string | null;
  errorMessage?: string | null;
  onChangePhone: (value: string) => void;
  onSendOtp: () => void;
};

export function SignInMethodsList({
  methods,
  isLoading,
  showAddPhone,
  phone,
  isSending,
  message,
  errorMessage,
  onChangePhone,
  onSendOtp
}: Props) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      {isLoading ? <Text style={styles.muted}>Loading sign-in methods…</Text> : null}
      {methods?.map((row) => (
        <View key={`${row.provider}-${row.id}`} style={styles.row}>
          <Text style={styles.method}>{providerLabel(row.provider)}</Text>
          {row.detail ? <Text style={styles.detail} numberOfLines={1}>{row.detail}</Text> : null}
        </View>
      ))}

      {showAddPhone ? (
        <View style={styles.addPhone}>
          <Text style={styles.label}>Add phone OTP</Text>
          <TextInput
            autoComplete="tel"
            keyboardType="phone-pad"
            onChangeText={onChangePhone}
            placeholder="+1 555 010 0123"
            value={phone}
          />
          <Button
            disabled={isSending}
            label={isSending ? "Sending…" : "Send code"}
            onPress={onSendOtp}
            variant="outline"
          />
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function providerLabel(code: string): string {
  switch (code) {
    case "email":
      return "Email magic link";
    case "phone":
      return "Phone OTP";
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    default:
      return code.charAt(0).toUpperCase() + code.slice(1);
  }
}

const useStyles = () =>
  useThemedStyles((t) =>
    StyleSheet.create({
      container: {
        gap: spacing.sm
      },
      row: {
        alignItems: "center",
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md
      },
      method: {
        color: t.colors.text,
        fontSize: scaleFont(14),
        fontWeight: "600"
      },
      detail: {
        color: t.colors.muted,
        flex: 1,
        fontSize: scaleFont(13),
        marginLeft: spacing.md,
        textAlign: "right"
      },
      muted: {
        color: t.colors.muted
      },
      addPhone: {
        gap: spacing.sm,
        marginTop: spacing.md
      },
      label: {
        color: t.colors.text,
        fontSize: scaleFont(13),
        fontWeight: "600"
      },
      success: {
        color: t.colors.primary,
        fontSize: scaleFont(13)
      },
      error: {
        color: t.colors.danger,
        fontSize: scaleFont(13)
      }
    })
  );