import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg
  }
});
