import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  disabled?: boolean;
  onApple: () => void;
  onGoogle: () => void;
  onPhone?: () => void;
};

export function SocialProviderButtons({ disabled, onApple, onGoogle, onPhone }: Props) {
  return (
    <View style={styles.stack}>
      <Button
        disabled={disabled}
        label="Continue with Apple"
        onPress={onApple}
        variant="dark"
        leftIcon={<Ionicons name="logo-apple" size={18} color="#fff" />}
      />
      <Button
        disabled={disabled}
        label="Continue with Google"
        onPress={onGoogle}
        variant="light"
        leftIcon={<Text style={styles.googleG}>G</Text>}
      />
      {onPhone ? (
        <Button
          disabled={disabled}
          label="Continue with phone"
          onPress={onPhone}
          variant="outline"
          leftIcon={<Ionicons name="call-outline" size={16} color={colors.text} />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  googleG: {
    fontFamily: fontFamily.heavy,
    fontWeight: "800",
    fontSize: scaleFont(15),
    color: colors.text
  }
});
