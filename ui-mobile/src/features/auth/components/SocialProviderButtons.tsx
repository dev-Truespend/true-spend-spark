import { View, StyleSheet } from "react-native";
import { Button } from "@/shared/components/Button";
import { spacing } from "@/shared/theme/spacing";

type Props = {
  disabled?: boolean;
  onApple: () => void;
  onGoogle: () => void;
};

export function SocialProviderButtons({ disabled, onApple, onGoogle }: Props) {
  return (
    <View style={styles.stack}>
      <Button disabled={disabled} label="Continue with Apple" onPress={onApple} />
      <Button disabled={disabled} label="Continue with Google" onPress={onGoogle} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm
  }
});
