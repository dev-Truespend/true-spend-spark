import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { TextInput } from "@/shared/components/TextInput";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

type Props = { onDetect: (query: string) => void };

export function DetectMerchantPanel({ onDetect }: Props) {
  const [value, setValue] = useState("");

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Detected merchant</Text>
      <Text style={styles.subtitle}>
        Search nearby places via Foursquare. The top result is sent to the recommendation API.
      </Text>
      <TextInput
        placeholder="e.g. Target, Whole Foods, Starbucks"
        value={value}
        onChangeText={setValue}
        autoCapitalize="words"
        returnKeyType="search"
        onSubmitEditing={() => onDetect(value)}
      />
      <Button label="Find merchant" onPress={() => onDetect(value)} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 }
});
