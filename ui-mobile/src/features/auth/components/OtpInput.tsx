import { View, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { OtpInput as OtpCells } from "@/shared/components/OtpInput";

type Props = {
  disabled?: boolean;
  token: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
};

export function OtpInput({ disabled, token, onChange, onSubmit }: Props) {
  return (
    <View style={styles.stack}>
      <OtpCells value={token} onChange={onChange} />
      <Button disabled={disabled || token.length < 6} label="Verify" onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 }
});
