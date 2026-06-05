import { View, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  disabled?: boolean;
  token: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
};

export function OtpInput({ disabled, token, onChange, onSubmit }: Props) {
  return (
    <View style={styles.stack}>
      <TextInput keyboardType="number-pad" onChangeText={onChange} placeholder="One-time code" value={token} />
      <Button disabled={disabled || token.length < 4} label="Verify" onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm
  }
});
