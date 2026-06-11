import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { useTheme } from "@/providers/ThemeProvider";

type Channel = "email" | "phone";

type Props = {
  channel: Channel;
  disabled?: boolean;
  identifier: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
};

export function IdentifierForm({ channel, disabled, identifier, onChange, onSubmit }: Props) {
  const { colors } = useTheme();
  const isPhone = channel === "phone";
  return (
    <View style={styles.stack}>
      <TextInput
        autoCapitalize="none"
        autoComplete={isPhone ? "tel" : "email"}
        keyboardType={isPhone ? "phone-pad" : "email-address"}
        onChangeText={onChange}
        placeholder={isPhone ? "+1 (415) 555 0100" : "you@example.com"}
        value={identifier}
        leftIcon={
          <Ionicons
            name={isPhone ? "call-outline" : "mail-outline"}
            size={18}
            color={colors.mutedFg}
          />
        }
      />
      <Button
        disabled={disabled || identifier.trim().length < 3}
        label="Send code"
        onPress={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 }
});
