import { View, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  disabled?: boolean;
  identifier: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
};

export function IdentifierForm({ disabled, identifier, onChange, onSubmit }: Props) {
  const channel = identifier.includes("@") ? "email" : "phone";

  return (
    <View style={styles.stack}>
      <TextInput
        autoCapitalize="none"
        keyboardType={channel === "email" ? "email-address" : "phone-pad"}
        onChangeText={onChange}
        placeholder="Email or phone"
        value={identifier}
      />
      <Button disabled={disabled || identifier.trim().length < 3} label="Send code" onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm
  }
});
